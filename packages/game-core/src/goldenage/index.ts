// Golden Age system - triggers, effects, and state management

import type {
  GameState,
  GoldenAgeTrigger,
  GoldenAgeEffectType,
  GoldenAgeState,
  TribeId,
  TribeName,
  Player,
  Era,
} from '../types'
import { getPlayerSettlements } from '../settlements'
import { getPolicyGoldenAgeDuration } from '../cultures'

// =============================================================================
// Constants
// =============================================================================

const BASE_DURATION = 3
const TRIBAL_DURATION = 4

// =============================================================================
// Trigger Definitions
// =============================================================================

export interface GoldenAgeTriggerDefinition {
  readonly id: GoldenAgeTrigger
  readonly name: string
  readonly description: string
  readonly duration: number
  readonly tribe?: TribeName // Only for tribal triggers
}

export const UNIVERSAL_TRIGGERS: GoldenAgeTriggerDefinition[] = [
  {
    id: 'research_3_techs_in_5_turns',
    name: 'Rapid Innovation',
    description: 'Research 3 techs in 5 turns',
    duration: BASE_DURATION,
  },
  {
    id: 'capture_capital',
    name: 'Capital Conquest',
    description: 'Capture an enemy capital',
    duration: BASE_DURATION,
  },
  {
    id: 'found_4th_settlement',
    name: 'Expansion',
    description: 'Found 4th settlement',
    duration: BASE_DURATION,
  },
  {
    id: 'reach_20_population',
    name: 'Settlement Growth',
    description: 'Reach 10 total settlement levels',
    duration: BASE_DURATION,
  },
  {
    id: 'build_2_wonders',
    name: 'Wonder Builder',
    description: 'Build 2 wonders',
    duration: BASE_DURATION,
  },
  {
    id: 'earn_3_great_people',
    name: 'Great Era',
    description: 'Earn 3 great people',
    duration: BASE_DURATION,
  },
  {
    id: 'reach_6_trade_routes_first',
    name: 'Trade Empire',
    description: 'Reach 6 trade routes first',
    duration: BASE_DURATION,
  },
]

export const TRIBAL_TRIGGERS: GoldenAgeTriggerDefinition[] = [
  {
    id: 'monkes_500_gold',
    name: 'Banana Hoard',
    description: 'Accumulate 500 gold treasury',
    duration: TRIBAL_DURATION,
    tribe: 'monkes',
  },
  {
    id: 'geckos_era3_tech_first',
    name: 'Tech Pioneers',
    description: 'Research Era 3 tech first',
    duration: TRIBAL_DURATION,
    tribe: 'geckos',
  },
  {
    id: 'degods_10_kills',
    name: 'Warmonger',
    description: 'Kill 10 enemy units',
    duration: TRIBAL_DURATION,
    tribe: 'degods',
  },
  {
    id: 'cets_era3_culture_first',
    name: 'Cultural Vanguard',
    description: 'Complete Era 3 culture first',
    duration: TRIBAL_DURATION,
    tribe: 'cets',
  },
]

export const ALL_TRIGGERS: GoldenAgeTriggerDefinition[] = [
  ...UNIVERSAL_TRIGGERS,
  ...TRIBAL_TRIGGERS,
]

export const TRIGGER_MAP: Map<GoldenAgeTrigger, GoldenAgeTriggerDefinition> = new Map(
  ALL_TRIGGERS.map((t) => [t.id, t])
)

// =============================================================================
// Effect Definitions
// =============================================================================

export interface GoldenAgeEffectDefinition {
  readonly id: GoldenAgeEffectType
  readonly name: string
  readonly description: string
  readonly era: Era
}

export const ERA_1_EFFECTS: GoldenAgeEffectDefinition[] = [
  { id: 'combat_strength_25', name: 'Military Might', description: '+25% combat strength', era: 1 },
  { id: 'mobility_1', name: 'Swift Movement', description: '+1 mobility all units', era: 1 },
  { id: 'alpha_20', name: 'Research Surge', description: '+20% Alpha yield', era: 1 },
  { id: 'vibes_20', name: 'Cultural Flourish', description: '+20% Vibes yield', era: 1 },
  { id: 'production_20', name: 'Industrial Boom', description: '+20% Production', era: 1 },
  { id: 'gold_20', name: 'Economic Growth', description: '+20% Gold income', era: 1 },
]

export const ERA_2_EFFECTS: GoldenAgeEffectDefinition[] = [
  { id: 'defense_33', name: 'Fortified Defense', description: '+33% defense', era: 2 },
  { id: 'combat_strength_flat_2', name: 'Elite Warriors', description: '+2 combat strength all units', era: 2 },
  { id: 'alpha_30', name: 'Knowledge Explosion', description: '+30% Alpha yield', era: 2 },
  { id: 'vibes_30', name: 'Renaissance', description: '+30% Vibes yield', era: 2 },
  { id: 'production_30', name: 'Manufacturing Age', description: '+30% Production', era: 2 },
  { id: 'gold_30', name: 'Trade Boom', description: '+30% Gold income', era: 2 },
]

export const ERA_3_EFFECTS: GoldenAgeEffectDefinition[] = [
  { id: 'combat_defense_20', name: 'Military Dominance', description: '+20% combat strength and +20% defense', era: 3 },
  { id: 'alpha_40', name: 'Scientific Revolution', description: '+40% Alpha yield', era: 3 },
  { id: 'vibes_40', name: 'Cultural Apex', description: '+40% Vibes yield', era: 3 },
  { id: 'production_40', name: 'Industrial Revolution', description: '+40% Production', era: 3 },
  { id: 'gold_40', name: 'Golden Economy', description: '+40% Gold income', era: 3 },
]

export const EFFECTS_BY_ERA: Record<Era, GoldenAgeEffectDefinition[]> = {
  1: ERA_1_EFFECTS,
  2: ERA_2_EFFECTS,
  3: ERA_3_EFFECTS,
}

// =============================================================================
// Initial State
// =============================================================================

export function getInitialGoldenAgeState(): GoldenAgeState {
  return {
    active: false,
    turnsRemaining: 0,
    triggersUsed: [],
    recentTechTurns: [],
  }
}

// =============================================================================
// Trigger Checking
// =============================================================================

/**
 * Gets the current era based on the most advanced tech/culture
 * Internal helper for golden age effect selection
 */
function getPlayerEra(state: GameState, tribeId: TribeId): Era {
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (!player) return 1

  // Check researched techs for era
  let maxEra: Era = 1
  for (const techId of player.researchedTechs) {
    // Simple heuristic: era 3 techs have cost >= 100
    // This should ideally look up the tech definition
    if (techId.includes('ai') || techId.includes('ponzinomics') || techId.includes('ohm')) {
      maxEra = 3
    } else if (techId.includes('iron') || techId.includes('discord') || techId.includes('defi')) {
      if (maxEra < 2) maxEra = 2
    }
  }

  return maxEra
}

/**
 * Checks if a specific trigger condition is met
 */
export function checkTrigger(
  state: GameState,
  tribeId: TribeId,
  triggerId: GoldenAgeTrigger
): boolean {
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (!player) return false

  // Already used this trigger
  if (player.goldenAge.triggersUsed.includes(triggerId)) return false

  // Currently in golden age - can't trigger another
  if (player.goldenAge.active) return false

  const trigger = TRIGGER_MAP.get(triggerId)
  if (!trigger) return false

  // Check tribal trigger ownership
  if (trigger.tribe && trigger.tribe !== tribeId) return false

  switch (triggerId) {
    case 'research_3_techs_in_5_turns':
      return player.goldenAge.recentTechTurns.length >= 3

    case 'capture_capital':
      // This would need to be tracked when capturing - checked externally
      return false

    case 'found_4th_settlement': {
      const settlements = getPlayerSettlements(state, tribeId)
      return settlements.length >= 4
    }

    case 'reach_20_population': {
      const settlements = getPlayerSettlements(state, tribeId)
      const totalLevels = settlements.reduce((sum, s) => sum + s.level, 0)
      return totalLevels >= 10
    }

    case 'build_2_wonders':
      return player.greatPeople.accumulator.wondersBuilt >= 2

    case 'earn_3_great_people':
      return player.greatPeople.earned.length >= 3

    case 'reach_6_trade_routes_first':
      return checkFirstToReachTradeRoutes(state, tribeId, 6)

    case 'monkes_500_gold':
      return player.treasury >= 500

    case 'geckos_era3_tech_first':
      return checkFirstToReachEra3Tech(state, tribeId)

    case 'degods_10_kills':
      return player.killCount >= 10

    case 'cets_era3_culture_first':
      return checkFirstToReachEra3Culture(state, tribeId)

    default:
      return false
  }
}

/**
 * Checks if this tribe was first to reach N trade routes
 */
function checkFirstToReachTradeRoutes(
  state: GameState,
  tribeId: TribeId,
  count: number
): boolean {
  // Count active routes for this player
  const playerRoutes = state.tradeRoutes.filter((r) => {
    const origin = state.settlements.get(r.origin)
    return origin && origin.owner === tribeId && r.active
  }).length

  if (playerRoutes < count) return false

  // Check if any other player already claimed this
  for (const player of state.players) {
    if (player.tribeId === tribeId) continue
    if (player.goldenAge.triggersUsed.includes('reach_6_trade_routes_first')) {
      return false
    }
  }

  return true
}

/**
 * Checks if this tribe was first to research an Era 3 tech
 */
function checkFirstToReachEra3Tech(state: GameState, tribeId: TribeId): boolean {
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (!player) return false

  // Check if player has any era 3 tech
  const era3Techs = ['artificial_intelligence', 'ponzinomics', 'hacking', 'tokenomics',
                     'hardware_wallets', 'siege_weapons', 'wolf_game', 'liquidity_pools',
                     'firedancer', 'ohm']
  const hasEra3 = player.researchedTechs.some((t) => era3Techs.includes(t as string))
  if (!hasEra3) return false

  // Check if any other player already claimed this
  for (const p of state.players) {
    if (p.tribeId === tribeId) continue
    if (p.goldenAge.triggersUsed.includes('geckos_era3_tech_first')) {
      return false
    }
  }

  return true
}

/**
 * Checks if this tribe was first to complete an Era 3 culture
 */
function checkFirstToReachEra3Culture(state: GameState, tribeId: TribeId): boolean {
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (!player) return false

  // Check if player has any era 3 culture
  const era3Cultures = ['raiding', 'innovation', 'hard_shilling', 'one_of_ones',
                        'auctions', 'presales', 'trenching', 'delisting',
                        'sweeping', 'rugging']
  const hasEra3 = player.unlockedCultures.some((c) => era3Cultures.includes(c as string))
  if (!hasEra3) return false

  // Check if any other player already claimed this
  for (const p of state.players) {
    if (p.tribeId === tribeId) continue
    if (p.goldenAge.triggersUsed.includes('cets_era3_culture_first')) {
      return false
    }
  }

  return true
}

/**
 * Checks all triggers for a player and returns any that are now met
 */
export function checkAllTriggers(
  state: GameState,
  tribeId: TribeId
): GoldenAgeTrigger[] {
  const metTriggers: GoldenAgeTrigger[] = []

  for (const trigger of ALL_TRIGGERS) {
    if (checkTrigger(state, tribeId, trigger.id)) {
      metTriggers.push(trigger.id)
    }
  }

  return metTriggers
}

// =============================================================================
// Effect Selection
// =============================================================================

/**
 * Randomly selects a golden age effect based on current era
 */
export function selectRandomEffect(
  era: Era,
  rng: () => number
): GoldenAgeEffectType {
  const effects = EFFECTS_BY_ERA[era]
  const index = Math.floor(rng() * effects.length)
  return effects[index]!.id
}

// =============================================================================
// Golden Age Activation
// =============================================================================

/**
 * Activates a golden age for a player
 */
export function activateGoldenAge(
  state: GameState,
  tribeId: TribeId,
  triggerId: GoldenAgeTrigger,
  rng: () => number
): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  const trigger = TRIGGER_MAP.get(triggerId)
  if (!trigger) return state

  // Already in golden age or trigger already used
  if (player.goldenAge.active) return state
  if (player.goldenAge.triggersUsed.includes(triggerId)) return state

  // Get current era and select random effect
  const era = getPlayerEra(state, tribeId)
  const effect = selectRandomEffect(era, rng)

  // Check for policy duration override (e.g., Retweet Bonanza: 4 turns instead of 3)
  const policyDuration = getPolicyGoldenAgeDuration(player)
  const duration = policyDuration ?? trigger.duration

  const updatedGoldenAge: GoldenAgeState = {
    ...player.goldenAge,
    active: true,
    turnsRemaining: duration,
    currentEffect: effect,
    currentTrigger: triggerId,
    triggersUsed: [...player.goldenAge.triggersUsed, triggerId],
  }

  const updatedPlayer: Player = {
    ...player,
    goldenAge: updatedGoldenAge,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

// =============================================================================
// Tech Tracking for "3 techs in 5 turns" trigger
// =============================================================================

/**
 * Records a tech being researched for the "3 techs in 5 turns" trigger
 */
export function recordTechResearched(
  state: GameState,
  tribeId: TribeId,
  currentTurn: number
): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!

  // Add current turn to recent techs, filter out turns older than 5 turns ago
  const cutoffTurn = currentTurn - 5
  const recentTechs = [...player.goldenAge.recentTechTurns, currentTurn]
    .filter((turn) => turn > cutoffTurn)

  const updatedGoldenAge: GoldenAgeState = {
    ...player.goldenAge,
    recentTechTurns: recentTechs,
  }

  const updatedPlayer: Player = {
    ...player,
    goldenAge: updatedGoldenAge,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

/**
 * Cleans up old tech records (call at start of turn)
 */
export function cleanupRecentTechs(
  state: GameState,
  tribeId: TribeId,
  currentTurn: number
): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  const cutoffTurn = currentTurn - 5
  const recentTechs = player.goldenAge.recentTechTurns.filter((turn) => turn > cutoffTurn)

  // Only update if changed
  if (recentTechs.length === player.goldenAge.recentTechTurns.length) {
    return state
  }

  const updatedGoldenAge: GoldenAgeState = {
    ...player.goldenAge,
    recentTechTurns: recentTechs,
  }

  const updatedPlayer: Player = {
    ...player,
    goldenAge: updatedGoldenAge,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

// =============================================================================
// Golden Age Processing
// =============================================================================

/**
 * Decrements golden age turns remaining (call at end of turn)
 */
export function processGoldenAgeTurn(state: GameState, tribeId: TribeId): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!

  if (!player.goldenAge.active) return state

  const newTurnsRemaining = player.goldenAge.turnsRemaining - 1
  const stillActive = newTurnsRemaining > 0

  // Build new golden age state, only including currentEffect/currentTrigger if still active
  let updatedGoldenAge: GoldenAgeState = {
    active: stillActive,
    turnsRemaining: newTurnsRemaining,
    triggersUsed: player.goldenAge.triggersUsed,
    recentTechTurns: player.goldenAge.recentTechTurns,
  }

  // Preserve currentEffect and currentTrigger only if still active and they exist
  if (stillActive) {
    if (player.goldenAge.currentEffect) {
      updatedGoldenAge = { ...updatedGoldenAge, currentEffect: player.goldenAge.currentEffect }
    }
    if (player.goldenAge.currentTrigger) {
      updatedGoldenAge = { ...updatedGoldenAge, currentTrigger: player.goldenAge.currentTrigger }
    }
  }

  const updatedPlayer: Player = {
    ...player,
    goldenAge: updatedGoldenAge,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

// =============================================================================
// Effect Queries
// =============================================================================

/**
 * Gets the current golden age effect bonus for yields
 */
export function getGoldenAgeYieldBonus(
  player: Player,
  yieldType: 'alpha' | 'vibes' | 'production' | 'gold'
): number {
  if (!player.goldenAge.active || !player.goldenAge.currentEffect) return 0

  const effect = player.goldenAge.currentEffect

  switch (yieldType) {
    case 'alpha':
      if (effect === 'alpha_20') return 0.20
      if (effect === 'alpha_30') return 0.30
      if (effect === 'alpha_40') return 0.40
      return 0

    case 'vibes':
      if (effect === 'vibes_20') return 0.20
      if (effect === 'vibes_30') return 0.30
      if (effect === 'vibes_40') return 0.40
      return 0

    case 'production':
      if (effect === 'production_20') return 0.20
      if (effect === 'production_30') return 0.30
      if (effect === 'production_40') return 0.40
      return 0

    case 'gold':
      if (effect === 'gold_20') return 0.20
      if (effect === 'gold_30') return 0.30
      if (effect === 'gold_40') return 0.40
      return 0

    default:
      return 0
  }
}

/**
 * Gets the current golden age combat bonus
 */
export function getGoldenAgeCombatBonus(
  player: Player,
  isDefending: boolean
): { percent: number; flat: number } {
  if (!player.goldenAge.active || !player.goldenAge.currentEffect) {
    return { percent: 0, flat: 0 }
  }

  const effect = player.goldenAge.currentEffect

  switch (effect) {
    case 'combat_strength_25':
      return { percent: isDefending ? 0 : 0.25, flat: 0 }

    case 'defense_33':
      return { percent: isDefending ? 0.33 : 0, flat: 0 }

    case 'combat_strength_flat_2':
      return { percent: 0, flat: 2 }

    case 'combat_defense_20':
      return { percent: 0.20, flat: 0 }

    default:
      return { percent: 0, flat: 0 }
  }
}

/**
 * Gets the current golden age mobility bonus
 */
export function getGoldenAgeMobilityBonus(player: Player): number {
  if (!player.goldenAge.active || !player.goldenAge.currentEffect) return 0

  if (player.goldenAge.currentEffect === 'mobility_1') return 1

  return 0
}

/**
 * Gets the effect definition for display
 */
export function getEffectDefinition(effectType: GoldenAgeEffectType): GoldenAgeEffectDefinition | undefined {
  for (const effects of Object.values(EFFECTS_BY_ERA)) {
    const found = effects.find((e) => e.id === effectType)
    if (found) return found
  }
  return undefined
}

/**
 * Gets the trigger definition
 */
export function getTriggerDefinition(triggerId: GoldenAgeTrigger): GoldenAgeTriggerDefinition | undefined {
  return TRIGGER_MAP.get(triggerId)
}
