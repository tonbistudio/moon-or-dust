// Settlement milestone system - level-up rewards and choices

import type {
  GameState,
  Settlement,
  MilestoneChoice,
  TribeId,
  Tile,
} from '../types'
import { hexNeighbors, hexKey } from '../hex'
import { createUnit } from '../units'
import { updateSettlement, calculateTileYields } from '../settlements'

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
  | { type: 'border_expansion'; tiles: number }
  | { type: 'growth_boost'; amount: number }
  | { type: 'culture_boost'; amount: number }
  | { type: 'unique_unit' }
  | { type: 'floor_price_bonus'; amount: number }
  | { type: 'production_bonus'; percent: number }
  | { type: 'growth_bonus'; percent: number }

/** Milestones trigger every N levels */
const MILESTONE_INTERVAL = 5

export const MILESTONE_REWARDS: MilestoneReward[] = [
  {
    level: 5,
    optionA: {
      name: 'Free Scout',
      description: 'Receive a free Scout unit',
      effect: { type: 'free_unit', unitType: 'scout' },
    },
    optionB: {
      name: 'Border Expansion',
      description: 'Expand settlement borders by 2 tiles',
      effect: { type: 'border_expansion', tiles: 2 },
    },
  },
  {
    level: 10,
    optionA: {
      name: 'Tribal Champion',
      description: "Receive your tribe's unique unit",
      effect: { type: 'unique_unit' },
    },
    optionB: {
      name: 'Grand Monument',
      description: '+25 Floor Price permanently',
      effect: { type: 'floor_price_bonus', amount: 25 },
    },
  },
  {
    level: 15,
    optionA: {
      name: 'Free Warrior',
      description: 'Receive a free Warrior unit',
      effect: { type: 'free_unit', unitType: 'warrior' },
    },
    optionB: {
      name: 'Gold Rush',
      description: 'Receive 50 Gold immediately',
      effect: { type: 'instant_gold', amount: 50 },
    },
  },
  {
    level: 20,
    optionA: {
      name: 'Elite Champion',
      description: "Receive your tribe's unique unit",
      effect: { type: 'unique_unit' },
    },
    optionB: {
      name: 'Legendary Monument',
      description: '+50 Floor Price permanently',
      effect: { type: 'floor_price_bonus', amount: 50 },
    },
  },
  {
    level: 25,
    optionA: {
      name: 'Production Mastery',
      description: '+25% Production in this settlement',
      effect: { type: 'production_bonus', percent: 25 },
    },
    optionB: {
      name: 'Growth Mastery',
      description: '+25% Growth in this settlement',
      effect: { type: 'growth_bonus', percent: 25 },
    },
  },
]

// =============================================================================
// Milestone Queries
// =============================================================================

/**
 * Checks if a level is a milestone level (multiple of MILESTONE_INTERVAL)
 */
export function isMilestoneLevel(level: number): boolean {
  return level > 0 && level % MILESTONE_INTERVAL === 0
}

/**
 * Gets the milestone reward options for a level
 * Returns null if level is not a milestone level
 */
export function getMilestoneForLevel(level: number): MilestoneReward | null {
  if (!isMilestoneLevel(level)) return null

  const milestone = MILESTONE_REWARDS.find((m) => m.level === level)
  if (milestone) return milestone

  // For levels beyond defined milestones, cycle through the last two
  if (level > 25) {
    const cycleIndex = ((level / MILESTONE_INTERVAL - 5) % 2)
    return MILESTONE_REWARDS[3 + cycleIndex] || MILESTONE_REWARDS[MILESTONE_REWARDS.length - 1] || null
  }

  return null
}

/**
 * Checks if a settlement has any pending milestone choices
 */
export function hasPendingMilestone(settlement: Settlement): boolean {
  return getPendingMilestones(settlement).length > 0
}

/**
 * Gets list of pending milestone levels for a settlement
 */
export function getPendingMilestones(settlement: Settlement): number[] {
  const pending: number[] = []

  // Check all milestone levels up to current level
  for (let level = MILESTONE_INTERVAL; level <= settlement.level; level += MILESTONE_INTERVAL) {
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

  // Verify level is valid (must be a milestone level and not exceed current level)
  if (!isMilestoneLevel(level) || level > settlement.level) return null

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
      return expandBorders(state, settlement, effect.tiles)

    case 'growth_boost':
      return addGrowth(state, settlement.id as never, effect.amount)

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

/**
 * Expands borders by claiming N best-yield tiles adjacent to owned territory
 */
function expandBorders(
  state: GameState,
  settlement: Settlement,
  tilesToAdd: number
): GameState {
  let currentState = state

  for (let i = 0; i < tilesToAdd; i++) {
    // Get all currently owned tiles
    const ownedTileKeys = new Set<string>()
    for (const [key, tile] of currentState.map.tiles) {
      if (tile.owner === settlement.owner) {
        ownedTileKeys.add(key)
      }
    }

    // Find candidate tiles: unowned tiles adjacent to owned territory
    const candidateTiles: Array<{ key: string; tile: Tile; totalYield: number }> = []

    for (const ownedKey of ownedTileKeys) {
      const [qStr, rStr] = ownedKey.split(',')
      const coord = { q: parseInt(qStr!, 10), r: parseInt(rStr!, 10) }

      for (const neighborCoord of hexNeighbors(coord)) {
        const neighborKey = hexKey(neighborCoord)

        // Skip if already owned or already in candidates
        if (ownedTileKeys.has(neighborKey)) continue
        if (candidateTiles.some((c) => c.key === neighborKey)) continue

        const tile = currentState.map.tiles.get(neighborKey)
        if (!tile || tile.owner) continue // Skip if no tile or already owned by someone

        // Skip unworkable terrain (water, mountain)
        if (tile.terrain === 'water' || tile.terrain === 'mountain') continue

        // Calculate total yield
        const yields = calculateTileYields(tile)
        const totalYield = yields.gold + yields.alpha + yields.vibes + yields.production + yields.growth

        candidateTiles.push({ key: neighborKey, tile, totalYield })
      }
    }

    if (candidateTiles.length === 0) break

    // Sort by yield (highest first) and pick the best
    candidateTiles.sort((a, b) => b.totalYield - a.totalYield)
    const bestTile = candidateTiles[0]!

    // Claim the tile
    const newTiles = new Map(currentState.map.tiles)
    newTiles.set(bestTile.key, { ...bestTile.tile, owner: settlement.owner })

    currentState = {
      ...currentState,
      map: {
        ...currentState.map,
        tiles: newTiles,
      },
    }
  }

  return currentState
}

function addGrowth(
  state: GameState,
  settlementId: string,
  amount: number
): GameState {
  const settlement = state.settlements.get(settlementId as never)
  if (!settlement) return state

  const updatedSettlement: Settlement = {
    ...settlement,
    growthProgress: settlement.growthProgress + amount,
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
