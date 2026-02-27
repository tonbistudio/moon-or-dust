// SOAR leaderboard and achievement integration
// Uses @magicblock-labs/soar-sdk for on-chain rankings

import { Keypair, PublicKey } from '@solana/web3.js'
import { AnchorProvider, BN } from '@coral-xyz/anchor'
import { SoarProgram } from '@magicblock-labs/soar-sdk'

// Devnet config — populated by `pnpm soar:register`
import soarConfig from './soar-devnet.json'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number
  player: string // base58 pubkey (truncated for display)
  playerFull: string // full base58 pubkey
  score: number
}

export interface AchievementDef {
  id: string
  title: string
  description: string
}

// ---------------------------------------------------------------------------
// Predefined achievements
// ---------------------------------------------------------------------------

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_wonder', title: 'First Wonder', description: 'Complete your first wonder' },
  { id: 'ten_kills', title: '10 Kills', description: 'Kill 10 enemy units in a single game' },
  { id: 'golden_age', title: 'Golden Age', description: 'Trigger a golden age' },
  { id: 'tech_leader', title: 'Tech Leader', description: 'Research 10 technologies' },
  { id: 'empire_builder', title: 'Empire Builder', description: 'Found 5 settlements' },
]

// ---------------------------------------------------------------------------
// SOAR Service interface
// ---------------------------------------------------------------------------

export interface SOARService {
  /** Submit a Floor Price score to the leaderboard */
  submitScore(floorPrice: number): Promise<string | null>
  /** Fetch the global leaderboard */
  getLeaderboard(limit?: number): Promise<LeaderboardEntry[]>
  /** Unlock an achievement on-chain */
  unlockAchievement(achievementId: string): Promise<string | null>
  /** Whether SOAR is available (wallet connected + game registered) */
  isAvailable(): boolean
}

// ---------------------------------------------------------------------------
// On-chain SOAR service (wallet connected + game registered on devnet)
// ---------------------------------------------------------------------------

export class OnChainSOARService implements SOARService {
  private provider: AnchorProvider
  private soar: SoarProgram
  private authority: Keypair
  private leaderboardAddress: PublicKey
  private topEntriesAddress: PublicKey

  constructor(provider: AnchorProvider) {
    this.provider = provider
    this.soar = SoarProgram.get(provider)
    this.authority = Keypair.fromSecretKey(Uint8Array.from(soarConfig.authoritySecretKey))
    this.leaderboardAddress = new PublicKey(soarConfig.leaderboardAddress)
    this.topEntriesAddress = new PublicKey(soarConfig.topEntriesAddress)
  }

  isAvailable(): boolean {
    return !!soarConfig.gameAddress && !!this.provider.publicKey
  }

  async submitScore(floorPrice: number): Promise<string | null> {
    if (!this.isAvailable()) return null
    const wallet = this.provider.publicKey!

    try {
      // Step 1: Register player on leaderboard (idempotent — catches "already initialized")
      try {
        const regResult = await this.soar.registerPlayerEntryForLeaderBoard(
          wallet,
          this.leaderboardAddress,
        )
        await this.soar.sendAndConfirmTransaction(regResult.transaction)
        console.log('[SOAR] Player registered on leaderboard')
      } catch (err: unknown) {
        // "already initialized" is expected if player already registered
        const msg = err instanceof Error ? err.message : String(err)
        if (!msg.includes('already in use') && !msg.includes('already initialized')) {
          console.warn('[SOAR] Player registration warning:', msg)
        }
      }

      // Step 2: Submit score with authority co-signer
      const scoreResult = await this.soar.submitScoreToLeaderBoard(
        wallet,
        this.authority.publicKey,
        this.leaderboardAddress,
        new BN(floorPrice),
      )
      const txSig = await this.soar.sendAndConfirmTransaction(
        scoreResult.transaction,
        [this.authority],
      )
      console.log('[SOAR] Score submitted:', floorPrice, 'tx:', txSig)
      return txSig
    } catch (err) {
      console.error('[SOAR] Score submission failed:', err)
      return null
    }
  }

  async getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    if (!this.isAvailable()) return []

    try {
      const topEntries = await this.soar.fetchLeaderBoardTopEntriesAccount(
        this.topEntriesAddress,
      )

      return topEntries.topScores
        .filter((s) => s.entry.score.toNumber() > 0)
        .slice(0, limit)
        .map((s, i) => {
          const full = s.player.toBase58()
          return {
            rank: i + 1,
            player: full.slice(0, 4) + '..' + full.slice(-4),
            playerFull: full,
            score: s.entry.score.toNumber(),
          }
        })
    } catch (err) {
      console.error('[SOAR] Leaderboard fetch failed:', err)
      return []
    }
  }

  async unlockAchievement(achievementId: string): Promise<string | null> {
    if (!this.isAvailable()) return null
    const wallet = this.provider.publicKey!

    const achievementAddr = (soarConfig.achievementAddresses as Record<string, string>)[achievementId]
    if (!achievementAddr) {
      console.warn('[SOAR] Unknown achievement:', achievementId)
      return null
    }

    try {
      const result = await this.soar.unlockPlayerAchievement(
        wallet,
        this.authority.publicKey,
        new PublicKey(achievementAddr),
        this.leaderboardAddress,
      )
      const txSig = await this.soar.sendAndConfirmTransaction(
        result.transaction,
        [this.authority],
      )
      console.log('[SOAR] Achievement unlocked:', achievementId, 'tx:', txSig)
      return txSig
    } catch (err) {
      console.error('[SOAR] Achievement unlock failed:', achievementId, err)
      return null
    }
  }
}

// ---------------------------------------------------------------------------
// Local fallback (no wallet / SOAR not registered)
// ---------------------------------------------------------------------------

const LOCAL_STORAGE_KEY = 'tribes_leaderboard'

interface LocalScore {
  player: string
  score: number
  timestamp: number
}

export class LocalSOARService implements SOARService {
  private results = new Map<string, boolean>()

  isAvailable(): boolean {
    return true // Always available as local fallback
  }

  async submitScore(floorPrice: number): Promise<string | null> {
    try {
      const scores = this.loadScores()
      scores.push({
        player: 'You',
        score: floorPrice,
        timestamp: Date.now(),
      })
      // Keep top 20, sorted descending
      scores.sort((a, b) => b.score - a.score)
      scores.splice(20)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scores))
      return 'local'
    } catch {
      return null
    }
  }

  async getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    const scores = this.loadScores()
    return scores.slice(0, limit).map((s, i) => ({
      rank: i + 1,
      player: s.player.slice(0, 8),
      playerFull: s.player,
      score: s.score,
    }))
  }

  async unlockAchievement(achievementId: string): Promise<string | null> {
    this.results.set(achievementId, true)
    console.log('[SOAR-Local] Achievement unlocked:', achievementId)
    return null
  }

  private loadScores(): LocalScore[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw) as LocalScore[]
    } catch {
      return []
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Returns an on-chain SOAR service when wallet connected + game registered, local fallback otherwise. */
export function createSOARService(provider?: AnchorProvider | null): SOARService {
  if (provider?.publicKey && soarConfig.gameAddress) {
    return new OnChainSOARService(provider)
  }
  return new LocalSOARService()
}
