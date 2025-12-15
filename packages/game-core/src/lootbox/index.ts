// Lootbox claiming and reward distribution

import type {
  GameState,
  Lootbox,
  LootboxId,
  LootboxReward,
  HexCoord,
  TribeId,
  Settlement,
  Player,
} from '../types'
import { hexKey, hexRange, hexDistance } from '../hex'
import { createUnit } from '../units'
import { updateSettlement, getPlayerSettlements } from '../settlements'

// =============================================================================
// Reward Weights
// =============================================================================

const REWARD_WEIGHTS: Record<LootboxReward, number> = {
  airdrop: 30,
  alpha_leak: 15,
  og_holder: 20,
  community_growth: 20,
  scout: 15,
}

// =============================================================================
// Lootbox Queries
// =============================================================================

/**
 * Gets a lootbox at a specific position
 */
export function getLootboxAt(state: GameState, coord: HexCoord): Lootbox | undefined {
  const key = hexKey(coord)
  return state.lootboxes.find((lb) => hexKey(lb.position) === key && !lb.claimed)
}

/**
 * Gets all unclaimed lootboxes
 */
export function getUnclaimedLootboxes(state: GameState): Lootbox[] {
  return state.lootboxes.filter((lb) => !lb.claimed)
}

/**
 * Checks if there's an unclaimed lootbox at a position
 */
export function hasLootboxAt(state: GameState, coord: HexCoord): boolean {
  return getLootboxAt(state, coord) !== undefined
}

// =============================================================================
// Reward Rolling
// =============================================================================

/**
 * Rolls a random lootbox reward based on weighted probabilities
 */
export function rollLootboxReward(rng: () => number): LootboxReward {
  const totalWeight = Object.values(REWARD_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = rng() * totalWeight

  for (const [reward, weight] of Object.entries(REWARD_WEIGHTS)) {
    roll -= weight
    if (roll <= 0) {
      return reward as LootboxReward
    }
  }

  return 'airdrop' // Default fallback
}

// =============================================================================
// Reward Application
// =============================================================================

export interface ClaimResult {
  state: GameState
  reward: LootboxReward
  details: RewardDetails
}

export type RewardDetails =
  | { type: 'airdrop'; gold: number }
  | { type: 'alpha_leak'; techId: string }
  | { type: 'og_holder'; unitId: string; unitType: string }
  | { type: 'community_growth'; settlementId: string; populationAdded: number }
  | { type: 'scout'; hexesRevealed: number }

/**
 * Claims a lootbox at a position and applies the reward
 * Returns the updated state and information about the reward
 */
export function claimLootbox(
  state: GameState,
  coord: HexCoord,
  claimingTribeId: TribeId,
  rng: () => number
): ClaimResult | null {
  const lootbox = getLootboxAt(state, coord)
  if (!lootbox) return null

  // Roll for reward
  const reward = rollLootboxReward(rng)

  // Mark lootbox as claimed with the reward type
  const updatedLootboxes = state.lootboxes.map((lb) =>
    lb.id === lootbox.id ? { ...lb, claimed: true, reward } : lb
  )

  let newState: GameState = {
    ...state,
    lootboxes: updatedLootboxes,
  }

  // Apply the reward
  const details = applyReward(newState, reward, claimingTribeId, coord, rng)
  newState = details.state

  return {
    state: newState,
    reward,
    details: details.details,
  }
}

interface ApplyRewardResult {
  state: GameState
  details: RewardDetails
}

function applyReward(
  state: GameState,
  reward: LootboxReward,
  tribeId: TribeId,
  lootboxPosition: HexCoord,
  rng: () => number
): ApplyRewardResult {
  switch (reward) {
    case 'airdrop':
      return applyAirdropReward(state, tribeId, rng)
    case 'alpha_leak':
      return applyAlphaLeakReward(state, tribeId)
    case 'og_holder':
      return applyOgHolderReward(state, tribeId, lootboxPosition, rng)
    case 'community_growth':
      return applyCommunityGrowthReward(state, tribeId)
    case 'scout':
      return applyScoutReward(state, tribeId, lootboxPosition)
  }
}

/**
 * Airdrop: Instant gold bonus (25-50 gold)
 */
function applyAirdropReward(
  state: GameState,
  tribeId: TribeId,
  rng: () => number
): ApplyRewardResult {
  const goldAmount = 25 + Math.floor(rng() * 26) // 25-50

  const newPlayers = state.players.map((player) =>
    player.tribeId === tribeId
      ? { ...player, treasury: player.treasury + goldAmount }
      : player
  )

  return {
    state: { ...state, players: newPlayers },
    details: { type: 'airdrop', gold: goldAmount },
  }
}

/**
 * Alpha Leak: Complete current research instantly (or grant progress if no research)
 */
function applyAlphaLeakReward(state: GameState, tribeId: TribeId): ApplyRewardResult {
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (!player) {
    return {
      state,
      details: { type: 'alpha_leak', techId: 'none' },
    }
  }

  // If player has current research, complete it
  if (player.currentResearch) {
    const techId = player.currentResearch
    const newPlayers = state.players.map((p) => {
      if (p.tribeId !== tribeId) return p

      // Omit currentResearch by destructuring
      const { currentResearch: _, ...rest } = p
      const updatedPlayer: Player = {
        ...rest,
        researchedTechs: [...p.researchedTechs, techId],
        researchProgress: 0,
      }
      return updatedPlayer
    })

    return {
      state: { ...state, players: newPlayers },
      details: { type: 'alpha_leak', techId },
    }
  }

  // No current research - grant bonus alpha points
  const bonusAlpha = 50
  const newPlayers = state.players.map((p) =>
    p.tribeId === tribeId
      ? {
          ...p,
          yields: { ...p.yields, alpha: p.yields.alpha + bonusAlpha },
        }
      : p
  )

  return {
    state: { ...state, players: newPlayers },
    details: { type: 'alpha_leak', techId: 'bonus_alpha' },
  }
}

/**
 * OG Holder: Free military unit spawns at nearest settlement
 */
function applyOgHolderReward(
  state: GameState,
  tribeId: TribeId,
  lootboxPosition: HexCoord,
  rng: () => number
): ApplyRewardResult {
  // Find nearest settlement owned by this tribe
  const settlements = getPlayerSettlements(state, tribeId)

  if (settlements.length === 0) {
    // No settlements - grant gold instead as fallback
    return applyAirdropReward(state, tribeId, rng)
  }

  // Find closest settlement
  let nearestSettlement: Settlement | null = null
  let nearestDistance = Infinity

  for (const settlement of settlements) {
    const dist = hexDistance(lootboxPosition, settlement.position)
    if (dist < nearestDistance) {
      nearestDistance = dist
      nearestSettlement = settlement
    }
  }

  if (!nearestSettlement) {
    return applyAirdropReward(state, tribeId, rng)
  }

  // Create a warrior unit at the settlement
  const unit = createUnit({
    type: 'warrior',
    owner: tribeId,
    position: nearestSettlement.position,
    rng, // Random rarity for the free unit
  })

  // Add unit to state
  const newUnits = new Map(state.units)
  newUnits.set(unit.id, unit)

  return {
    state: { ...state, units: newUnits },
    details: { type: 'og_holder', unitId: unit.id, unitType: 'warrior' },
  }
}

/**
 * Community Growth: +3 population to capital
 */
function applyCommunityGrowthReward(state: GameState, tribeId: TribeId): ApplyRewardResult {
  // Find capital
  const settlements = getPlayerSettlements(state, tribeId)
  const capital = settlements.find((s) => s.isCapital)

  if (!capital) {
    // No capital - try first settlement
    const firstSettlement = settlements[0]
    if (!firstSettlement) {
      return {
        state,
        details: { type: 'community_growth', settlementId: 'none', populationAdded: 0 },
      }
    }

    const updatedSettlement: Settlement = {
      ...firstSettlement,
      population: firstSettlement.population + 3,
    }

    const newState = updateSettlement(state, updatedSettlement)

    return {
      state: newState,
      details: {
        type: 'community_growth',
        settlementId: firstSettlement.id,
        populationAdded: 3,
      },
    }
  }

  const updatedCapital: Settlement = {
    ...capital,
    population: capital.population + 3,
  }

  const newState = updateSettlement(state, updatedCapital)

  return {
    state: newState,
    details: {
      type: 'community_growth',
      settlementId: capital.id,
      populationAdded: 3,
    },
  }
}

/**
 * Scout: Reveals large area of map (5-hex radius)
 */
function applyScoutReward(
  state: GameState,
  tribeId: TribeId,
  lootboxPosition: HexCoord
): ApplyRewardResult {
  // Get hexes in 5-radius
  const revealedHexes = hexRange(lootboxPosition, 5)

  // Get current fog for this tribe
  const currentFog = state.fog.get(tribeId) ?? new Set<string>()
  const newFog = new Set(currentFog)

  let hexesRevealed = 0
  for (const coord of revealedHexes) {
    const key = hexKey(coord)
    // Only count if it's within map bounds
    if (
      coord.q >= 0 &&
      coord.q < state.map.width &&
      coord.r >= 0 &&
      coord.r < state.map.height
    ) {
      if (!newFog.has(key)) {
        hexesRevealed++
      }
      newFog.add(key)
    }
  }

  // Update fog map
  const newFogMap = new Map(state.fog)
  newFogMap.set(tribeId, newFog)

  return {
    state: { ...state, fog: newFogMap },
    details: { type: 'scout', hexesRevealed },
  }
}

// =============================================================================
// Lootbox State Helpers
// =============================================================================

/**
 * Updates a lootbox in the game state
 */
export function updateLootbox(state: GameState, lootbox: Lootbox): GameState {
  const newLootboxes = state.lootboxes.map((lb) =>
    lb.id === lootbox.id ? lootbox : lb
  )

  return {
    ...state,
    lootboxes: newLootboxes,
  }
}

/**
 * Gets a lootbox by ID
 */
export function getLootboxById(state: GameState, id: LootboxId): Lootbox | undefined {
  return state.lootboxes.find((lb) => lb.id === id)
}
