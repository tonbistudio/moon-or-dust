// Great People system - accumulation, spawning, and one-time actions

import type {
  GameState,
  GreatPersonId,
  GreatPersonDefinition,
  GreatPersonEffect,
  GreatPeopleState,
  GreatPeopleAccumulator,
  GreatPerson,
  ActiveBuff,
  TribeId,
  UnitId,
  HexCoord,
  Player,
} from '../types'
import { hexRange, hexKey, hexNeighbors } from '../hex'
import { createUnit, addUnit } from '../units'
import { getPlayerSettlements, calculateTileYields } from '../settlements'
import { calculatePolicyGPPointsPercent } from '../cultures'

// =============================================================================
// Constants
// =============================================================================

const BASE_SPAWN_CHANCE = 0.5 // 50% base chance

// =============================================================================
// Great Person Definitions
// =============================================================================

export const GREAT_PERSON_DEFINITIONS: Record<GreatPersonId, GreatPersonDefinition> = {
  // =========================================================================
  // Alpha Category
  // =========================================================================
  mert: {
    id: 'mert',
    name: 'Mert',
    category: 'alpha',
    threshold: { type: 'accumulator', stat: 'alpha', amount: 100 },
    actionName: 'Eureka',
    effect: { type: 'instant_building', buildingCategory: 'tech' },
  },
  toly: {
    id: 'toly',
    name: 'Toly',
    category: 'alpha',
    threshold: { type: 'accumulator', stat: 'alpha', amount: 200 },
    actionName: 'Dragon Mode',
    effect: { type: 'yield_buff', yield: 'alpha', percent: 10, turns: 5 },
  },

  // =========================================================================
  // Gold Category
  // =========================================================================
  big_brain: {
    id: 'big_brain',
    name: 'Big Brain',
    category: 'gold',
    threshold: { type: 'accumulator', stat: 'gold', amount: 200 },
    actionName: 'Sweep',
    effect: { type: 'instant_gold', amount: 100 },
  },
  dingaling: {
    id: 'dingaling',
    name: 'Dingaling',
    category: 'gold',
    threshold: { type: 'accumulator', stat: 'gold', amount: 1000 },
    actionName: 'Forgotten Treasure',
    effect: { type: 'yield_buff', yield: 'gold', percent: 15, turns: 5 },
  },
  retired_chad_dev: {
    id: 'retired_chad_dev',
    name: 'Retired Chad Dev',
    category: 'gold',
    threshold: { type: 'accumulator', stat: 'gold', amount: 400 },
    actionName: 'Mad Sweep',
    effect: { type: 'instant_gold', amount: 300 },
  },

  // =========================================================================
  // Vibes Category
  // =========================================================================
  scum: {
    id: 'scum',
    name: 'SCUM',
    category: 'vibes',
    threshold: { type: 'accumulator', stat: 'vibes', amount: 80 },
    actionName: 'Masterwork',
    effect: { type: 'border_expansion', tiles: 3, bonusVibes: 50 },
  },
  monoliff: {
    id: 'monoliff',
    name: 'Monoliff',
    category: 'vibes',
    threshold: { type: 'accumulator', stat: 'vibes', amount: 250 },
    actionName: 'Grail Ape',
    effect: { type: 'yield_buff', yield: 'vibes', percent: 33, turns: 4 },
  },
  iced_knife: {
    id: 'iced_knife',
    name: 'Iced Knife',
    category: 'vibes',
    threshold: { type: 'accumulator', stat: 'vibes', amount: 400 },
    actionName: 'Twisted Knife',
    effect: { type: 'yield_buff', yield: 'vibes', percent: 50, turns: 3 },
  },

  // =========================================================================
  // Trade Category
  // =========================================================================
  watch_king: {
    id: 'watch_king',
    name: 'Watch King',
    category: 'trade',
    threshold: { type: 'count', stat: 'tradeRoutes', amount: 4 },
    actionName: 'Rolex Romp',
    effect: { type: 'yield_buff', yield: 'trade', percent: 25, turns: 5 },
  },

  // =========================================================================
  // Production Category
  // =========================================================================
  fxnction: {
    id: 'fxnction',
    name: 'Fxnction',
    category: 'production',
    threshold: { type: 'count', stat: 'wondersBuilt', amount: 2 },
    actionName: 'Inspire',
    effect: { type: 'instant_building', buildingCategory: 'vibes' },
  },
  blocksmyth: {
    id: 'blocksmyth',
    name: 'Blocksmyth',
    category: 'production',
    threshold: { type: 'count', stat: 'wondersBuilt', amount: 4 },
    actionName: 'Mercury Blast',
    effect: { type: 'production_buff', percent: 30, turns: 3, target: 'building' },
  },
}

export const ALL_GREAT_PEOPLE: GreatPersonDefinition[] = Object.values(GREAT_PERSON_DEFINITIONS)

// =============================================================================
// Initial State
// =============================================================================

export function getInitialGreatPeopleState(): GreatPeopleState {
  return {
    accumulator: {
      alpha: 0,
      gold: 0,
      vibes: 0,
      tradeRoutes: 0,
      wondersBuilt: 0,
    },
    earned: [],
    spawnChanceBonus: 0,
  }
}

// =============================================================================
// Threshold Checking
// =============================================================================

/**
 * Checks if a player meets the threshold for a great person
 */
export function meetsThreshold(
  _state: GameState,
  player: Player,
  definition: GreatPersonDefinition
): boolean {
  const threshold = definition.threshold
  const acc = player.greatPeople.accumulator

  switch (threshold.type) {
    case 'accumulator':
      return acc[threshold.stat] >= threshold.amount

    case 'count':
      return acc[threshold.stat] >= threshold.amount
  }
}

// =============================================================================
// Great Person Spawning
// =============================================================================

/**
 * Checks for and spawns any earned great people at end of turn
 */
export function checkAndSpawnGreatPeople(
  state: GameState,
  tribeId: TribeId,
  rng: () => number
): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  let newState = state

  // Check each great person
  for (const definition of ALL_GREAT_PEOPLE) {
    // Skip if already earned by this player
    if (player.greatPeople.earned.includes(definition.id)) continue

    // Skip if ANY player already earned this great person (one per game)
    const alreadyEarnedGlobally = newState.players.some(p => p.greatPeople.earned.includes(definition.id))
    if (alreadyEarnedGlobally) continue

    // Check if threshold met
    if (!meetsThreshold(state, player, definition)) continue

    // Roll for spawn (50% base + bonus)
    const spawnChance = BASE_SPAWN_CHANCE + (player.greatPeople.spawnChanceBonus / 100)
    if (rng() > spawnChance) continue

    // Spawn the great person!
    newState = spawnGreatPerson(newState, tribeId, definition.id)
    break // Only spawn one great person per turn
  }

  return newState
}

/**
 * Spawns a great person for a player
 */
export function spawnGreatPerson(
  state: GameState,
  tribeId: TribeId,
  greatPersonId: GreatPersonId
): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!

  // Find spawn location (capital or first settlement)
  const settlements = getPlayerSettlements(state, tribeId)
  const capital = settlements.find((s) => s.isCapital) ?? settlements[0]
  if (!capital) return state

  // Create the great person unit
  const unit = createUnit({
    type: 'great_person',
    owner: tribeId,
    position: capital.position,
    rarity: 'legendary', // Great people are always legendary
  })

  // Add great person data to the unit
  const greatPersonUnit: GreatPerson = {
    id: unit.id,
    greatPersonId,
    hasActed: false,
  }

  // Update state
  let newState = addUnit(state, unit)

  // Mark as earned
  const updatedGreatPeople: GreatPeopleState = {
    ...player.greatPeople,
    earned: [...player.greatPeople.earned, greatPersonId],
  }

  const updatedPlayer: Player = {
    ...player,
    greatPeople: updatedGreatPeople,
  }

  const newPlayers = [...newState.players]
  newPlayers[playerIndex] = updatedPlayer

  const newGreatPersons = new Map(state.greatPersons ?? new Map())
  newGreatPersons.set(unit.id, greatPersonUnit)

  return {
    ...newState,
    players: newPlayers,
    greatPersons: newGreatPersons,
  }
}

// =============================================================================
// Great Person Actions
// =============================================================================

/**
 * Uses a great person's one-time action
 */
export function useGreatPersonAction(
  state: GameState,
  unitId: UnitId,
  _rng: () => number
): GameState | null {
  const unit = state.units.get(unitId)
  if (!unit || unit.type !== 'great_person') return null

  const greatPerson = state.greatPersons?.get(unitId)
  if (!greatPerson || greatPerson.hasActed) return null

  const definition = GREAT_PERSON_DEFINITIONS[greatPerson.greatPersonId]
  if (!definition) return null

  // Apply the effect
  let newState = applyGreatPersonEffect(state, unit.owner, unit.position, definition.effect)
  if (!newState) return null

  // Remove the great person unit after use (they are consumed)
  const newUnits = new Map(newState.units)
  newUnits.delete(unitId)

  // Also remove from greatPersons tracking
  const newGreatPersons = new Map(newState.greatPersons ?? new Map())
  newGreatPersons.delete(unitId)

  return {
    ...newState,
    units: newUnits,
    greatPersons: newGreatPersons,
  }
}

/**
 * Applies a great person effect
 */
function applyGreatPersonEffect(
  state: GameState,
  tribeId: TribeId,
  position: HexCoord,
  effect: GreatPersonEffect,
): GameState | null {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return null

  const player = state.players[playerIndex]!

  switch (effect.type) {
    case 'instant_gold': {
      const updatedPlayer: Player = {
        ...player,
        treasury: player.treasury + effect.amount,
      }
      const newPlayers = [...state.players]
      newPlayers[playerIndex] = updatedPlayer
      return { ...state, players: newPlayers }
    }

    case 'instant_building': {
      // Instantly produce next building of specified category
      // Handled by caller in state module
      return state
    }

    case 'border_expansion': {
      const { tiles: tilesToClaim, bonusVibes = 0 } = effect

      // Expand borders by claiming N best-yield tiles adjacent to owned territory
      let currentState = state

      for (let i = 0; i < tilesToClaim; i++) {
        // Find tiles within reasonable range of the great person's position
        const maxRadius = 5
        const tilesNearPosition = hexRange(position, maxRadius)
        const nearPositionKeys = new Set(tilesNearPosition.map(c => hexKey(c)))

        // Get owned tiles near this position
        const ownedTileKeys = new Set<string>()
        for (const [key, tile] of currentState.map.tiles) {
          if (tile.owner === tribeId && nearPositionKeys.has(key)) {
            ownedTileKeys.add(key)
          }
        }

        // Find candidate tiles: unowned tiles adjacent to owned territory
        const candidateTiles: Array<{ key: string; coord: HexCoord; totalYield: number }> = []

        for (const ownedKey of ownedTileKeys) {
          const [qStr, rStr] = ownedKey.split(',')
          const coord = { q: parseInt(qStr!, 10), r: parseInt(rStr!, 10) }

          for (const neighborCoord of hexNeighbors(coord)) {
            const neighborKey = hexKey(neighborCoord)

            // Skip if already owned or already a candidate
            if (ownedTileKeys.has(neighborKey)) continue
            if (candidateTiles.some(c => c.key === neighborKey)) continue

            const tile = currentState.map.tiles.get(neighborKey)
            if (!tile || tile.owner) continue // Skip owned or non-existent tiles

            // Skip unworkable terrain (water, mountain)
            if (tile.terrain === 'water' || tile.terrain === 'mountain') continue

            // Calculate total yields for this tile
            const yields = calculateTileYields(tile)
            const totalYield = yields.gold + yields.alpha + yields.vibes + yields.production + yields.growth

            candidateTiles.push({ key: neighborKey, coord: neighborCoord, totalYield })
          }
        }

        if (candidateTiles.length === 0) break

        // Sort by yield (highest first) and pick the best
        candidateTiles.sort((a, b) => b.totalYield - a.totalYield)
        const bestTile = candidateTiles[0]!

        // Claim the tile
        const newTiles = new Map(currentState.map.tiles)
        const tile = newTiles.get(bestTile.key)!
        newTiles.set(bestTile.key, { ...tile, owner: tribeId })

        currentState = {
          ...currentState,
          map: { ...currentState.map, tiles: newTiles },
        }
      }

      // Add bonus vibes
      if (bonusVibes > 0) {
        const newPlayerIndex = currentState.players.findIndex((p) => p.tribeId === tribeId)
        if (newPlayerIndex !== -1) {
          const newPlayer = currentState.players[newPlayerIndex]!
          const updatedPlayer: Player = {
            ...newPlayer,
            cultureProgress: newPlayer.cultureProgress + bonusVibes,
          }
          const newPlayers = [...currentState.players]
          newPlayers[newPlayerIndex] = updatedPlayer
          currentState = { ...currentState, players: newPlayers }
        }
      }

      return currentState
    }

    case 'yield_buff': {
      const buff: ActiveBuff = {
        source: getGreatPersonIdFromEffect(state, tribeId, effect) ?? 'scum',
        type: effect.yield === 'trade' ? 'trade' : 'yield',
        yield: effect.yield,
        percent: effect.percent,
        turnsRemaining: effect.turns,
      }
      const updatedPlayer: Player = {
        ...player,
        activeBuffs: [...(player.activeBuffs ?? []), buff],
      }
      const newPlayers = [...state.players]
      newPlayers[playerIndex] = updatedPlayer
      return { ...state, players: newPlayers }
    }

    case 'production_buff': {
      const buff: ActiveBuff = {
        source: getGreatPersonIdFromEffect(state, tribeId, effect) ?? 'blocksmyth',
        type: 'production',
        percent: effect.percent,
        turnsRemaining: effect.turns,
      }
      const updatedPlayer: Player = {
        ...player,
        activeBuffs: [...(player.activeBuffs ?? []), buff],
      }
      const newPlayers = [...state.players]
      newPlayers[playerIndex] = updatedPlayer
      return { ...state, players: newPlayers }
    }

    default:
      return state
  }
}

/**
 * Helper to identify which great person triggered an effect (for buff source tracking)
 */
function getGreatPersonIdFromEffect(
  _state: GameState,
  _tribeId: TribeId,
  _effect: GreatPersonEffect
): GreatPersonId | undefined {
  // The caller (useGreatPersonAction) already has the GP ID, but the effect handler
  // doesn't receive it. We look it up by matching the effect to a definition.
  for (const def of ALL_GREAT_PEOPLE) {
    if (def.effect.type === _effect.type) {
      if (_effect.type === 'yield_buff' && def.effect.type === 'yield_buff') {
        if (def.effect.yield === _effect.yield && def.effect.percent === _effect.percent) {
          return def.id
        }
      } else if (_effect.type === 'production_buff' && def.effect.type === 'production_buff') {
        if (def.effect.percent === _effect.percent) {
          return def.id
        }
      }
    }
  }
  return undefined
}

// =============================================================================
// Buff Management
// =============================================================================

/**
 * Gets the total yield buff percent for a given yield type from active buffs
 */
export function getActiveYieldBuffPercent(player: Player, yieldType: string): number {
  const buffs = player.activeBuffs ?? []
  return buffs
    .filter(b => b.type === 'yield' && b.yield === yieldType && b.turnsRemaining > 0)
    .reduce((sum, b) => sum + b.percent, 0)
}

/**
 * Gets the total trade buff percent from active buffs
 */
export function getActiveTradeBuffPercent(player: Player): number {
  const buffs = player.activeBuffs ?? []
  return buffs
    .filter(b => b.type === 'trade' && b.turnsRemaining > 0)
    .reduce((sum, b) => sum + b.percent, 0)
}

/**
 * Gets the total production buff percent for buildings from active buffs
 */
export function getActiveProductionBuffPercent(player: Player): number {
  const buffs = player.activeBuffs ?? []
  return buffs
    .filter(b => b.type === 'production' && b.turnsRemaining > 0)
    .reduce((sum, b) => sum + b.percent, 0)
}

/**
 * Decrements buff timers and removes expired buffs. Called once per turn per player.
 */
export function tickActiveBuffs(state: GameState, tribeId: TribeId): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  const buffs = player.activeBuffs ?? []
  if (buffs.length === 0) return state

  const updatedBuffs = buffs
    .map(b => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
    .filter(b => b.turnsRemaining > 0)

  const updatedPlayer: Player = {
    ...player,
    activeBuffs: updatedBuffs,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer
  return { ...state, players: newPlayers }
}

// =============================================================================
// Accumulator Updates
// =============================================================================

/**
 * Updates accumulator when alpha is earned
 */
export function addAlphaToAccumulator(state: GameState, tribeId: TribeId, amount: number): GameState {
  return updateAccumulator(state, tribeId, 'alpha', amount)
}

/**
 * Updates accumulator when gold is earned
 */
export function addGoldToAccumulator(state: GameState, tribeId: TribeId, amount: number): GameState {
  return updateAccumulator(state, tribeId, 'gold', amount)
}

/**
 * Updates accumulator when vibes are earned
 */
export function addVibesToAccumulator(state: GameState, tribeId: TribeId, amount: number): GameState {
  return updateAccumulator(state, tribeId, 'vibes', amount)
}

/**
 * Increments wonders built count in accumulator
 */
export function incrementWondersBuilt(state: GameState, tribeId: TribeId): GameState {
  return updateAccumulator(state, tribeId, 'wondersBuilt', 1)
}

/**
 * Updates trade route count in accumulator
 */
export function updateTradeRouteCount(state: GameState, tribeId: TribeId): GameState {
  const activeRoutes = state.tradeRoutes.filter((r) => {
    const origin = state.settlements.get(r.origin)
    return origin && origin.owner === tribeId && r.active
  }).length

  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  const updatedAccumulator: GreatPeopleAccumulator = {
    ...player.greatPeople.accumulator,
    tradeRoutes: activeRoutes,
  }

  const updatedGreatPeople: GreatPeopleState = {
    ...player.greatPeople,
    accumulator: updatedAccumulator,
  }

  const updatedPlayer: Player = {
    ...player,
    greatPeople: updatedGreatPeople,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

/**
 * Generic accumulator update helper
 * Applies great_person_points policy bonus (+25%) to yield-based stats (alpha, gold, vibes)
 * Count-based stats (tradeRoutes, wondersBuilt) are not affected
 */
function updateAccumulator(
  state: GameState,
  tribeId: TribeId,
  stat: keyof GreatPeopleAccumulator,
  amount: number
): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  const currentValue = player.greatPeople.accumulator[stat]

  // Apply GP points bonus to yield-based stats only
  let adjustedAmount = amount
  const yieldStats: (keyof GreatPeopleAccumulator)[] = ['alpha', 'gold', 'vibes']
  if (yieldStats.includes(stat)) {
    const gpPointsBonus = calculatePolicyGPPointsPercent(player)
    if (gpPointsBonus > 0) {
      adjustedAmount = Math.floor(amount * (1 + gpPointsBonus / 100))
    }
  }

  const updatedAccumulator: GreatPeopleAccumulator = {
    ...player.greatPeople.accumulator,
    [stat]: currentValue + adjustedAmount,
  }

  const updatedGreatPeople: GreatPeopleState = {
    ...player.greatPeople,
    accumulator: updatedAccumulator,
  }

  const updatedPlayer: Player = {
    ...player,
    greatPeople: updatedGreatPeople,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Gets a great person definition by ID
 */
export function getGreatPersonDefinition(id: GreatPersonId): GreatPersonDefinition | undefined {
  return GREAT_PERSON_DEFINITIONS[id]
}

/**
 * Gets all available great people for a player (not yet earned, threshold met)
 */
export function getAvailableGreatPeople(state: GameState, player: Player): GreatPersonDefinition[] {
  return ALL_GREAT_PEOPLE.filter((gp) => {
    if (player.greatPeople.earned.includes(gp.id)) return false
    return meetsThreshold(state, player, gp)
  })
}

/**
 * Gets progress toward a great person threshold
 */
export function getThresholdProgress(
  player: Player,
  definition: GreatPersonDefinition
): { current: number; required: number; percent: number } {
  const threshold = definition.threshold
  const acc = player.greatPeople.accumulator

  switch (threshold.type) {
    case 'accumulator':
      return {
        current: acc[threshold.stat],
        required: threshold.amount,
        percent: Math.min(100, Math.floor((acc[threshold.stat] / threshold.amount) * 100)),
      }

    case 'count':
      return {
        current: acc[threshold.stat],
        required: threshold.amount,
        percent: Math.min(100, Math.floor((acc[threshold.stat] / threshold.amount) * 100)),
      }
  }
}
