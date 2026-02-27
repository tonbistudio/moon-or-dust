/**
 * One-time SOAR game registration script for Tribes on Solana devnet.
 *
 * Registers the game, creates a Floor Price leaderboard, and registers achievements.
 * Outputs all addresses to packages/app/src/magicblock/soar-devnet.json.
 *
 * Usage: pnpm soar:register
 */

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { AnchorProvider, Wallet } from '@coral-xyz/anchor'
import { SoarProgram } from '@magicblock-labs/soar-sdk'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Achievements to register (must match ACHIEVEMENTS in soar.ts)
const ACHIEVEMENTS = [
  { id: 'first_wonder', title: 'First Wonder', description: 'Complete your first wonder' },
  { id: 'ten_kills', title: '10 Kills', description: 'Kill 10 enemy units in a single game' },
  { id: 'golden_age', title: 'Golden Age', description: 'Trigger a golden age' },
  { id: 'tech_leader', title: 'Tech Leader', description: 'Research 10 technologies' },
  { id: 'empire_builder', title: 'Empire Builder', description: 'Found 5 settlements' },
]

const DEVNET_RPC = 'https://api.devnet.solana.com'
const CONFIG_PATH = path.resolve(__dirname, '../src/magicblock/soar-devnet.json')

async function main(): Promise<void> {
  console.log('=== Tribes SOAR Registration (Devnet) ===\n')

  // Check for existing config
  const existingConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  if (existingConfig.gameAddress) {
    console.log('Existing registration found:')
    console.log('  Game:', existingConfig.gameAddress)
    console.log('  Leaderboard:', existingConfig.leaderboardAddress)
    console.log('')
    console.log('To re-register, clear soar-devnet.json first.')
    return
  }

  const connection = new Connection(DEVNET_RPC, 'confirmed')

  // Load or generate the game authority keypair (persisted for re-runs)
  const KEYPAIR_PATH = path.resolve(__dirname, '../src/magicblock/soar-authority.json')
  let authority: Keypair
  if (fs.existsSync(KEYPAIR_PATH)) {
    const raw = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'))
    authority = Keypair.fromSecretKey(Uint8Array.from(raw))
    console.log('Loaded existing authority:', authority.publicKey.toBase58())
  } else {
    authority = Keypair.generate()
    fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(authority.secretKey)))
    console.log('Generated new authority:', authority.publicKey.toBase58())
    console.log('  Saved to:', KEYPAIR_PATH)
  }

  // Check balance — need ~0.05 SOL for all registration txs
  const balance = await connection.getBalance(authority.publicKey)
  const balanceSOL = balance / LAMPORTS_PER_SOL
  console.log(`Balance: ${balanceSOL} SOL`)

  if (balanceSOL < 0.05) {
    // Try airdrop first
    console.log('Requesting airdrop...')
    let airdropSuccess = false
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const sig = await connection.requestAirdrop(authority.publicKey, LAMPORTS_PER_SOL)
        await connection.confirmTransaction(sig, 'confirmed')
        console.log(`Airdrop confirmed: 1 SOL (attempt ${attempt})\n`)
        airdropSuccess = true
        break
      } catch (err) {
        console.warn(`Airdrop attempt ${attempt} failed:`, err instanceof Error ? err.message : err)
        if (attempt < 3) {
          console.log('Retrying in 5 seconds...')
          await new Promise((r) => setTimeout(r, 5000))
        }
      }
    }
    if (!airdropSuccess) {
      console.error('\nAirdrop failed. Fund this address manually:')
      console.error('  https://faucet.solana.com')
      console.error('  Address:', authority.publicKey.toBase58())
      console.error('\nThen re-run: pnpm soar:register')
      process.exit(1)
    }
  } else {
    console.log('Sufficient balance, skipping airdrop.\n')
  }

  // Create Anchor provider with the authority wallet
  const wallet = new Wallet(authority)
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  })

  const soar = SoarProgram.get(provider)

  // Step 1: Register the game
  console.log('Registering game on SOAR...')
  const newGameKeypair = Keypair.generate()
  const gameResult = await soar.initializeNewGame(
    newGameKeypair.publicKey,
    'Tribes',                      // title
    '4X Strategy Game on Solana',  // description
    3,                             // Genre.Adventure = 3
    2,                             // GameType.Web = 2
    PublicKey.default,             // nftMeta (placeholder)
    [authority.publicKey],         // authorities
  )
  await soar.sendAndConfirmTransaction(gameResult.transaction, [newGameKeypair])
  const gameAddress = gameResult.newGame.toBase58()
  console.log('  Game registered:', gameAddress)

  // Step 2: Create the Floor Price leaderboard
  console.log('Creating Floor Price leaderboard...')
  const gameClient = await soar.newGameClient(gameResult.newGame)
  const lbResult = await gameClient.addLeaderBoard(
    authority.publicKey,
    'Floor Price',     // description
    PublicKey.default,  // nftMeta (placeholder)
    20,                 // scoresToRetain (top 20)
    false,              // scoresOrder: false = descending (highest wins)
  )
  await soar.sendAndConfirmTransaction(lbResult.transaction)
  const leaderboardAddress = lbResult.newLeaderBoard.toBase58()
  const topEntriesAddress = lbResult.topEntries?.toBase58() ?? ''
  console.log('  Leaderboard:', leaderboardAddress)
  console.log('  Top Entries:', topEntriesAddress)

  // Step 3: Register achievements
  console.log('Registering achievements...')
  const achievementAddresses: Record<string, string> = {}
  for (const achievement of ACHIEVEMENTS) {
    const achResult = await gameClient.addAchievement(
      authority.publicKey,
      achievement.title,
      achievement.description,
      PublicKey.default, // nftMeta (placeholder)
    )
    await soar.sendAndConfirmTransaction(achResult.transaction)
    achievementAddresses[achievement.id] = achResult.newAchievement.toBase58()
    console.log(`  ${achievement.title}: ${achResult.newAchievement.toBase58()}`)
  }

  // Step 4: Write config
  const config = {
    gameAddress,
    leaderboardAddress,
    topEntriesAddress,
    achievementAddresses,
    authoritySecretKey: Array.from(authority.secretKey),
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n')
  console.log(`\nConfig written to: ${CONFIG_PATH}`)
  console.log('\n=== Registration Complete ===')
  console.log('The app will now use on-chain SOAR when a wallet is connected.')
}

main().catch((err) => {
  console.error('Registration failed:', err)
  process.exit(1)
})
