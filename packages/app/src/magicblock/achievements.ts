// Achievement tracking and SOAR submission
// Checks game state transitions for achievement conditions

import type { GameState, TribeId } from '@tribes/game-core'
import { ACHIEVEMENTS } from './soar'

// ---------------------------------------------------------------------------
// Achievement condition checkers
// ---------------------------------------------------------------------------

type AchievementChecker = (state: GameState, tribeId: TribeId) => boolean

const ACHIEVEMENT_CHECKERS: Record<string, AchievementChecker> = {
  first_wonder: (state, tribeId) => {
    return state.wonders.some(w => w.builtBy === tribeId)
  },

  ten_kills: (_state, _tribeId) => {
    const player = _state.players.find(p => p.tribeId === _tribeId)
    return (player?.killCount ?? 0) >= 10
  },

  golden_age: (_state, _tribeId) => {
    const player = _state.players.find(p => p.tribeId === _tribeId)
    return (player?.goldenAge.triggersUsed.length ?? 0) > 0
  },

  tech_leader: (_state, _tribeId) => {
    const player = _state.players.find(p => p.tribeId === _tribeId)
    return (player?.researchedTechs.length ?? 0) >= 10
  },

  empire_builder: (state, tribeId) => {
    let count = 0
    for (const settlement of state.settlements.values()) {
      if (settlement.owner === tribeId) count++
    }
    return count >= 5
  },
}

// ---------------------------------------------------------------------------
// Achievement tracker (per-session, avoids re-submitting)
// ---------------------------------------------------------------------------

export class AchievementTracker {
  private unlocked = new Set<string>()

  /** Check all achievements against current state. Returns newly unlocked achievement IDs. */
  checkAchievements(state: GameState, tribeId: TribeId): string[] {
    const newlyUnlocked: string[] = []

    for (const achievement of ACHIEVEMENTS) {
      // Skip already-unlocked achievements this session
      if (this.unlocked.has(achievement.id)) continue

      const checker = ACHIEVEMENT_CHECKERS[achievement.id]
      if (checker && checker(state, tribeId)) {
        this.unlocked.add(achievement.id)
        newlyUnlocked.push(achievement.id)

        // Submit to SOAR (fire-and-forget)
        console.log(`[Achievement] Unlocked: ${achievement.title}`)
        // TODO: Submit to SOAR after game registration
        // this.soarService.submitAchievement(achievement.id)
      }
    }

    return newlyUnlocked
  }

  /** Get all unlocked achievement IDs this session */
  getUnlocked(): string[] {
    return Array.from(this.unlocked)
  }

  /** Reset tracker (for new game) */
  reset(): void {
    this.unlocked.clear()
  }
}
