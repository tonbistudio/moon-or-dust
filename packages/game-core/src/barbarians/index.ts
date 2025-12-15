// Barbarian system - camp spawning, unit AI, and clearing rewards

import type {
  GameState,
  BarbarianCamp,
  CampId,
  Unit,
  UnitId,
  HexCoord,
  TribeId,
} from '../types'
import { hexKey, hexDistance, hexNeighbors } from '../hex'
import { createUnit, getUnitsAt, addUnit, removeUnit } from '../units'

// =============================================================================
// Constants
// =============================================================================

const SPAWN_COOLDOWN = 3 // Turns between spawns
const ROAM_RADIUS = 5 // Max distance from camp
const CAMP_CLEAR_GOLD = 25 // Gold reward for clearing camp
const CAMP_REVEAL_CHANCE = 0.5 // 50% chance to reveal luxury

// Barbarian tribe ID
export const BARBARIAN_TRIBE_ID = 'barbarians' as TribeId

// =============================================================================
// Camp Management
// =============================================================================

let campIdCounter = 1

function generateCampId(): CampId {
  return `camp_${campIdCounter++}` as CampId
}

export function resetCampIds(): void {
  campIdCounter = 1
}

/**
 * Creates a new barbarian camp
 */
export function createBarbarianCamp(position: HexCoord): BarbarianCamp {
  return {
    id: generateCampId(),
    position,
    spawnCooldown: SPAWN_COOLDOWN,
    unitsSpawned: [],
    destroyed: false,
  }
}

/**
 * Gets all active barbarian camps
 */
export function getActiveCamps(state: GameState): BarbarianCamp[] {
  return state.barbarianCamps.filter((c) => !c.destroyed)
}

/**
 * Gets a camp by ID
 */
export function getCampById(state: GameState, campId: CampId): BarbarianCamp | undefined {
  return state.barbarianCamps.find((c) => c.id === campId)
}

/**
 * Gets camp at a position
 */
export function getCampAt(state: GameState, coord: HexCoord): BarbarianCamp | undefined {
  const key = hexKey(coord)
  return state.barbarianCamps.find(
    (c) => !c.destroyed && hexKey(c.position) === key
  )
}

// =============================================================================
// Unit Spawning
// =============================================================================

/**
 * Processes barbarian spawning for all camps
 */
export function processBarbarianSpawning(state: GameState, rng: () => number): GameState {
  let newState = state
  const updatedCamps: BarbarianCamp[] = []

  for (const camp of state.barbarianCamps) {
    if (camp.destroyed) {
      updatedCamps.push(camp)
      continue
    }

    let updatedCamp = { ...camp }

    // Decrement spawn cooldown
    if (updatedCamp.spawnCooldown > 0) {
      updatedCamp = {
        ...updatedCamp,
        spawnCooldown: updatedCamp.spawnCooldown - 1,
      }
    }

    // Spawn if cooldown reached
    if (updatedCamp.spawnCooldown <= 0) {
      const spawnResult = spawnBarbarianUnit(newState, camp, rng)
      if (spawnResult) {
        newState = spawnResult.state
        updatedCamp = {
          ...updatedCamp,
          spawnCooldown: SPAWN_COOLDOWN,
          unitsSpawned: [...updatedCamp.unitsSpawned, spawnResult.unitId],
        }
      }
    }

    updatedCamps.push(updatedCamp)
  }

  return {
    ...newState,
    barbarianCamps: updatedCamps,
  }
}

/**
 * Spawns a barbarian unit at a camp
 */
function spawnBarbarianUnit(
  state: GameState,
  camp: BarbarianCamp,
  rng: () => number
): { state: GameState; unitId: UnitId } | null {
  // Find valid spawn position (camp or adjacent)
  const spawnPositions = [camp.position, ...hexNeighbors(camp.position)]
  let spawnPosition: HexCoord | null = null

  for (const pos of spawnPositions) {
    // Check if position is valid (on map, not blocked)
    const tile = state.map.tiles.get(hexKey(pos))
    if (!tile) continue
    if (tile.terrain === 'water' || tile.terrain === 'mountain') continue

    // Check if not too many units already there
    const unitsAtPos = getUnitsAt(state, pos)
    if (unitsAtPos.length < 2) {
      spawnPosition = pos
      break
    }
  }

  if (!spawnPosition) return null

  // Decide unit type (70% warrior, 30% scout)
  const unitType = rng() < 0.7 ? 'warrior' : 'scout'

  const unit = createUnit({
    type: unitType as never,
    owner: BARBARIAN_TRIBE_ID,
    position: spawnPosition,
    rarity: 'common', // Barbarians are always common
  })

  const newState = addUnit(state, unit)

  return { state: newState, unitId: unit.id }
}

// =============================================================================
// Barbarian AI
// =============================================================================

/**
 * Processes AI for all barbarian units
 */
export function processBarbarianAI(state: GameState, rng: () => number): GameState {
  let newState = state

  // Get all barbarian units
  const barbarianUnits: Unit[] = []
  for (const unit of state.units.values()) {
    if (unit.owner === BARBARIAN_TRIBE_ID) {
      barbarianUnits.push(unit)
    }
  }

  for (const unit of barbarianUnits) {
    newState = processBarbarianUnitAI(newState, unit, rng)
  }

  return newState
}

/**
 * Processes AI for a single barbarian unit
 */
function processBarbarianUnitAI(
  state: GameState,
  unit: Unit,
  rng: () => number
): GameState {
  // Skip if already acted
  if (unit.hasActed) return state

  // Find nearest enemy unit
  const nearestEnemy = findNearestEnemy(state, unit)

  if (nearestEnemy && hexDistance(unit.position, nearestEnemy.position) === 1) {
    // Adjacent to enemy - attack
    return processBarbarianAttack(state, unit, nearestEnemy)
  }

  // Not adjacent to enemy - try to move toward one or roam
  return processBarbarianMovement(state, unit, nearestEnemy, rng)
}

/**
 * Finds the nearest non-barbarian unit
 */
function findNearestEnemy(state: GameState, barbarianUnit: Unit): Unit | null {
  let nearest: Unit | null = null
  let nearestDist = Infinity

  for (const unit of state.units.values()) {
    if (unit.owner === BARBARIAN_TRIBE_ID) continue

    const dist = hexDistance(barbarianUnit.position, unit.position)
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = unit
    }
  }

  return nearest
}

/**
 * Processes barbarian attack
 */
function processBarbarianAttack(
  state: GameState,
  attacker: Unit,
  defender: Unit
): GameState {
  // Simplified combat for barbarians
  // Import from combat module in real implementation
  const attackerStrength = attacker.combatStrength
  const defenderStrength = defender.combatStrength

  const damage = Math.floor(30 * (attackerStrength / Math.max(1, defenderStrength)))
  const counterDamage = Math.floor(30 * (defenderStrength / Math.max(1, attackerStrength)))

  // Apply damage
  const newDefenderHealth = Math.max(0, defender.health - damage)
  const newAttackerHealth = Math.max(0, attacker.health - counterDamage)

  let newState = state

  // Update attacker
  if (newAttackerHealth <= 0) {
    newState = removeUnit(newState, attacker.id)
  } else {
    const newUnits = new Map(newState.units)
    newUnits.set(attacker.id, {
      ...attacker,
      health: newAttackerHealth,
      hasActed: true,
    })
    newState = { ...newState, units: newUnits }
  }

  // Update defender
  if (newDefenderHealth <= 0) {
    newState = removeUnit(newState, defender.id)
  } else {
    const newUnits = new Map(newState.units)
    newUnits.set(defender.id, {
      ...defender,
      health: newDefenderHealth,
    })
    newState = { ...newState, units: newUnits }
  }

  return newState
}

/**
 * Processes barbarian movement
 */
function processBarbarianMovement(
  state: GameState,
  unit: Unit,
  nearestEnemy: Unit | null,
  rng: () => number
): GameState {
  // Find camp this unit belongs to
  const homeCamp = findHomeCamp(state, unit)

  // Get valid move targets
  const neighbors = hexNeighbors(unit.position)
  const validMoves: HexCoord[] = []

  for (const neighbor of neighbors) {
    const tile = state.map.tiles.get(hexKey(neighbor))
    if (!tile) continue
    if (tile.terrain === 'water' || tile.terrain === 'mountain') continue

    // Check roam radius if has home camp
    if (homeCamp) {
      const distFromCamp = hexDistance(neighbor, homeCamp.position)
      if (distFromCamp > ROAM_RADIUS) continue
    }

    // Check not blocked by friendly units
    const unitsAtPos = getUnitsAt(state, neighbor)
    const friendlyCount = unitsAtPos.filter(
      (u) => u.owner === BARBARIAN_TRIBE_ID
    ).length
    if (friendlyCount >= 2) continue

    validMoves.push(neighbor)
  }

  if (validMoves.length === 0) {
    // Can't move - just mark as acted
    const newUnits = new Map(state.units)
    newUnits.set(unit.id, { ...unit, hasActed: true })
    return { ...state, units: newUnits }
  }

  // Choose move target
  let targetPos: HexCoord

  if (nearestEnemy && hexDistance(unit.position, nearestEnemy.position) <= ROAM_RADIUS) {
    // Move toward enemy
    let bestMove = validMoves[0]!
    let bestDist = hexDistance(bestMove, nearestEnemy.position)

    for (const move of validMoves) {
      const dist = hexDistance(move, nearestEnemy.position)
      if (dist < bestDist) {
        bestDist = dist
        bestMove = move
      }
    }

    targetPos = bestMove
  } else {
    // Random roam
    const index = Math.floor(rng() * validMoves.length)
    targetPos = validMoves[index]!
  }

  // Move unit
  const newUnits = new Map(state.units)
  newUnits.set(unit.id, {
    ...unit,
    position: targetPos,
    movementRemaining: Math.max(0, unit.movementRemaining - 1),
    hasActed: true,
  })

  return { ...state, units: newUnits }
}

/**
 * Finds the camp a barbarian unit belongs to
 */
function findHomeCamp(state: GameState, unit: Unit): BarbarianCamp | null {
  for (const camp of state.barbarianCamps) {
    if (camp.unitsSpawned.includes(unit.id)) {
      return camp
    }
  }
  return null
}

// =============================================================================
// Camp Destruction
// =============================================================================

export interface CampClearResult {
  state: GameState
  goldReward: number
  revealedResource: boolean
}

/**
 * Destroys a barbarian camp and grants rewards
 */
export function destroyCamp(
  state: GameState,
  campId: CampId,
  destroyerTribeId: TribeId,
  rng: () => number
): CampClearResult | null {
  const camp = getCampById(state, campId)
  if (!camp || camp.destroyed) return null

  // Mark camp as destroyed
  const updatedCamps = state.barbarianCamps.map((c) =>
    c.id === campId ? { ...c, destroyed: true } : c
  )

  // Remove any surviving barbarian units from this camp
  let newUnits = new Map(state.units)
  for (const unitId of camp.unitsSpawned) {
    newUnits.delete(unitId)
  }

  // Grant gold reward
  const goldReward = CAMP_CLEAR_GOLD
  const newPlayers = state.players.map((p) =>
    p.tribeId === destroyerTribeId
      ? { ...p, treasury: p.treasury + goldReward }
      : p
  )

  // Chance to reveal nearest luxury resource
  const revealedResource = rng() < CAMP_REVEAL_CHANCE
  let newTiles = state.map.tiles

  if (revealedResource) {
    newTiles = revealNearestLuxury(state, camp.position)
  }

  return {
    state: {
      ...state,
      barbarianCamps: updatedCamps,
      units: newUnits,
      players: newPlayers,
      map: {
        ...state.map,
        tiles: newTiles,
      },
    },
    goldReward,
    revealedResource,
  }
}

/**
 * Reveals the nearest unrevealed luxury resource
 */
function revealNearestLuxury(
  state: GameState,
  fromPosition: HexCoord
): ReadonlyMap<string, import('../types').Tile> {
  const luxuryTypes = ['gems', 'marble', 'whitelists', 'rpcs']
  let nearestKey: string | null = null
  let nearestDist = Infinity

  for (const [key, tile] of state.map.tiles) {
    if (!tile.resource) continue
    if (tile.resource.revealed) continue
    if (!luxuryTypes.includes(tile.resource.type)) continue

    const dist = hexDistance(fromPosition, tile.coord)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestKey = key
    }
  }

  if (!nearestKey) return state.map.tiles

  const newTiles = new Map(state.map.tiles)
  const tile = newTiles.get(nearestKey)!
  newTiles.set(nearestKey, {
    ...tile,
    resource: {
      ...tile.resource!,
      revealed: true,
    },
  })

  return newTiles
}

/**
 * Checks if a camp should be destroyed (no defending units)
 */
export function checkCampDestruction(
  state: GameState,
  coord: HexCoord
): CampId | null {
  const camp = getCampAt(state, coord)
  if (!camp) return null

  // Check if any units at camp position
  const unitsAtCamp = getUnitsAt(state, coord)
  const barbarianUnits = unitsAtCamp.filter(
    (u) => u.owner === BARBARIAN_TRIBE_ID
  )

  // Camp is destroyed if enemy unit is there and no barbarian defenders
  const enemyUnits = unitsAtCamp.filter((u) => u.owner !== BARBARIAN_TRIBE_ID)

  if (enemyUnits.length > 0 && barbarianUnits.length === 0) {
    return camp.id
  }

  return null
}

// =============================================================================
// Barbarian Queries
// =============================================================================

/**
 * Gets all barbarian units
 */
export function getBarbarianUnits(state: GameState): Unit[] {
  const units: Unit[] = []
  for (const unit of state.units.values()) {
    if (unit.owner === BARBARIAN_TRIBE_ID) {
      units.push(unit)
    }
  }
  return units
}

/**
 * Checks if a unit is a barbarian
 */
export function isBarbarian(unit: Unit): boolean {
  return unit.owner === BARBARIAN_TRIBE_ID
}

/**
 * Gets total barbarian count
 */
export function getBarbarianCount(state: GameState): number {
  return getBarbarianUnits(state).length
}
