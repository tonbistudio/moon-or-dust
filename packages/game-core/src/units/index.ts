// Unit management - creation, movement, combat, and stacking

import type {
  Unit,
  UnitId,
  UnitType,
  UnitRarity,
  RarityBonuses,
  TribeId,
  HexCoord,
  GameState,
} from '../types'
import { generateUnitId } from '../state'
import { hexKey, hexNeighbors, hexPathfind } from '../hex'

// =============================================================================
// Unit Base Stats
// =============================================================================

export interface UnitDefinition {
  readonly type: UnitType
  readonly baseHealth: number
  readonly baseMovement: number
  readonly baseCombatStrength: number
  readonly baseRangedStrength: number
  readonly baseSettlementStrength: number // Strength vs settlements (siege units have higher values)
  readonly productionCost: number
  readonly isCivilian: boolean
  readonly canAttack: boolean
  readonly canFound: boolean // Can found settlements (settler)
  readonly buildCharges: number // For builders
}

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
  scout: {
    type: 'scout',
    baseHealth: 50,
    baseMovement: 4,
    baseCombatStrength: 5,
    baseRangedStrength: 0,
    baseSettlementStrength: 5, // Same as combat
    productionCost: 30,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },
  warrior: {
    type: 'warrior',
    baseHealth: 100,
    baseMovement: 2,
    baseCombatStrength: 20,
    baseRangedStrength: 0,
    baseSettlementStrength: 20, // Same as combat
    productionCost: 40,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },
  archer: {
    type: 'archer',
    baseHealth: 80,
    baseMovement: 2,
    baseCombatStrength: 10,
    baseRangedStrength: 25,
    baseSettlementStrength: 25, // Use ranged for settlement attacks
    productionCost: 50,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },
  settler: {
    type: 'settler',
    baseHealth: 50,
    baseMovement: 2,
    baseCombatStrength: 0,
    baseRangedStrength: 0,
    baseSettlementStrength: 0,
    productionCost: 80,
    isCivilian: true,
    canAttack: false,
    canFound: true,
    buildCharges: 0,
  },
  builder: {
    type: 'builder',
    baseHealth: 50,
    baseMovement: 2,
    baseCombatStrength: 0,
    baseRangedStrength: 0,
    baseSettlementStrength: 0,
    productionCost: 50,
    isCivilian: true,
    canAttack: false,
    canFound: false,
    buildCharges: 3,
  },
  great_person: {
    type: 'great_person',
    baseHealth: 50,
    baseMovement: 3,
    baseCombatStrength: 0,
    baseRangedStrength: 0,
    baseSettlementStrength: 0,
    productionCost: 0, // Not producible directly
    isCivilian: true,
    canAttack: false,
    canFound: false,
    buildCharges: 0,
  },

  // ==========================================================================
  // Era 1 Military Units
  // ==========================================================================

  horseman: {
    type: 'horseman',
    baseHealth: 90,
    baseMovement: 4,
    baseCombatStrength: 18,
    baseRangedStrength: 0,
    baseSettlementStrength: 18, // Same as combat
    productionCost: 60,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  // ==========================================================================
  // Era 2 Military Units
  // ==========================================================================

  swordsman: {
    type: 'swordsman',
    baseHealth: 120,
    baseMovement: 2,
    baseCombatStrength: 35,
    baseRangedStrength: 0,
    baseSettlementStrength: 35, // Same as combat
    productionCost: 80,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  sniper: {
    type: 'sniper',
    baseHealth: 90,
    baseMovement: 2,
    baseCombatStrength: 15,
    baseRangedStrength: 40,
    baseSettlementStrength: 40, // Use ranged for settlement attacks
    productionCost: 90,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  knight: {
    type: 'knight',
    baseHealth: 110,
    baseMovement: 4,
    baseCombatStrength: 30,
    baseRangedStrength: 0,
    baseSettlementStrength: 30, // Same as combat
    productionCost: 100,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  // SIEGE UNIT: Weak vs units (20), strong vs settlements (60 = 3x)
  // Per CLAUDE.md: "2 strength against combat units, 10 strength against settlement HP"
  social_engineer: {
    type: 'social_engineer',
    baseHealth: 80,
    baseMovement: 2,
    baseCombatStrength: 20, // Weak against units
    baseRangedStrength: 20, // 2-hex range, same as combat strength
    baseSettlementStrength: 60, // 3x combat strength vs settlements
    productionCost: 100,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  // ==========================================================================
  // Era 3 Military Units
  // ==========================================================================

  bot_fighter: {
    type: 'bot_fighter',
    baseHealth: 150,
    baseMovement: 2,
    baseCombatStrength: 55,
    baseRangedStrength: 0,
    baseSettlementStrength: 55, // Same as combat
    productionCost: 150,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  rockeeter: {
    type: 'rockeeter',
    baseHealth: 100,
    baseMovement: 2,
    baseCombatStrength: 20,
    baseRangedStrength: 60,
    baseSettlementStrength: 60, // Use ranged for settlement attacks
    productionCost: 160,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  tank: {
    type: 'tank',
    baseHealth: 140,
    baseMovement: 4, // Changed from 5 to 4 for balance
    baseCombatStrength: 50,
    baseRangedStrength: 0,
    baseSettlementStrength: 50, // Same as combat
    productionCost: 180,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  // SIEGE UNIT: Weak vs units (25), strong vs settlements (75 = 3x)
  // Per CLAUDE.md: "4 strength against combat units, 20 strength against settlement HP"
  bombard: {
    type: 'bombard',
    baseHealth: 90,
    baseMovement: 2,
    baseCombatStrength: 25, // Weak against units
    baseRangedStrength: 25, // 2-hex range, same as combat strength
    baseSettlementStrength: 75, // 3x combat strength vs settlements
    productionCost: 170,
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  // ==========================================================================
  // Tribal Unique Units
  // ==========================================================================

  // Monkes: Banana Slinger (replaces Archer, Era 1)
  // +1 range, +1/+1 strength over base Archer
  banana_slinger: {
    type: 'banana_slinger',
    baseHealth: 80,
    baseMovement: 2,
    baseCombatStrength: 15, // 3/6 scaled: +5 over Archer's 10
    baseRangedStrength: 30, // +5 over Archer's 25
    baseSettlementStrength: 30, // Use ranged for settlement attacks
    productionCost: 50, // Same as Archer
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  // Geckos: Neon Geck (replaces Sniper, Era 2)
  // +1 mobility, kills grant +5 Alpha (handled in combat resolution)
  neon_geck: {
    type: 'neon_geck',
    baseHealth: 90,
    baseMovement: 3, // +1 over Sniper's 2
    baseCombatStrength: 15,
    baseRangedStrength: 40, // Same as Sniper
    baseSettlementStrength: 40, // Use ranged for settlement attacks
    productionCost: 90, // Same as Sniper
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  // DeGods: DeadGod (replaces Swordsman, Era 2)
  // +8 strength (scaled), kills grant +20 Gold (handled in combat resolution)
  deadgod: {
    type: 'deadgod',
    baseHealth: 120,
    baseMovement: 2,
    baseCombatStrength: 45, // +10 over Swordsman's 35 (8 strength in design doc)
    baseRangedStrength: 0,
    baseSettlementStrength: 45, // Same as combat
    productionCost: 80, // Same as Swordsman
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },

  // Cets: Stuckers (replaces Swordsman, Era 2)
  // Same strength, +1 mobility, enemies hit have mobility=0 for 2 turns (handled in combat)
  stuckers: {
    type: 'stuckers',
    baseHealth: 120,
    baseMovement: 3, // +1 over Swordsman's 2
    baseCombatStrength: 35, // Same as Swordsman
    baseRangedStrength: 0,
    baseSettlementStrength: 35, // Same as combat
    productionCost: 80, // Same as Swordsman
    isCivilian: false,
    canAttack: true,
    canFound: false,
    buildCharges: 0,
  },
}

// =============================================================================
// Rarity System
// =============================================================================

export const RARITY_WEIGHTS: Record<UnitRarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 4,
  legendary: 1,
}

export const RARITY_BONUSES: Record<UnitRarity, RarityBonuses> = {
  common: { combat: 0, movement: 0, vision: 0 },
  uncommon: { combat: 2, movement: 0, vision: 0 },
  rare: { combat: 5, movement: 0, vision: 1 },
  epic: { combat: 10, movement: 1, vision: 1 },
  legendary: { combat: 20, movement: 1, vision: 2 },
}

/**
 * Rolls a rarity based on weighted probabilities
 * @param rng - Random number generator (0-1)
 */
export function rollRarity(rng: () => number): UnitRarity {
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = rng() * totalWeight

  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    roll -= weight
    if (roll <= 0) {
      return rarity as UnitRarity
    }
  }

  return 'common'
}

// =============================================================================
// Unit Creation
// =============================================================================

export interface CreateUnitOptions {
  type: UnitType
  owner: TribeId
  position: HexCoord
  rarity?: UnitRarity
  rng?: () => number
}

/**
 * Creates a new unit with base stats and rarity bonuses
 */
export function createUnit(options: CreateUnitOptions): Unit {
  const { type, owner, position, rarity: providedRarity, rng } = options
  const def = UNIT_DEFINITIONS[type]

  // Roll rarity if not provided
  const rarity = providedRarity ?? (rng ? rollRarity(rng) : 'common')
  const rarityBonuses = RARITY_BONUSES[rarity]

  // Calculate final stats with rarity bonuses
  const maxHealth = def.baseHealth
  const combatStrength = def.baseCombatStrength + rarityBonuses.combat
  // Only apply rarity bonus to ranged/settlement if unit has base value > 0
  const rangedStrength = def.baseRangedStrength > 0 ? def.baseRangedStrength + rarityBonuses.combat : 0
  const settlementStrength = def.baseSettlementStrength + rarityBonuses.combat
  const maxMovement = def.baseMovement + rarityBonuses.movement

  return {
    id: generateUnitId(),
    type,
    owner,
    position,
    health: maxHealth,
    maxHealth,
    movementRemaining: maxMovement,
    maxMovement,
    combatStrength,
    rangedStrength,
    settlementStrength,
    experience: 0,
    level: 1,
    promotions: [],
    rarity,
    rarityBonuses,
    hasActed: false,
  }
}

// =============================================================================
// Unit Stacking
// =============================================================================

export const MAX_MILITARY_STACK = 2
export const MAX_CIVILIAN_STACK = 1

export interface StackInfo {
  military: Unit[]
  civilian: Unit[]
  total: number
}

/**
 * Gets all units at a given hex position
 */
export function getUnitsAt(state: GameState, coord: HexCoord): Unit[] {
  const key = hexKey(coord)
  const units: Unit[] = []

  for (const unit of state.units.values()) {
    if (hexKey(unit.position) === key) {
      units.push(unit)
    }
  }

  return units
}

/**
 * Gets stack information for a hex
 */
export function getStackInfo(state: GameState, coord: HexCoord): StackInfo {
  const units = getUnitsAt(state, coord)
  const military: Unit[] = []
  const civilian: Unit[] = []

  for (const unit of units) {
    const def = UNIT_DEFINITIONS[unit.type]
    if (def.isCivilian) {
      civilian.push(unit)
    } else {
      military.push(unit)
    }
  }

  return { military, civilian, total: units.length }
}

/**
 * Checks if a unit can be added to a hex (stacking limits)
 */
export function canStackUnit(state: GameState, coord: HexCoord, unit: Unit): boolean {
  const stack = getStackInfo(state, coord)
  const def = UNIT_DEFINITIONS[unit.type]

  if (def.isCivilian) {
    return stack.civilian.length < MAX_CIVILIAN_STACK
  } else {
    return stack.military.length < MAX_MILITARY_STACK
  }
}

/**
 * Checks if a unit would violate stacking with enemy units
 */
export function hasEnemyUnits(state: GameState, coord: HexCoord, owner: TribeId): boolean {
  const units = getUnitsAt(state, coord)
  return units.some((u) => u.owner !== owner)
}

// =============================================================================
// Unit Movement
// =============================================================================

export interface MovementCostOptions {
  state: GameState
  unit: Unit
}

/**
 * Gets the movement cost for a unit to enter a hex
 */
export function getUnitMovementCost(
  state: GameState,
  unit: Unit,
  coord: HexCoord
): number {
  const tile = state.map.tiles.get(hexKey(coord))
  if (!tile) return Infinity

  // Check if tile is passable for this unit
  const terrain = tile.terrain

  // Mountains are impassable
  if (terrain === 'mountain') return Infinity

  // Water is impassable (for now, until naval units)
  if (terrain === 'water') return Infinity

  // Base movement costs
  let cost = 1

  // Terrain modifiers
  switch (terrain) {
    case 'forest':
    case 'jungle':
    case 'marsh':
      cost = 2
      break
    case 'hills':
      cost = 2
      break
  }

  // Check for enemy units (can't move through enemies unless attacking)
  if (hasEnemyUnits(state, coord, unit.owner)) {
    return Infinity // Will be handled by attack action
  }

  // Check stacking limits
  if (!canStackUnit(state, coord, unit)) {
    return Infinity
  }

  return cost
}

/**
 * Gets all hexes a unit can move to with its remaining movement
 */
export function getReachableHexes(state: GameState, unit: Unit): Map<string, number> {
  const reachable = new Map<string, number>()
  const frontier: Array<{ coord: HexCoord; remaining: number }> = [
    { coord: unit.position, remaining: unit.movementRemaining },
  ]

  reachable.set(hexKey(unit.position), unit.movementRemaining)

  while (frontier.length > 0) {
    const current = frontier.shift()!

    for (const neighbor of hexNeighbors(current.coord)) {
      const moveCost = getUnitMovementCost(state, unit, neighbor)
      if (moveCost === Infinity) continue

      const remaining = current.remaining - moveCost
      if (remaining < 0) continue

      const neighborKey = hexKey(neighbor)
      const existingRemaining = reachable.get(neighborKey)

      if (existingRemaining === undefined || remaining > existingRemaining) {
        reachable.set(neighborKey, remaining)
        frontier.push({ coord: neighbor, remaining })
      }
    }
  }

  // Remove starting position
  reachable.delete(hexKey(unit.position))

  return reachable
}

/**
 * Finds a path from a unit's position to a target hex
 */
export function findPath(
  state: GameState,
  unit: Unit,
  target: HexCoord
): HexCoord[] | null {
  return hexPathfind(unit.position, target, {
    cost: (coord) => getUnitMovementCost(state, unit, coord),
    maxCost: unit.movementRemaining,
    isInBounds: (coord) =>
      coord.q >= 0 &&
      coord.q < state.map.width &&
      coord.r >= 0 &&
      coord.r < state.map.height,
  })
}

/**
 * Calculates the movement cost for a path
 */
export function getPathCost(state: GameState, unit: Unit, path: HexCoord[]): number {
  let total = 0

  // Path includes starting position, skip it
  for (let i = 1; i < path.length; i++) {
    const cost = getUnitMovementCost(state, unit, path[i]!)
    if (cost === Infinity) return Infinity
    total += cost
  }

  return total
}

/**
 * Moves a unit along a path, consuming movement points
 * Returns the new unit state
 */
export function moveUnit(unit: Unit, path: HexCoord[], cost: number): Unit {
  if (path.length === 0) return unit

  const destination = path[path.length - 1]!

  return {
    ...unit,
    position: destination,
    movementRemaining: Math.max(0, unit.movementRemaining - cost),
    hasActed: true,
  }
}

// =============================================================================
// Unit State Helpers
// =============================================================================

/**
 * Resets all units' movement at the start of a turn
 */
export function resetUnitMovement(units: Map<UnitId, Unit>): Map<UnitId, Unit> {
  const newUnits = new Map<UnitId, Unit>()

  for (const [id, unit] of units) {
    newUnits.set(id, {
      ...unit,
      movementRemaining: unit.maxMovement,
      hasActed: false,
    })
  }

  return newUnits
}

/**
 * Adds a unit to the game state
 */
export function addUnit(state: GameState, unit: Unit): GameState {
  const newUnits = new Map(state.units)
  newUnits.set(unit.id, unit)

  return {
    ...state,
    units: newUnits,
  }
}

/**
 * Removes a unit from the game state
 */
export function removeUnit(state: GameState, unitId: UnitId): GameState {
  const newUnits = new Map(state.units)
  newUnits.delete(unitId)

  return {
    ...state,
    units: newUnits,
  }
}

/**
 * Updates a unit in the game state
 */
export function updateUnit(state: GameState, unit: Unit): GameState {
  const newUnits = new Map(state.units)
  newUnits.set(unit.id, unit)

  return {
    ...state,
    units: newUnits,
  }
}

/**
 * Gets units belonging to a specific tribe
 */
export function getPlayerUnits(state: GameState, tribeId: TribeId): Unit[] {
  const units: Unit[] = []

  for (const unit of state.units.values()) {
    if (unit.owner === tribeId) {
      units.push(unit)
    }
  }

  return units
}

// =============================================================================
// Stacking Combat Bonuses
// =============================================================================

/**
 * Calculates combat bonus from stacking (2 units = +10% defense)
 */
export function getStackingDefenseBonus(state: GameState, coord: HexCoord): number {
  const stack = getStackInfo(state, coord)

  if (stack.military.length >= 2) {
    return 0.1 // +10% defense
  }

  return 0
}

/**
 * Calculates combat bonus from adjacent friendly units (+5% per adjacent, max +15%)
 */
export function getAdjacentUnitBonus(
  state: GameState,
  coord: HexCoord,
  owner: TribeId
): number {
  let adjacentCount = 0

  for (const neighbor of hexNeighbors(coord)) {
    const units = getUnitsAt(state, neighbor)
    if (units.some((u) => u.owner === owner && !UNIT_DEFINITIONS[u.type].isCivilian)) {
      adjacentCount++
    }
  }

  return Math.min(adjacentCount * 0.05, 0.15) // +5% per adjacent, max +15%
}
