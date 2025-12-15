// Basic AI decision-making for opponent turns

import type { GameState, Unit, HexCoord, GameAction, TribeId } from '../types'
import { hexDistance } from '../hex'
import { getReachableHexes } from '../units'
import { getValidTargets } from '../combat'

/**
 * Generate all actions for an AI player's turn
 * Returns a list of actions to execute in order
 */
export function generateAIActions(state: GameState, tribeId: TribeId): GameAction[] {
  const actions: GameAction[] = []

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
