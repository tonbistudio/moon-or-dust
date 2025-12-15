// Combat system - resolution, damage, terrain modifiers, and zone of control

import type {
  GameState,
  Unit,
  UnitId,
  TribeId,
  HexCoord,
  TerrainType,
} from '../types'
import { hexKey, hexNeighbors, hexDistance } from '../hex'
import {
  UNIT_DEFINITIONS,
  getStackingDefenseBonus,
  getAdjacentUnitBonus,
  getUnitsAt,
  updateUnit,
  removeUnit,
} from '../units'

// =============================================================================
// Combat Constants
// =============================================================================

const BASE_COMBAT_DAMAGE = 30 // Base damage dealt in combat
const XP_PER_COMBAT = 5 // XP gained per combat
const XP_PER_KILL = 10 // Bonus XP for killing a unit
const XP_TO_LEVEL = 10 // XP needed for promotion

// =============================================================================
// Terrain Defense Modifiers
// =============================================================================

const TERRAIN_DEFENSE_BONUS: Record<TerrainType, number> = {
  grassland: 0,
  plains: 0,
  forest: 0.25, // +25% defense in forest
  hills: 0.3, // +30% defense on hills
  mountain: 0, // Units can't be on mountains
  water: 0,
  desert: -0.1, // -10% defense in desert
  jungle: 0.25, // +25% defense in jungle
  marsh: -0.15, // -15% defense in marsh
}

// River crossing penalty: -25% when attacking across river
// TODO: Implement river edge detection in hex system

// Fortification bonus (for units that haven't moved)
const FORTIFICATION_BONUS = 0.1 // +10% defense

// =============================================================================
// Combat Queries
// =============================================================================

/**
 * Checks if a unit can attack another unit
 */
export function canAttack(
  _state: GameState,
  attacker: Unit,
  target: Unit
): { canAttack: boolean; reason?: string } {
  const attackerDef = UNIT_DEFINITIONS[attacker.type]

  // Check if attacker can attack
  if (!attackerDef.canAttack) {
    return { canAttack: false, reason: 'This unit cannot attack' }
  }

  // Check if attacker has acted
  if (attacker.hasActed) {
    return { canAttack: false, reason: 'Unit has already acted this turn' }
  }

  // Check if same owner
  if (attacker.owner === target.owner) {
    return { canAttack: false, reason: 'Cannot attack friendly units' }
  }

  // Check range
  const distance = hexDistance(attacker.position, target.position)
  const isRanged = attackerDef.baseRangedStrength > 0

  if (isRanged) {
    // Ranged units can attack from 2 hexes away
    if (distance > 2) {
      return { canAttack: false, reason: 'Target out of range' }
    }
  } else {
    // Melee units must be adjacent
    if (distance !== 1) {
      return { canAttack: false, reason: 'Must be adjacent to attack' }
    }
  }

  return { canAttack: true }
}

/**
 * Gets all valid attack targets for a unit
 */
export function getValidTargets(state: GameState, attacker: Unit): Unit[] {
  const targets: Unit[] = []
  const attackerDef = UNIT_DEFINITIONS[attacker.type]

  if (!attackerDef.canAttack || attacker.hasActed) {
    return targets
  }

  const isRanged = attackerDef.baseRangedStrength > 0
  const maxRange = isRanged ? 2 : 1

  for (const unit of state.units.values()) {
    if (unit.owner === attacker.owner) continue

    const distance = hexDistance(attacker.position, unit.position)
    if (distance <= maxRange) {
      targets.push(unit)
    }
  }

  return targets
}

// =============================================================================
// Combat Strength Calculation
// =============================================================================

export interface CombatStrengthBreakdown {
  base: number
  rarityBonus: number
  terrainBonus: number
  stackingBonus: number
  adjacencyBonus: number
  fortificationBonus: number
  healthPenalty: number
  promotionBonus: number
  total: number
}

/**
 * Calculates effective combat strength for a unit
 */
export function calculateCombatStrength(
  state: GameState,
  unit: Unit,
  isDefending: boolean
): CombatStrengthBreakdown {
  const def = UNIT_DEFINITIONS[unit.type]
  const tile = state.map.tiles.get(hexKey(unit.position))

  // Base strength (use ranged for ranged attacks, melee for melee)
  const base = isDefending
    ? unit.combatStrength
    : def.baseRangedStrength > 0
      ? unit.rangedStrength
      : unit.combatStrength

  // Rarity bonus is already baked into unit.combatStrength
  const rarityBonus = unit.rarityBonuses.combat

  // Terrain bonus (only for defenders)
  let terrainBonus = 0
  if (isDefending && tile) {
    terrainBonus = Math.floor(base * TERRAIN_DEFENSE_BONUS[tile.terrain])
  }

  // Stacking bonus
  const stackingBonus = isDefending
    ? Math.floor(base * getStackingDefenseBonus(state, unit.position))
    : 0

  // Adjacent friendly unit bonus
  const adjacencyBonus = Math.floor(
    base * getAdjacentUnitBonus(state, unit.position, unit.owner)
  )

  // Fortification bonus (defender who hasn't moved)
  const fortificationBonus =
    isDefending && !unit.hasActed ? Math.floor(base * FORTIFICATION_BONUS) : 0

  // Health penalty (reduced strength when damaged)
  const healthRatio = unit.health / unit.maxHealth
  const healthPenalty = healthRatio < 1 ? Math.floor(base * (1 - healthRatio) * 0.5) : 0

  // Promotion bonuses (calculated from promotions list)
  const promotionBonus = calculatePromotionBonus(unit, isDefending)

  const total = Math.max(
    1,
    base +
      terrainBonus +
      stackingBonus +
      adjacencyBonus +
      fortificationBonus -
      healthPenalty +
      promotionBonus
  )

  return {
    base,
    rarityBonus,
    terrainBonus,
    stackingBonus,
    adjacencyBonus,
    fortificationBonus,
    healthPenalty,
    promotionBonus,
    total,
  }
}

function calculatePromotionBonus(unit: Unit, isDefending: boolean): number {
  let bonus = 0

  for (const promotionId of unit.promotions) {
    // Simplified promotion bonus calculation
    // In full implementation, would look up promotion effects
    if (promotionId.includes('battlecry') && !isDefending) {
      bonus += 2 // Attack bonus
    }
    if (promotionId.includes('defender') && isDefending) {
      bonus += 2 // Defense bonus
    }
  }

  return bonus
}

// =============================================================================
// Combat Resolution
// =============================================================================

export interface CombatResult {
  attacker: Unit
  defender: Unit
  attackerDamage: number
  defenderDamage: number
  attackerKilled: boolean
  defenderKilled: boolean
  attackerXpGained: number
  defenderXpGained: number
}

/**
 * Resolves combat between two units
 * Returns the combat result with updated unit states
 */
export function resolveCombat(
  state: GameState,
  attackerId: UnitId,
  defenderId: UnitId
): CombatResult | null {
  const attacker = state.units.get(attackerId)
  const defender = state.units.get(defenderId)

  if (!attacker || !defender) return null

  const canAttackResult = canAttack(state, attacker, defender)
  if (!canAttackResult.canAttack) return null

  const attackerDef = UNIT_DEFINITIONS[attacker.type]
  const isRanged = attackerDef.baseRangedStrength > 0

  // Calculate combat strengths
  const attackerStrength = calculateCombatStrength(state, attacker, false)
  const defenderStrength = calculateCombatStrength(state, defender, true)

  // Calculate damage
  const strengthRatio = attackerStrength.total / Math.max(1, defenderStrength.total)

  // Damage to defender
  const defenderDamage = Math.floor(BASE_COMBAT_DAMAGE * strengthRatio)

  // Damage to attacker (only for melee combat)
  const attackerDamage = isRanged
    ? 0
    : Math.floor(BASE_COMBAT_DAMAGE / strengthRatio)

  // Apply damage
  const newDefenderHealth = Math.max(0, defender.health - defenderDamage)
  const newAttackerHealth = Math.max(0, attacker.health - attackerDamage)

  const defenderKilled = newDefenderHealth <= 0
  const attackerKilled = newAttackerHealth <= 0

  // Calculate XP
  let attackerXpGained = XP_PER_COMBAT
  let defenderXpGained = XP_PER_COMBAT

  if (defenderKilled) {
    attackerXpGained += XP_PER_KILL
  }
  if (attackerKilled) {
    defenderXpGained += XP_PER_KILL
  }

  // Update units
  const updatedAttacker: Unit = {
    ...attacker,
    health: newAttackerHealth,
    hasActed: true,
    experience: attacker.experience + attackerXpGained,
  }

  const updatedDefender: Unit = {
    ...defender,
    health: newDefenderHealth,
    experience: defender.experience + defenderXpGained,
  }

  return {
    attacker: updatedAttacker,
    defender: updatedDefender,
    attackerDamage,
    defenderDamage,
    attackerKilled,
    defenderKilled,
    attackerXpGained,
    defenderXpGained,
  }
}

/**
 * Applies combat result to game state
 */
export function applyCombatResult(
  state: GameState,
  result: CombatResult
): GameState {
  let newState = state

  // Update or remove attacker
  if (result.attackerKilled) {
    newState = removeUnit(newState, result.attacker.id)
    // Increment kill count for defender's owner
    newState = incrementKillCount(newState, result.defender.owner)
  } else {
    newState = updateUnit(newState, result.attacker)
    // Check for level up
    if (canLevelUp(result.attacker)) {
      // Level up is handled separately (player chooses promotion)
    }
  }

  // Update or remove defender
  if (result.defenderKilled) {
    newState = removeUnit(newState, result.defender.id)
    // Increment kill count for attacker's owner
    newState = incrementKillCount(newState, result.attacker.owner)
  } else {
    newState = updateUnit(newState, result.defender)
  }

  return newState
}

function incrementKillCount(state: GameState, tribeId: TribeId): GameState {
  const newPlayers = state.players.map((p) =>
    p.tribeId === tribeId ? { ...p, killCount: p.killCount + 1 } : p
  )

  return { ...state, players: newPlayers }
}

// =============================================================================
// Zone of Control
// =============================================================================

/**
 * Checks if a hex is in an enemy's zone of control
 * Units in ZoC must stop movement
 */
export function isInZoneOfControl(
  state: GameState,
  coord: HexCoord,
  movingUnitOwner: TribeId
): boolean {
  const neighbors = hexNeighbors(coord)

  for (const neighbor of neighbors) {
    const units = getUnitsAt(state, neighbor)
    for (const unit of units) {
      if (unit.owner !== movingUnitOwner) {
        const def = UNIT_DEFINITIONS[unit.type]
        // Only military units exert ZoC
        if (!def.isCivilian && def.canAttack) {
          return true
        }
      }
    }
  }

  return false
}

/**
 * Gets movement cost modifier for zone of control
 * Entering a ZoC hex costs all remaining movement
 */
export function getZocMovementCost(
  state: GameState,
  unit: Unit,
  targetCoord: HexCoord
): number {
  if (isInZoneOfControl(state, targetCoord, unit.owner)) {
    // Entering ZoC costs all remaining movement
    return unit.movementRemaining
  }
  return 0
}

// =============================================================================
// XP and Level System
// =============================================================================

/**
 * Checks if a unit can level up
 */
export function canLevelUp(unit: Unit): boolean {
  return unit.experience >= unit.level * XP_TO_LEVEL
}

/**
 * Gets XP needed for next level
 */
export function getXpForNextLevel(unit: Unit): number {
  return unit.level * XP_TO_LEVEL
}

/**
 * Levels up a unit with a chosen promotion
 */
export function levelUpUnit(unit: Unit, promotionId: string): Unit {
  if (!canLevelUp(unit)) return unit

  return {
    ...unit,
    level: unit.level + 1,
    promotions: [...unit.promotions, promotionId as never],
    experience: unit.experience - getXpForNextLevel(unit),
  }
}

// =============================================================================
// Healing
// =============================================================================

const HEAL_PER_TURN = 10 // HP healed per turn when not moving
const HEAL_IN_TERRITORY = 15 // HP healed in friendly territory
const HEAL_IN_SETTLEMENT = 20 // HP healed in settlement

/**
 * Calculates healing for a unit at end of turn
 */
export function calculateHealing(
  state: GameState,
  unit: Unit
): number {
  // Units that moved don't heal (unless they have Regeneration promotion)
  if (unit.hasActed && !unit.promotions.includes('regeneration' as never)) {
    return 0
  }

  const tile = state.map.tiles.get(hexKey(unit.position))

  // Check if in settlement
  for (const settlement of state.settlements.values()) {
    if (hexKey(settlement.position) === hexKey(unit.position)) {
      if (settlement.owner === unit.owner) {
        return HEAL_IN_SETTLEMENT
      }
    }
  }

  // Check if in friendly territory
  if (tile?.owner === unit.owner) {
    return HEAL_IN_TERRITORY
  }

  return HEAL_PER_TURN
}

/**
 * Applies healing to a unit
 */
export function healUnit(unit: Unit, amount: number): Unit {
  const newHealth = Math.min(unit.maxHealth, unit.health + amount)
  return {
    ...unit,
    health: newHealth,
  }
}

// =============================================================================
// Combat Preview
// =============================================================================

export interface CombatPreview {
  attackerStrength: CombatStrengthBreakdown
  defenderStrength: CombatStrengthBreakdown
  estimatedAttackerDamage: number
  estimatedDefenderDamage: number
  attackerSurvivalChance: number
  defenderSurvivalChance: number
}

/**
 * Gets a preview of combat outcome (for UI)
 */
export function getCombatPreview(
  state: GameState,
  attacker: Unit,
  defender: Unit
): CombatPreview {
  const attackerStrength = calculateCombatStrength(state, attacker, false)
  const defenderStrength = calculateCombatStrength(state, defender, true)

  const attackerDef = UNIT_DEFINITIONS[attacker.type]
  const isRanged = attackerDef.baseRangedStrength > 0

  const strengthRatio = attackerStrength.total / Math.max(1, defenderStrength.total)

  const estimatedDefenderDamage = Math.floor(BASE_COMBAT_DAMAGE * strengthRatio)
  const estimatedAttackerDamage = isRanged
    ? 0
    : Math.floor(BASE_COMBAT_DAMAGE / strengthRatio)

  // Calculate survival chances
  const attackerSurvivalChance =
    estimatedAttackerDamage >= attacker.health
      ? 0
      : Math.min(100, Math.floor((1 - estimatedAttackerDamage / attacker.health) * 100))

  const defenderSurvivalChance =
    estimatedDefenderDamage >= defender.health
      ? 0
      : Math.min(100, Math.floor((1 - estimatedDefenderDamage / defender.health) * 100))

  return {
    attackerStrength,
    defenderStrength,
    estimatedAttackerDamage,
    estimatedDefenderDamage,
    attackerSurvivalChance,
    defenderSurvivalChance,
  }
}
