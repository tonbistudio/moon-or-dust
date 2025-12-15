// Basic AI decision-making for opponent turns

import type { GameState, Unit, HexCoord, GameAction, TribeId } from '../types'
import { hexDistance } from '../hex'
import { getReachableHexes } from '../units'
import { getValidTargets } from '../combat'
import {
  getStance,
  getEnemies,
  getAllies,
  getFriendlyTribes,
  getWarWeariness,
  canDeclareWar,
  canProposePeace,
  canProposeAlliance,
} from '../diplomacy'

// =============================================================================
// AI Configuration
// =============================================================================

/** War weariness threshold where AI considers peace */
const HIGH_WAR_WEARINESS = 30

/** Military strength ratio to consider declaring war (AI vs target) */
const WAR_STRENGTH_RATIO = 1.5

/** Military strength ratio to seek peace (target vs AI) */
const PEACE_STRENGTH_RATIO = 1.3

// =============================================================================
// Military Strength Calculation
// =============================================================================

/**
 * Calculate total military strength for a tribe
 */
function calculateMilitaryStrength(state: GameState, tribeId: TribeId): number {
  let strength = 0

  for (const unit of state.units.values()) {
    if (unit.owner === tribeId && !isCivilianUnit(unit.type)) {
      // Base strength + health percentage
      const healthFactor = unit.health / unit.maxHealth
      const combatPower = Math.max(unit.combatStrength, unit.rangedStrength)
      strength += combatPower * healthFactor

      // Bonus for promotions
      strength += unit.promotions.length * 0.5
    }
  }

  return strength
}

/**
 * Check if unit type is civilian (non-combat)
 */
function isCivilianUnit(type: string): boolean {
  return type === 'settler' || type === 'builder' || type === 'great_person'
}

// =============================================================================
// Diplomacy AI Decisions
// =============================================================================

/**
 * Generate diplomacy actions for an AI turn
 */
function generateDiplomacyActions(state: GameState, tribeId: TribeId): GameAction[] {
  const actions: GameAction[] = []
  const aiStrength = calculateMilitaryStrength(state, tribeId)

  // Check each other player for diplomacy opportunities
  for (const player of state.players) {
    if (player.tribeId === tribeId) continue

    const targetId = player.tribeId
    const stance = getStance(state, tribeId, targetId)
    const targetStrength = calculateMilitaryStrength(state, targetId)

    // Consider peace if at war
    if (stance === 'war') {
      const peaceAction = considerPeace(state, tribeId, targetId, aiStrength, targetStrength)
      if (peaceAction) {
        actions.push(peaceAction)
        continue
      }
    }

    // Consider war if not already at war
    if (stance !== 'war') {
      const warAction = considerWar(state, tribeId, targetId, aiStrength, targetStrength)
      if (warAction) {
        actions.push(warAction)
        continue
      }
    }

    // Consider alliance if friendly
    if (stance === 'friendly') {
      const allianceAction = considerAlliance(state, tribeId, targetId)
      if (allianceAction) {
        actions.push(allianceAction)
      }
    }
  }

  return actions
}

/**
 * Evaluate whether to propose peace
 */
function considerPeace(
  state: GameState,
  tribeId: TribeId,
  targetId: TribeId,
  aiStrength: number,
  targetStrength: number
): GameAction | null {
  const result = canProposePeace(state, tribeId, targetId)
  if (!result.canPropose) return null

  const warWeariness = getWarWeariness(state, tribeId)

  // Seek peace if:
  // 1. War weariness is high
  // 2. Enemy is significantly stronger
  // 3. We have no units left
  const wearinessHigh = warWeariness >= HIGH_WAR_WEARINESS
  const enemyStronger = targetStrength > aiStrength * PEACE_STRENGTH_RATIO
  const noMilitary = aiStrength === 0

  if (wearinessHigh || enemyStronger || noMilitary) {
    return {
      type: 'PROPOSE_PEACE',
      target: targetId,
    }
  }

  return null
}

/**
 * Evaluate whether to declare war
 */
function considerWar(
  state: GameState,
  tribeId: TribeId,
  targetId: TribeId,
  aiStrength: number,
  targetStrength: number
): GameAction | null {
  const result = canDeclareWar(state, tribeId, targetId)
  if (!result.canDeclare) return null

  const stance = getStance(state, tribeId, targetId)

  // Don't break alliances or friendships lightly
  if (stance === 'allied') return null
  if (stance === 'friendly') {
    // Only attack friendly if we have overwhelming force
    if (aiStrength < targetStrength * 2) return null
  }

  // Already have enemies? Don't start more wars
  const currentEnemies = getEnemies(state, tribeId)
  if (currentEnemies.length >= 2) return null

  // Check war weariness - don't start wars if already war-weary
  const warWeariness = getWarWeariness(state, tribeId)
  if (warWeariness >= HIGH_WAR_WEARINESS * 0.7) return null

  // Only declare war if we have significant military advantage
  if (aiStrength > targetStrength * WAR_STRENGTH_RATIO && aiStrength > 0) {
    // Also consider if target has settlements we want
    const targetSettlements = Array.from(state.settlements.values()).filter(
      (s) => s.owner === targetId
    )

    if (targetSettlements.length > 0) {
      return {
        type: 'DECLARE_WAR',
        target: targetId,
      }
    }
  }

  return null
}

/**
 * Evaluate whether to propose alliance
 */
function considerAlliance(
  state: GameState,
  tribeId: TribeId,
  targetId: TribeId
): GameAction | null {
  const result = canProposeAlliance(state, tribeId, targetId)
  if (!result.canPropose) return null

  // Already have allies? Be more selective
  const currentAllies = getAllies(state, tribeId)
  if (currentAllies.length >= 2) return null

  // Check if we share common enemies
  const ourEnemies = getEnemies(state, tribeId)
  const theirEnemies = getEnemies(state, targetId)
  const sharedEnemies = ourEnemies.filter((e) => theirEnemies.includes(e))

  // More likely to ally if we share enemies
  if (sharedEnemies.length > 0) {
    return {
      type: 'PROPOSE_ALLIANCE',
      target: targetId,
    }
  }

  // Also ally if we have no enemies and they're the strongest potential ally
  if (ourEnemies.length === 0) {
    const targetStrength = calculateMilitaryStrength(state, targetId)
    const friendlyTribes = getFriendlyTribes(state, tribeId)

    // Check if target is the strongest friendly tribe
    let isStrongest = true
    for (const friendId of friendlyTribes) {
      if (friendId !== targetId) {
        const friendStrength = calculateMilitaryStrength(state, friendId)
        if (friendStrength > targetStrength) {
          isStrongest = false
          break
        }
      }
    }

    if (isStrongest && targetStrength > 0) {
      return {
        type: 'PROPOSE_ALLIANCE',
        target: targetId,
      }
    }
  }

  return null
}

// =============================================================================
// Main AI Action Generation
// =============================================================================

/**
 * Generate all actions for an AI player's turn
 * Returns a list of actions to execute in order
 */
export function generateAIActions(state: GameState, tribeId: TribeId): GameAction[] {
  const actions: GameAction[] = []

  // First, handle diplomacy decisions (before military actions)
  const diplomacyActions = generateDiplomacyActions(state, tribeId)
  actions.push(...diplomacyActions)

  // Get all units owned by this AI
  const aiUnits = Array.from(state.units.values()).filter(
    (unit) => unit.owner === tribeId && !unit.hasActed
  )

  for (const unit of aiUnits) {
    // First, try to attack any enemies in range
    const attackAction = generateAttackAction(state, unit)
    if (attackAction) {
      actions.push(attackAction)
      continue
    }

    // Otherwise, try to move toward nearest enemy
    const moveAction = generateMoveAction(state, unit)
    if (moveAction) {
      actions.push(moveAction)
    }
  }

  // Always end turn
  actions.push({ type: 'END_TURN' })

  return actions
}

/**
 * Generate an attack action if there's a valid target
 */
function generateAttackAction(state: GameState, unit: Unit): GameAction | null {
  const targets = getValidTargets(state, unit)

  if (targets.length === 0) {
    return null
  }

  // Prioritize weakest target (most likely to kill)
  const sortedTargets = targets.sort((a, b) => a.health - b.health)
  const target = sortedTargets[0]!

  return {
    type: 'ATTACK',
    attackerId: unit.id,
    targetId: target.id,
  }
}

/**
 * Generate a move action toward the nearest enemy or unexplored area
 */
function generateMoveAction(state: GameState, unit: Unit): GameAction | null {
  if (unit.movementRemaining <= 0) {
    return null
  }

  // Get reachable hexes
  const reachable = getReachableHexes(state, unit)
  if (reachable.size === 0) {
    return null
  }

  // Find nearest enemy unit
  const enemies = Array.from(state.units.values()).filter(
    (u) => u.owner !== unit.owner
  )

  if (enemies.length === 0) {
    // No enemies, stay put
    return null
  }

  // Find the closest enemy
  let closestEnemy: Unit | null = null
  let closestDistance = Infinity

  for (const enemy of enemies) {
    const distance = hexDistance(unit.position, enemy.position)
    if (distance < closestDistance) {
      closestDistance = distance
      closestEnemy = enemy
    }
  }

  if (!closestEnemy) {
    return null
  }

  // Find the reachable hex that gets us closest to the enemy
  let bestHex: HexCoord | null = null
  let bestDistance = Infinity

  for (const [key] of reachable) {
    const [q, r] = key.split(',').map(Number)
    const hex: HexCoord = { q: q!, r: r! }
    const distToEnemy = hexDistance(hex, closestEnemy.position)

    // Don't move onto the enemy hex
    if (distToEnemy === 0) continue

    if (distToEnemy < bestDistance) {
      bestDistance = distToEnemy
      bestHex = hex
    }
  }

  if (!bestHex) {
    return null
  }

  // Only move if it gets us closer
  const currentDist = hexDistance(unit.position, closestEnemy.position)
  if (bestDistance >= currentDist) {
    return null
  }

  return {
    type: 'MOVE_UNIT',
    unitId: unit.id,
    to: bestHex,
  }
}

/**
 * Execute a single AI action and return the new state
 * This is a convenience wrapper for integrating with the action system
 */
export function executeAITurn(
  state: GameState,
  applyAction: (state: GameState, action: GameAction) => { success: boolean; state?: GameState }
): GameState {
  const currentPlayer = state.players.find((p) => p.tribeId === state.currentPlayer)

  // Only run AI for non-human players
  if (!currentPlayer || currentPlayer.isHuman) {
    return state
  }

  const actions = generateAIActions(state, state.currentPlayer)
  let currentState = state

  for (const action of actions) {
    const result = applyAction(currentState, action)
    if (result.success && result.state) {
      currentState = result.state
    }

    // Stop if we hit END_TURN
    if (action.type === 'END_TURN') {
      break
    }
  }

  return currentState
}
