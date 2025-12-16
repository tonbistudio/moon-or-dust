// Settlement milestone system - level-up rewards and choices

import type {
  GameState,
  Settlement,
  MilestoneChoice,
  TribeId,
} from '../types'
import { hexRange, hexKey } from '../hex'
import { createUnit } from '../units'
import { updateSettlement } from '../settlements'

// =============================================================================
// Milestone Definitions
// =============================================================================

export interface MilestoneReward {
  readonly level: number
  readonly optionA: MilestoneOption
  readonly optionB: MilestoneOption
}

export interface MilestoneOption {
  readonly name: string
  readonly description: string
  readonly effect: MilestoneEffect
}

export type MilestoneEffect =
  | { type: 'gold_per_turn'; amount: number }
  | { type: 'instant_gold'; amount: number }
  | { type: 'free_unit'; unitType: string }
  | { type: 'border_expansion'; radius: number }
  | { type: 'population_boom'; amount: number }
  | { type: 'culture_boost'; amount: number }
  | { type: 'unique_unit' }
  | { type: 'floor_price_bonus'; amount: number }
  | { type: 'production_bonus'; percent: number }
  | { type: 'growth_bonus'; percent: number }

export const MILESTONE_REWARDS: MilestoneReward[] = [
  {
    level: 2,
    optionA: {
      name: 'Workshop',
      description: '+1 Gold per turn from this settlement',
      effect: { type: 'gold_per_turn', amount: 1 },
    },
    optionB: {
      name: 'Free Scout',
      description: 'Receive a free Scout unit',
      effect: { type: 'free_unit', unitType: 'scout' },
    },
  },
  {
    level: 3,
    optionA: {
      name: 'Bonus Gold',
      description: 'Receive 10 Gold immediately',
      effect: { type: 'instant_gold', amount: 10 },
    },
    optionB: {
      name: 'Border Expansion',
      description: 'Expand settlement borders by 1 tile radius',
      effect: { type: 'border_expansion', radius: 1 },
    },
  },
  {
    level: 4,
    optionA: {
      name: 'Population Boom',
      description: '+3 Population to this settlement',
      effect: { type: 'population_boom', amount: 3 },
    },
    optionB: {
      name: 'Culture Push',
      description: 'Gain 5 Culture immediately',
      effect: { type: 'culture_boost', amount: 5 },
    },
  },
  {
    level: 5,
    optionA: {
      name: 'Tribal Champion',
      description: 'Receive your tribe\'s unique unit',
      effect: { type: 'unique_unit' },
    },
    optionB: {
      name: 'Grand Monument',
      description: '+20 Floor Price permanently',
      effect: { type: 'floor_price_bonus', amount: 20 },
    },
  },
  // Repeating level 5+ milestone for further growth
  {
    level: 6,
    optionA: {
      name: 'Production Focus',
      description: '+15% Production in this settlement',
      effect: { type: 'production_bonus', percent: 15 },
    },
    optionB: {
      name: 'Growth Focus',
      description: '+15% Growth in this settlement',
      effect: { type: 'growth_bonus', percent: 15 },
    },
  },
]

// =============================================================================
// Milestone Queries
// =============================================================================

/**
 * Gets the milestone reward options for a level
 */
export function getMilestoneForLevel(level: number): MilestoneReward | null {
  const milestone = MILESTONE_REWARDS.find((m) => m.level === level)
  if (milestone) return milestone

  // For levels beyond defined, cycle through level 5-6 options
  if (level > 6) {
    const index = (level - 5) % 2
    return MILESTONE_REWARDS[4 + index] || null
  }

  return null
}

/**
 * Checks if a settlement has pending milestone choice
 */
export function hasPendingMilestone(settlement: Settlement): boolean {
  // Check if current level has no choice recorded
  const currentLevel = settlement.level
  const hasChoice = settlement.milestonesChosen.some((m) => m.level === currentLevel)
  return currentLevel >= 2 && !hasChoice
}

/**
 * Gets list of pending milestones for a settlement
 */
export function getPendingMilestones(settlement: Settlement): number[] {
  const pending: number[] = []

  for (let level = 2; level <= settlement.level; level++) {
    const hasChoice = settlement.milestonesChosen.some((m) => m.level === level)
    if (!hasChoice) {
      pending.push(level)
    }
  }

  return pending
}

// =============================================================================
// Milestone Selection
// =============================================================================

/**
 * Selects a milestone choice for a settlement
 * Returns updated state with the effect applied
 */
export function selectMilestone(
  state: GameState,
  settlementId: string,
  level: number,
  choice: 'a' | 'b'
): GameState | null {
  const settlement = state.settlements.get(settlementId as never)
  if (!settlement) return null

  // Verify level is valid
  if (level > settlement.level || level < 2) return null

  // Verify not already chosen
  const alreadyChosen = settlement.milestonesChosen.some((m) => m.level === level)
  if (alreadyChosen) return null

  // Get the milestone
  const milestone = getMilestoneForLevel(level)
  if (!milestone) return null

  const option = choice === 'a' ? milestone.optionA : milestone.optionB

  // Record the choice
  const newMilestone: MilestoneChoice = { level, choice }
  let updatedSettlement: Settlement = {
    ...settlement,
    milestonesChosen: [...settlement.milestonesChosen, newMilestone],
  }

  // Apply the effect
  let newState = updateSettlement(state, updatedSettlement)
  newState = applyMilestoneEffect(newState, updatedSettlement, option.effect)

  return newState
}

/**
 * Applies a milestone effect to the game state
 */
function applyMilestoneEffect(
  state: GameState,
  settlement: Settlement,
  effect: MilestoneEffect
): GameState {
  switch (effect.type) {
    case 'gold_per_turn':
      // This would be tracked on settlement and applied during turn processing
      // For now, we'll add it as a building-like bonus
      return state

    case 'instant_gold':
      return addGoldToPlayer(state, settlement.owner, effect.amount)

    case 'free_unit':
      return spawnFreeUnit(state, settlement, effect.unitType)

    case 'border_expansion':
      return expandBorders(state, settlement, effect.radius)

    case 'population_boom':
      return addPopulation(state, settlement.id as never, effect.amount)

    case 'culture_boost':
      return addCultureToPlayer(state, settlement.owner, effect.amount)

    case 'unique_unit':
      return spawnUniqueUnit(state, settlement)

    case 'floor_price_bonus':
      return addFloorPriceBonus(state, settlement.owner, effect.amount)

    case 'production_bonus':
    case 'growth_bonus':
      // These would be tracked as settlement modifiers
      // For now, just return state unchanged
      return state
  }
}

// =============================================================================
// Effect Implementations
// =============================================================================

function addGoldToPlayer(
  state: GameState,
  tribeId: TribeId,
  amount: number
): GameState {
  const newPlayers = state.players.map((p) =>
    p.tribeId === tribeId ? { ...p, treasury: p.treasury + amount } : p
  )

  return { ...state, players: newPlayers }
}

function addCultureToPlayer(
  state: GameState,
  tribeId: TribeId,
  amount: number
): GameState {
  const newPlayers = state.players.map((p) =>
    p.tribeId === tribeId
      ? { ...p, cultureProgress: p.cultureProgress + amount }
      : p
  )

  return { ...state, players: newPlayers }
}

function spawnFreeUnit(
  state: GameState,
  settlement: Settlement,
  unitType: string
): GameState {
  const unit = createUnit({
    type: unitType as never,
    owner: settlement.owner,
    position: settlement.position,
    rarity: 'common',
  })

  const newUnits = new Map(state.units)
  newUnits.set(unit.id, unit)

  return { ...state, units: newUnits }
}

function spawnUniqueUnit(state: GameState, settlement: Settlement): GameState {
  // Map tribes to their unique unit types
  const tribeUniqueUnits: Record<string, string> = {
    monkes: 'banana_slinger',
    geckos: 'neon_geck',
    degods: 'deadgod',
    cets: 'stuckers',
  }

  // Get the tribe name from the tribeId (format is usually the tribe name)
  const tribeId = settlement.owner as string
  const uniqueUnitType = tribeUniqueUnits[tribeId] ?? 'warrior'

  const unit = createUnit({
    type: uniqueUnitType as never,
    owner: settlement.owner,
    position: settlement.position,
    rarity: 'rare', // Unique units get better rarity
  })

  const newUnits = new Map(state.units)
  newUnits.set(unit.id, unit)

  return { ...state, units: newUnits }
}

function expandBorders(
  state: GameState,
  settlement: Settlement,
  additionalRadius: number
): GameState {
  const currentRadius = 1 // Settlements start with radius 1
  const newRadius = currentRadius + additionalRadius

  const newTiles = new Map(state.map.tiles)
  const range = hexRange(settlement.position, newRadius)

  for (const coord of range) {
    const key = hexKey(coord)
    const tile = newTiles.get(key)

    // Claim unclaimed tiles
    if (tile && !tile.owner) {
      newTiles.set(key, {
        ...tile,
        owner: settlement.owner,
      })
    }
  }

  return {
    ...state,
    map: {
      ...state.map,
      tiles: newTiles,
    },
  }
}

function addPopulation(
  state: GameState,
  settlementId: string,
  amount: number
): GameState {
  const settlement = state.settlements.get(settlementId as never)
  if (!settlement) return state

  const updatedSettlement: Settlement = {
    ...settlement,
    population: settlement.population + amount,
  }

  return updateSettlement(state, updatedSettlement)
}

function addFloorPriceBonus(
  state: GameState,
  tribeId: TribeId,
  amount: number
): GameState {
  const currentPrice = state.floorPrices.get(tribeId) || 0
  const newPrices = new Map(state.floorPrices)
  newPrices.set(tribeId, currentPrice + amount)

  return { ...state, floorPrices: newPrices }
}

// =============================================================================
// Milestone Summary
// =============================================================================

/**
 * Gets a summary of all milestones chosen by a settlement
 */
export function getMilestonesSummary(
  settlement: Settlement
): Array<{ level: number; choice: 'a' | 'b'; name: string }> {
  return settlement.milestonesChosen.map((m) => {
    const milestone = getMilestoneForLevel(m.level)
    const option = m.choice === 'a' ? milestone?.optionA : milestone?.optionB

    return {
      level: m.level,
      choice: m.choice,
      name: option?.name || 'Unknown',
    }
  })
}
