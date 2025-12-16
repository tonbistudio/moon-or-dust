// Great People system - accumulation, spawning, and one-time actions

import type {
  GameState,
  GreatPersonId,
  GreatPersonDefinition,
  GreatPersonEffect,
  GreatPeopleState,
  GreatPeopleAccumulator,
  GreatPerson,
  TribeId,
  TribeName,
  BuildingId,
  CultureId,
  UnitId,
  HexCoord,
  Player,
} from '../types'
import { hexRange, hexKey } from '../hex'
import { createUnit, addUnit } from '../units'
import { applyPromotion, ALL_PROMOTIONS } from '../promotions'
import { getPlayerSettlements } from '../settlements'

// =============================================================================
// Constants
// =============================================================================

const BASE_SPAWN_CHANCE = 0.5 // 50% base chance

// =============================================================================
// Great Person Definitions
// =============================================================================

export const GREAT_PERSON_DEFINITIONS: Record<GreatPersonId, GreatPersonDefinition> = {
  // =========================================================================
  // Combat XP Category
  // =========================================================================
  fxnction: {
    id: 'fxnction',
    name: 'Fxnction',
    category: 'combat',
    threshold: { type: 'accumulator', stat: 'combat', amount: 100 },
    actionName: 'Inspire',
    effect: { type: 'area_promotion', radius: 2 },
  },
  jpeggler: {
    id: 'jpeggler',
    name: 'Jpeggler',
    category: 'combat',
    threshold: { type: 'accumulator', stat: 'combat', amount: 200 },
    actionName: 'Enigma Venture',
    effect: { type: 'area_promotion', radius: 3 },
  },

  // =========================================================================
  // Alpha Category
  // =========================================================================
  mert: {
    id: 'mert',
    name: 'Mert',
    category: 'alpha',
    threshold: { type: 'accumulator', stat: 'alpha', amount: 150 },
    actionName: 'Eureka',
    effect: { type: 'instant_building', buildingCategory: 'tech' },
  },
  toly: {
    id: 'toly',
    name: 'Toly',
    category: 'alpha',
    threshold: { type: 'accumulator', stat: 'alpha', amount: 250 },
    actionName: 'Dragon Mode',
    effect: { type: 'yield_buff', yield: 'alpha', percent: 10, turns: 5 },
  },
  raj: {
    id: 'raj',
    name: 'Raj',
    category: 'alpha',
    threshold: { type: 'accumulator', stat: 'alpha', amount: 350 },
    actionName: "Myro's Epiphany",
    effect: { type: 'instant_research' },
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
    threshold: { type: 'accumulator', stat: 'gold', amount: 400 },
    actionName: 'Forgotten Treasure',
    effect: { type: 'yield_buff', yield: 'gold', percent: 15, turns: 5 },
  },
  retired_chad_dev: {
    id: 'retired_chad_dev',
    name: 'Retired Chad Dev',
    category: 'gold',
    threshold: { type: 'accumulator', stat: 'gold', amount: 600 },
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
    threshold: { type: 'accumulator', stat: 'vibes', amount: 150 },
    actionName: 'Masterwork',
    effect: { type: 'border_expansion', tiles: 3, bonusVibes: 50 },
  },
  john_le: {
    id: 'john_le',
    name: 'John Le',
    category: 'vibes',
    threshold: { type: 'accumulator', stat: 'vibes', amount: 350 },
    actionName: 'First Edition',
    effect: { type: 'instant_culture' },
  },
  monoliff: {
    id: 'monoliff',
    name: 'Monoliff',
    category: 'vibes',
    threshold: { type: 'accumulator', stat: 'vibes', amount: 500 },
    actionName: 'Grail Ape',
    effect: { type: 'yield_buff', yield: 'vibes', percent: 33, turns: 4 },
  },

  // =========================================================================
  // Trade Category
  // =========================================================================
  hge: {
    id: 'hge',
    name: 'HGE',
    category: 'trade',
    threshold: { type: 'count', stat: 'tradeRoutes', amount: 3 },
    actionName: 'Sweep',
    effect: { type: 'free_trade_route' },
  },
  ravi: {
    id: 'ravi',
    name: 'Ravi',
    category: 'trade',
    threshold: { type: 'count', stat: 'tradeRoutes', amount: 5 },
    actionName: 'Perfect Portfolio',
    effect: { type: 'golden_age', turns: 2 },
  },
  watch_king: {
    id: 'watch_king',
    name: 'Watch King',
    category: 'trade',
    threshold: { type: 'count', stat: 'tradeRoutes', amount: 7 },
    actionName: 'Rolex Romp',
    effect: { type: 'yield_buff', yield: 'trade', percent: 25, turns: 5 },
  },

  // =========================================================================
  // Production Category
  // =========================================================================
  solport_tom: {
    id: 'solport_tom',
    name: 'Solport Tom',
    category: 'production',
    threshold: { type: 'count', stat: 'wondersBuilt', amount: 2 },
    actionName: 'Beep Beep',
    effect: { type: 'production_buff', percent: 25, turns: 3, target: 'all' },
  },
  renji: {
    id: 'renji',
    name: 'Renji',
    category: 'production',
    threshold: { type: 'combo', wonders: 2, buildings: 8 },
    actionName: 'Golden Akari',
    effect: { type: 'production_buff', percent: 50, turns: 3, target: 'wonder' },
  },
  blocksmyth: {
    id: 'blocksmyth',
    name: 'Blocksmyth',
    category: 'production',
    threshold: { type: 'count', stat: 'wondersBuilt', amount: 3 },
    actionName: 'Mercury Blast',
    effect: { type: 'production_buff', percent: 30, turns: 3, target: 'building' },
  },

  // =========================================================================
  // Kills Category
  // =========================================================================
  the_solstice: {
    id: 'the_solstice',
    name: 'The Solstice',
    category: 'kills',
    threshold: { type: 'count', stat: 'kills', amount: 5 },
    actionName: 'Goofy Gorilla Gang',
    effect: { type: 'area_combat_buff', radius: 2, percent: 10, turns: 5 },
  },

  // =========================================================================
  // Captures Category
  // =========================================================================
  iced_knife: {
    id: 'iced_knife',
    name: 'Iced Knife',
    category: 'captures',
    threshold: { type: 'count', stat: 'captures', amount: 2 },
    actionName: 'Twisted Knife',
    effect: { type: 'area_defense_buff', radius: 2, percent: 25, turns: 5, includePromotion: true },
  },

  // =========================================================================
  // Tribal Great People
  // =========================================================================
  nom: {
    id: 'nom',
    name: 'Nom',
    category: 'tribal',
    threshold: { type: 'tribal', building: 'degen_mints_cabana' as BuildingId, culture: 'memecoin_mania' as CultureId },
    actionName: 'BONK!',
    effect: { type: 'instant_gold', amount: 300, bonusYield: { yield: 'gold', percent: 33, turns: 5 } },
    tribe: 'monkes',
  },
  frank: {
    id: 'frank',
    name: 'Frank',
    category: 'tribal',
    threshold: { type: 'tribal', building: 'eternal_bridge' as BuildingId, culture: 'fudding' as CultureId },
    actionName: 'Tragedy for the Haters',
    effect: { type: 'free_units', count: 3, unitCategory: 'combat', bonusVibes: 200 },
    tribe: 'degods',
  },
  genuine_articles: {
    id: 'genuine_articles',
    name: 'Genuine Articles',
    category: 'tribal',
    threshold: { type: 'tribal', building: 'the_garage' as BuildingId, culture: 'whitelisting' as CultureId },
    actionName: 'Immortal Journey',
    effect: { type: 'yield_buff', yields: [{ yield: 'production', percent: 20 }, { yield: 'alpha', percent: 25 }], turns: 5 },
    tribe: 'geckos',
  },
  peblo: {
    id: 'peblo',
    name: 'Peblo',
    category: 'tribal',
    threshold: { type: 'tribal', building: 'creckhouse' as BuildingId, culture: 'virality' as CultureId },
    actionName: 'We are Peblo',
    effect: { type: 'area_defense_buff', radius: 99, percent: 50, turns: 5, bonusYield: { yield: 'vibes', percent: 25 } },
    tribe: 'cets',
  },
}

export const ALL_GREAT_PEOPLE: GreatPersonDefinition[] = Object.values(GREAT_PERSON_DEFINITIONS)

// =============================================================================
// Initial State
// =============================================================================

export function getInitialGreatPeopleState(): GreatPeopleState {
  return {
    accumulator: {
      combat: 0,
      alpha: 0,
      gold: 0,
      vibes: 0,
      kills: 0,
      captures: 0,
      tradeRoutes: 0,
      wondersBuilt: 0,
      buildingsBuilt: 0,
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
  state: GameState,
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

    case 'combo':
      return acc.wondersBuilt >= threshold.wonders && acc.buildingsBuilt >= threshold.buildings

    case 'tribal': {
      // Must be the correct tribe
      if (definition.tribe) {
        const tribeName = getTribeName(player.tribeId)
        if (tribeName !== definition.tribe) return false
      }

      // Must have built the required building
      const hasBuilding = playerHasBuilding(state, player.tribeId, threshold.building)
      if (!hasBuilding) return false

      // Must have unlocked the required culture
      const hasCulture = player.unlockedCultures.includes(threshold.culture)
      return hasCulture
    }
  }
}

/**
 * Gets the tribe name from a tribe ID
 */
function getTribeName(tribeId: TribeId): TribeName {
  // TribeId is typically the same as TribeName for this game
  return tribeId as unknown as TribeName
}

/**
 * Checks if a player has built a specific building in any settlement
 */
function playerHasBuilding(state: GameState, tribeId: TribeId, buildingId: BuildingId): boolean {
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId && settlement.buildings.includes(buildingId)) {
      return true
    }
  }
  return false
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
    // Skip if already earned
    if (player.greatPeople.earned.includes(definition.id)) continue

    // Check if threshold met
    if (!meetsThreshold(state, player, definition)) continue

    // Roll for spawn (50% base + bonus)
    const spawnChance = BASE_SPAWN_CHANCE + (player.greatPeople.spawnChanceBonus / 100)
    if (rng() > spawnChance) continue

    // Spawn the great person!
    newState = spawnGreatPerson(newState, tribeId, definition.id)
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

  // Store the great person data (we'll track this on the unit itself via a separate map)
  // For now, we'll use a convention where great_person units have their greatPersonId
  // stored in a global map that we maintain
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
  rng: () => number
): GameState | null {
  const unit = state.units.get(unitId)
  if (!unit || unit.type !== 'great_person') return null

  const greatPerson = state.greatPersons?.get(unitId)
  if (!greatPerson || greatPerson.hasActed) return null

  const definition = GREAT_PERSON_DEFINITIONS[greatPerson.greatPersonId]
  if (!definition) return null

  // Apply the effect
  let newState = applyGreatPersonEffect(state, unit.owner, unit.position, definition.effect, rng)
  if (!newState) return null

  // Mark as acted
  const updatedGreatPerson: GreatPerson = {
    ...greatPerson,
    hasActed: true,
  }

  const newGreatPersons = new Map(newState.greatPersons ?? new Map())
  newGreatPersons.set(unitId, updatedGreatPerson)

  return {
    ...newState,
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
  rng: () => number
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

      let newState: GameState = { ...state, players: newPlayers }

      // Check for bonus yield buff
      if (effect.bonusYield) {
        newState = applyYieldBuff(newState, tribeId, effect.bonusYield.yield, effect.bonusYield.percent, effect.bonusYield.turns)
      }

      return newState
    }

    case 'instant_vibes': {
      const updatedPlayer: Player = {
        ...player,
        cultureProgress: player.cultureProgress + effect.amount,
      }
      const newPlayers = [...state.players]
      newPlayers[playerIndex] = updatedPlayer
      return { ...state, players: newPlayers }
    }

    case 'instant_research': {
      // Complete current research instantly
      if (!player.currentResearch) return state

      // Import would cause circular dependency, so we'll handle this in state module
      // For now, return state with a marker that research should complete
      return state // Will be handled by caller
    }

    case 'instant_culture': {
      // Complete current culture instantly
      if (!player.currentCulture) return state
      // Will be handled by caller
      return state
    }

    case 'instant_building': {
      // Instantly produce next building of specified category
      // Will be handled by caller
      return state
    }

    case 'free_trade_route': {
      // Grant an extra trade route slot
      // Simplified: just return state, would need trade route system update
      return state
    }

    case 'free_units': {
      const { count, bonusVibes = 0 } = effect

      let newState = state

      // Spawn random combat units at capital
      const settlements = getPlayerSettlements(state, tribeId)
      const capital = settlements.find((s) => s.isCapital) ?? settlements[0]
      if (!capital) return state

      const combatUnits = ['warrior', 'archer', 'horseman', 'swordsman']
      for (let i = 0; i < count; i++) {
        const unitType = combatUnits[Math.floor(rng() * combatUnits.length)]!
        const unit = createUnit({
          type: unitType as never,
          owner: tribeId,
          position: capital.position,
          rarity: 'rare',
        })
        newState = addUnit(newState, unit)
      }

      // Add bonus vibes
      if (bonusVibes > 0) {
        const newPlayerIndex = newState.players.findIndex((p) => p.tribeId === tribeId)
        if (newPlayerIndex !== -1) {
          const newPlayer = newState.players[newPlayerIndex]!
          const updatedPlayer: Player = {
            ...newPlayer,
            cultureProgress: newPlayer.cultureProgress + bonusVibes,
          }
          const newPlayers = [...newState.players]
          newPlayers[newPlayerIndex] = updatedPlayer
          newState = { ...newState, players: newPlayers }
        }
      }

      return newState
    }

    case 'border_expansion': {
      const { tiles, bonusVibes = 0 } = effect

      // Expand borders around position
      const newTiles = new Map(state.map.tiles)
      const range = hexRange(position, tiles)

      for (const coord of range) {
        const key = hexKey(coord)
        const tile = newTiles.get(key)
        if (tile && !tile.owner) {
          newTiles.set(key, { ...tile, owner: tribeId })
        }
      }

      let newState: GameState = {
        ...state,
        map: { ...state.map, tiles: newTiles },
      }

      // Add bonus vibes
      if (bonusVibes > 0) {
        const newPlayerIndex = newState.players.findIndex((p) => p.tribeId === tribeId)
        if (newPlayerIndex !== -1) {
          const newPlayer = newState.players[newPlayerIndex]!
          const updatedPlayer: Player = {
            ...newPlayer,
            cultureProgress: newPlayer.cultureProgress + bonusVibes,
          }
          const newPlayers = [...newState.players]
          newPlayers[newPlayerIndex] = updatedPlayer
          newState = { ...newState, players: newPlayers }
        }
      }

      return newState
    }

    case 'area_promotion': {
      const { radius } = effect
      const range = hexRange(position, radius)

      const newUnits = new Map(state.units)

      for (const coord of range) {
        const key = hexKey(coord)
        for (const [unitId, unit] of state.units) {
          if (unit.owner === tribeId && hexKey(unit.position) === key) {
            // Give a free promotion (first available)
            const firstPromotion = ALL_PROMOTIONS.find(
              (p) => !unit.promotions.includes(p.id) && (!p.prerequisite || unit.promotions.includes(p.prerequisite))
            )
            if (firstPromotion) {
              const promoted = applyPromotion(unit, firstPromotion.id)
              if (promoted) {
                newUnits.set(unitId, promoted)
              }
            }
          }
        }
      }

      return { ...state, units: newUnits }
    }

    case 'area_combat_buff':
    case 'area_defense_buff': {
      // These would require a buff tracking system
      // For now, return state - would need to add temporary buff tracking
      return state
    }

    case 'yield_buff': {
      // These would require a buff tracking system
      // For now, return state - would need to add temporary buff tracking
      return state
    }

    case 'production_buff': {
      // These would require a buff tracking system
      return state
    }

    case 'golden_age': {
      const updatedPlayer: Player = {
        ...player,
        goldenAge: {
          active: true,
          turnsRemaining: effect.turns,
          triggersUsed: player.goldenAge.triggersUsed,
          recentTechTurns: player.goldenAge.recentTechTurns,
        },
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
 * Helper to apply yield buff (would need buff tracking system)
 */
function applyYieldBuff(
  state: GameState,
  _tribeId: TribeId,
  _yieldType: string,
  _percent: number,
  _turns: number
): GameState {
  // Would need a temporary buff tracking system
  // For now, just return state
  return state
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
 * Updates accumulator when combat XP is earned
 */
export function addCombatXPToAccumulator(state: GameState, tribeId: TribeId, amount: number): GameState {
  return updateAccumulator(state, tribeId, 'combat', amount)
}

/**
 * Increments kill count in accumulator
 */
export function incrementKills(state: GameState, tribeId: TribeId): GameState {
  return updateAccumulator(state, tribeId, 'kills', 1)
}

/**
 * Increments capture count in accumulator
 */
export function incrementCaptures(state: GameState, tribeId: TribeId): GameState {
  return updateAccumulator(state, tribeId, 'captures', 1)
}

/**
 * Increments buildings built count in accumulator
 */
export function incrementBuildingsBuilt(state: GameState, tribeId: TribeId): GameState {
  return updateAccumulator(state, tribeId, 'buildingsBuilt', 1)
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

  const updatedAccumulator: GreatPeopleAccumulator = {
    ...player.greatPeople.accumulator,
    [stat]: currentValue + amount,
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
): { current: number; required: number; percent: number } | null {
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

    case 'combo': {
      const wonderProgress = Math.min(acc.wondersBuilt / threshold.wonders, 1)
      const buildingProgress = Math.min(acc.buildingsBuilt / threshold.buildings, 1)
      const avgProgress = (wonderProgress + buildingProgress) / 2
      return {
        current: acc.wondersBuilt + acc.buildingsBuilt,
        required: threshold.wonders + threshold.buildings,
        percent: Math.floor(avgProgress * 100),
      }
    }

    case 'tribal':
      // Tribal thresholds are binary (met or not)
      return null
  }
}
