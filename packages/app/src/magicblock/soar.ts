// SOAR leaderboard and achievement integration
// Uses @magicblock-labs/soar-sdk for on-chain rankings

import { PublicKey } from '@solana/web3.js'
import { AnchorProvider } from '@coral-xyz/anchor'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Game registered on SOAR (devnet) — set after one-time registration
// Run `pnpm soar:register` to create and store this address
export const SOAR_GAME_ADDRESS: PublicKey | null = null

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
// SOAR Service
// ---------------------------------------------------------------------------

export interface SOARService {
  /** Submit a Floor Price score to the leaderboard */
  submitScore(floorPrice: number): Promise<string | null>
  /** Fetch the global leaderboard */
  getLeaderboard(limit?: number): Promise<LeaderboardEntry[]>
  /** Whether SOAR is available (wallet connected + game registered) */
  isAvailable(): boolean
}

// ---------------------------------------------------------------------------
// On-chain SOAR service (when wallet connected and game registered)
// ---------------------------------------------------------------------------

export class OnChainSOARService implements SOARService {
  private provider: AnchorProvider

  constructor(provider: AnchorProvider) {
    this.provider = provider
  }

  isAvailable(): boolean {
    return !!SOAR_GAME_ADDRESS && !!this.provider.publicKey
  }

  async submitScore(floorPrice: number): Promise<string | null> {
    if (!this.isAvailable()) return null

    try {
      // For now, log intent — actual submission requires game + leaderboard addresses
      // which are set up during the one-time registration step
      console.log('[SOAR] Would submit score:', floorPrice, 'from', this.provider.publicKey?.toBase58())

      // TODO: Implement after game registration
      // const playerAddress = soar.derivePlayerAddress(this.provider.publicKey!)
      // const tx = await soar.submitScoreToLeaderboard({
      //   player: playerAddress,
      //   authWallet: this.provider.publicKey!,
      //   leaderboard: SOAR_LEADERBOARD_ADDRESS,
      //   score: new BN(floorPrice),
      // })
      // return await this.provider.sendAndConfirm(tx)

      return null
    } catch (err) {
      console.error('[SOAR] Score submission failed:', err)
      return null
    }
  }

  async getLeaderboard(_limit = 10): Promise<LeaderboardEntry[]> {
    if (!this.isAvailable()) return []

    try {
      // TODO: Fetch from SOAR after game registration
      // const { SoarProgram } = await import('@magicblock-labs/soar-sdk')
      // const soar = SoarProgram.get(this.provider)
      // const leaderboardAccount = await soar.fetchLeaderBoardAccount(SOAR_LEADERBOARD_ADDRESS)
      // return leaderboardAccount.entries.slice(0, _limit).map((entry, i) => ({...}))

      return []
    } catch (err) {
      console.error('[SOAR] Leaderboard fetch failed:', err)
      return []
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

export function createSOARService(provider?: AnchorProvider | null): SOARService {
  if (provider?.publicKey && SOAR_GAME_ADDRESS) {
    return new OnChainSOARService(provider)
  }
  return new LocalSOARService()
}
