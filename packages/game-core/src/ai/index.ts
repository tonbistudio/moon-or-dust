// AI decision-making for opponent turns
// Comprehensive AI system with personality-driven decisions

import type {
  GameState,
  Unit,
  HexCoord,
  GameAction,
  TribeId,
  TribeName,
  SettlementId,
  Player,
  Tech,
  Culture,
  ImprovementType,
  Tile,
} from '../types'
import { hexDistance, hexNeighbors, hexKey } from '../hex'
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
import { getTribeById } from '../tribes'
import {
  getAvailableWonders,
  canBuildWonder,
  isWonderInProgress,
  type WonderDefinition,
} from '../wonders'
import {
  getValidImprovements,
  getBestImprovementForResource,
} from '../improvements'
import { getAvailableTechs, hasResearched } from '../tech'
import { getAvailableCultures, hasUnlockedCulture } from '../cultures'
import { getUnclaimedLootboxes } from '../lootbox'
import { canFoundSettlement, getPlayerSettlements } from '../settlements'
import {
  hasTradeUnlocked,
  getTradeRouteCapacity,
  getPlayerTradeRoutes,
  getAvailableTradeDestinations,
  canCreateTradeRoute,
} from '../economy'

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
// Tribe Personality System
// =============================================================================

/**
 * AI personality modifiers based on tribe characteristics
 */
export interface TribePersonality {
  /** Multiplier for war declaration likelihood (higher = more aggressive) */
  readonly aggressionMultiplier: number
  /** Multiplier for peace-seeking likelihood (higher = more peaceful) */
  readonly peacefulnessMultiplier: number
  /** Multiplier for alliance formation likelihood (higher = more diplomatic) */
  readonly allianceMultiplier: number
  /** Modifier to war strength ratio requirement (lower = more willing to attack) */
  readonly warStrengthRatioModifier: number
  /** Modifier to peace strength ratio (lower = holds out longer) */
  readonly peaceStrengthRatioModifier: number
  /** Target prioritization preference */
  readonly targetPriority: 'weakest' | 'strongest' | 'closest'
  /** War weariness tolerance (higher = tolerates more war weariness) */
  readonly warWearinessTolerance: number
}

/**
 * Default personality for balanced tribes
 */
const DEFAULT_PERSONALITY: TribePersonality = {
  aggressionMultiplier: 1.0,
  peacefulnessMultiplier: 1.0,
  allianceMultiplier: 1.0,
  warStrengthRatioModifier: 0,
  peaceStrengthRatioModifier: 0,
  targetPriority: 'weakest',
  warWearinessTolerance: 1.0,
}

/**
 * Tribe-specific AI personalities based on primary/secondary strengths
 */
const TRIBE_PERSONALITIES: Record<TribeName, TribePersonality> = {
  // Monkes: Vibes (primary), Economy (secondary)
  // Diplomatic, trade-focused, prefer alliances over war
  monkes: {
    aggressionMultiplier: 0.6,      // Less likely to start wars
    peacefulnessMultiplier: 1.4,    // More likely to seek peace
    allianceMultiplier: 1.5,        // Eager to form alliances
    warStrengthRatioModifier: 0.3,  // Need bigger advantage to attack
    peaceStrengthRatioModifier: -0.2, // Seek peace earlier
    targetPriority: 'weakest',      // Pick easy targets when forced to fight
    warWearinessTolerance: 0.7,     // Low tolerance for prolonged war
  },

  // Geckos: Tech (primary), Military (secondary)
  // Cautious, research-focused, but capable fighters
  geckos: {
    aggressionMultiplier: 0.8,      // Moderately less aggressive
    peacefulnessMultiplier: 1.1,    // Slightly prefer peace
    allianceMultiplier: 1.2,        // Prefer alliances
    warStrengthRatioModifier: 0.1,  // Slightly more cautious
    peaceStrengthRatioModifier: 0,  // Standard peace calculations
    targetPriority: 'weakest',      // Efficient target selection
    warWearinessTolerance: 1.0,     // Standard tolerance
  },

  // DeGods: Military (primary), Economy (secondary)
  // Aggressive, war-focused, seeks conquest
  degods: {
    aggressionMultiplier: 1.5,      // Very likely to start wars
    peacefulnessMultiplier: 0.6,    // Reluctant to seek peace
    allianceMultiplier: 0.7,        // Prefer independence
    warStrengthRatioModifier: -0.3, // Attack with less advantage
    peaceStrengthRatioModifier: 0.3, // Hold out longer in losing wars
    targetPriority: 'strongest',    // Go for the biggest threat
    warWearinessTolerance: 1.5,     // High tolerance for war
  },

  // Cets: Vibes (primary), Production (secondary)
  // Diplomatic, builder-focused, defensive
  cets: {
    aggressionMultiplier: 0.5,      // Very unlikely to start wars
    peacefulnessMultiplier: 1.3,    // Prefer peace
    allianceMultiplier: 1.4,        // Like alliances
    warStrengthRatioModifier: 0.4,  // Very cautious about attacking
    peaceStrengthRatioModifier: -0.1, // Seek peace sooner
    targetPriority: 'closest',      // Defensive - deal with nearby threats
    warWearinessTolerance: 0.8,     // Lower tolerance
  },

  // Gregs: Coming soon - balanced
  gregs: { ...DEFAULT_PERSONALITY },

  // Dragonz: Coming soon - balanced
  dragonz: { ...DEFAULT_PERSONALITY },
}

/**
 * Get the AI personality for a tribe
 */
export function getTribePersonality(tribeId: TribeId): TribePersonality {
  const tribe = getTribeById(tribeId)
  if (!tribe) return DEFAULT_PERSONALITY
  return TRIBE_PERSONALITIES[tribe.name] ?? DEFAULT_PERSONALITY
}

// =============================================================================
// Military Strength Calculation (with caching)
// =============================================================================

// Cache for military strength calculations (cleared each turn)
let militaryStrengthCache: Map<TribeId, number> = new Map()
let militaryStrengthCacheTurn = -1

/**
 * Clear the military strength cache (called when turn changes)
 */
function clearMilitaryStrengthCache(turn: number): void {
  if (turn !== militaryStrengthCacheTurn) {
    militaryStrengthCache = new Map()
    militaryStrengthCacheTurn = turn
  }
}

/**
 * Calculate total military strength for a tribe (with caching)
 */
function calculateMilitaryStrength(state: GameState, tribeId: TribeId): number {
  // Clear cache if turn changed
  clearMilitaryStrengthCache(state.turn)

  // Check cache first
  const cached = militaryStrengthCache.get(tribeId)
  if (cached !== undefined) {
    return cached
  }

  // Calculate strength
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

  // Cache the result
  militaryStrengthCache.set(tribeId, strength)

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
  const personality = getTribePersonality(tribeId)

  // Check each other player for diplomacy opportunities
  for (const player of state.players) {
    if (player.tribeId === tribeId) continue

    const targetId = player.tribeId
    const stance = getStance(state, tribeId, targetId)
    const targetStrength = calculateMilitaryStrength(state, targetId)

    // Consider peace if at war
    if (stance === 'war') {
      const peaceAction = considerPeace(state, tribeId, targetId, aiStrength, targetStrength, personality)
      if (peaceAction) {
        actions.push(peaceAction)
        continue
      }
    }

    // Consider war if not already at war
    if (stance !== 'war') {
      const warAction = considerWar(state, tribeId, targetId, aiStrength, targetStrength, personality)
      if (warAction) {
        actions.push(warAction)
        continue
      }
    }

    // Consider alliance if friendly
    if (stance === 'friendly') {
      const allianceAction = considerAlliance(state, tribeId, targetId, personality)
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
  targetStrength: number,
  personality: TribePersonality
): GameAction | null {
  const result = canProposePeace(state, tribeId, targetId)
  if (!result.canPropose) return null

  const warWeariness = getWarWeariness(state, tribeId)

  // Adjust thresholds based on personality
  const adjustedWearinessThreshold = HIGH_WAR_WEARINESS * personality.warWearinessTolerance
  const adjustedPeaceRatio = PEACE_STRENGTH_RATIO + personality.peaceStrengthRatioModifier

  // Seek peace if:
  // 1. War weariness is high (adjusted for personality)
  // 2. Enemy is significantly stronger (adjusted for personality)
  // 3. We have no units left
  const wearinessHigh = warWeariness >= adjustedWearinessThreshold
  const enemyStronger = targetStrength > aiStrength * adjustedPeaceRatio
  const noMilitary = aiStrength === 0

  // Peaceful tribes are more likely to seek peace even in marginal situations
  const marginalSituation = targetStrength > aiStrength * (adjustedPeaceRatio * 0.8)
  const peacefulDisposition = marginalSituation && Math.random() < (personality.peacefulnessMultiplier - 1) * 0.5

  if (wearinessHigh || enemyStronger || noMilitary || peacefulDisposition) {
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
  targetStrength: number,
  personality: TribePersonality
): GameAction | null {
  const result = canDeclareWar(state, tribeId, targetId)
  if (!result.canDeclare) return null

  const stance = getStance(state, tribeId, targetId)

  // Don't break alliances or friendships lightly
  if (stance === 'allied') return null
  if (stance === 'friendly') {
    // Aggressive tribes need less overwhelming force, peaceful tribes won't attack friends
    const friendlyAttackThreshold = 2 + (1 - personality.aggressionMultiplier)
    if (aiStrength < targetStrength * friendlyAttackThreshold) return null
  }

  // Already have enemies? Aggressive tribes can handle more wars
  const currentEnemies = getEnemies(state, tribeId)
  const maxEnemies = personality.aggressionMultiplier >= 1.3 ? 3 : 2
  if (currentEnemies.length >= maxEnemies) return null

  // Check war weariness - adjusted for personality
  const warWeariness = getWarWeariness(state, tribeId)
  const wearinessThreshold = HIGH_WAR_WEARINESS * 0.7 * personality.warWearinessTolerance
  if (warWeariness >= wearinessThreshold) return null

  // Adjust war strength ratio based on personality
  const adjustedWarRatio = WAR_STRENGTH_RATIO + personality.warStrengthRatioModifier

  // Only declare war if we have significant military advantage (adjusted for personality)
  if (aiStrength > targetStrength * adjustedWarRatio && aiStrength > 0) {
    // Also consider if target has settlements we want
    const targetSettlements = Array.from(state.settlements.values()).filter(
      (s) => s.owner === targetId
    )

    if (targetSettlements.length > 0) {
      // Aggressive tribes are more likely to pull the trigger
      const aggressionCheck = Math.random() < personality.aggressionMultiplier
      if (aggressionCheck) {
        return {
          type: 'DECLARE_WAR',
          target: targetId,
        }
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
  targetId: TribeId,
  personality: TribePersonality
): GameAction | null {
  const result = canProposeAlliance(state, tribeId, targetId)
  if (!result.canPropose) return null

  // Diplomatic tribes can have more allies
  const currentAllies = getAllies(state, tribeId)
  const maxAllies = personality.allianceMultiplier >= 1.3 ? 3 : 2
  if (currentAllies.length >= maxAllies) return null

  // Check if we share common enemies
  const ourEnemies = getEnemies(state, tribeId)
  const theirEnemies = getEnemies(state, targetId)
  const sharedEnemies = ourEnemies.filter((e) => theirEnemies.includes(e))

  // More likely to ally if we share enemies
  if (sharedEnemies.length > 0) {
    // Apply alliance multiplier - diplomatic tribes almost always accept
    const allianceCheck = Math.random() < personality.allianceMultiplier
    if (allianceCheck) {
      return {
        type: 'PROPOSE_ALLIANCE',
        target: targetId,
      }
    }
  }

  // Diplomatic tribes are more proactive about forming alliances even without shared enemies
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

    // Diplomatic tribes don't need the target to be strongest
    const strengthRequirement = personality.allianceMultiplier >= 1.3 ? false : !isStrongest
    if (!strengthRequirement && targetStrength > 0) {
      // Apply alliance multiplier
      const allianceCheck = Math.random() < personality.allianceMultiplier * 0.7
      if (allianceCheck) {
        return {
          type: 'PROPOSE_ALLIANCE',
          target: targetId,
        }
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
 *
 * Decision Priority:
 * 1. Diplomacy (war/peace/alliance decisions)
 * 2. Research (start new tech if not researching)
 * 3. Culture (start new culture if not working on one)
 * 4. Production (wonders, units, buildings)
 * 5. Unit actions (settlers, military, scouts)
 */
export function generateAIActions(state: GameState, tribeId: TribeId): GameAction[] {
  const actions: GameAction[] = []
  const personality = getTribePersonality(tribeId)

  // =========================================================================
  // Phase 1: Strategic Decisions
  // =========================================================================

  // Diplomacy decisions (before military actions)
  const diplomacyActions = generateDiplomacyActions(state, tribeId)
  actions.push(...diplomacyActions)

  // Research decision
  const researchAction = generateResearchAction(state, tribeId)
  if (researchAction) {
    actions.push(researchAction)
  }

  // Culture decision
  const cultureAction = generateCultureAction(state, tribeId)
  if (cultureAction) {
    actions.push(cultureAction)
  }

  // =========================================================================
  // Phase 2: Production Decisions
  // =========================================================================

  // Consider starting wonder production
  const wonderAction = generateWonderAction(state, tribeId)
  if (wonderAction) {
    actions.push(wonderAction)
  }

  // =========================================================================
  // Phase 3: Unit Actions
  // =========================================================================

  // Get all units owned by this AI
  const aiUnits = Array.from(state.units.values()).filter(
    (unit) => unit.owner === tribeId && !unit.hasActed
  )

  // Process units by priority:
  // 1. Settlers (expansion is important)
  // 2. Military units (combat/defense)
  // 3. Scouts (exploration/lootbox hunting)
  // 4. Builders (improvements)

  const settlers = aiUnits.filter(u => u.type === 'settler')
  const military = aiUnits.filter(u => !isCivilianUnit(u.type))
  const scouts = aiUnits.filter(u => u.type === 'scout')
  const builders = aiUnits.filter(u => u.type === 'builder')

  // Process settlers first
  for (const settler of settlers) {
    if (settler.hasActed) continue
    const action = generateSettlerAction(state, settler)
    if (action) {
      actions.push(action)
    }
  }

  // Process military units
  for (const unit of military) {
    if (unit.hasActed) continue

    // First priority: attack enemies in range
    const attackAction = generateAttackAction(state, unit, personality)
    if (attackAction) {
      actions.push(attackAction)
      continue
    }

    // Second priority: move toward enemies
    const moveAction = generateMoveAction(state, unit)
    if (moveAction) {
      actions.push(moveAction)
    }
  }

  // Process scouts
  for (const scout of scouts) {
    if (scout.hasActed) continue

    // Priority: hunt lootboxes
    const lootboxAction = generateLootboxHuntAction(state, scout)
    if (lootboxAction) {
      actions.push(lootboxAction)
      continue
    }

    // Fallback: explore (move toward unexplored areas)
    const exploreAction = generateExploreAction(state, scout)
    if (exploreAction) {
      actions.push(exploreAction)
    }
  }

  // Process builders - find and build improvements
  for (const builder of builders) {
    if (builder.hasActed) continue

    const builderAction = generateBuilderAction(state, builder)
    if (builderAction) {
      actions.push(builderAction)
    }
  }

  // =========================================================================
  // Phase 4: Trade Route Decisions
  // =========================================================================

  const tradeAction = generateTradeRouteAction(state, tribeId)
  if (tradeAction) {
    actions.push(tradeAction)
  }

  // Always end turn
  actions.push({ type: 'END_TURN' })

  return actions
}

/**
 * Generate exploration move action for scouts
 */
function generateExploreAction(
  state: GameState,
  unit: Unit
): GameAction | null {
  if (unit.movementRemaining <= 0) return null

  const reachable = getReachableHexes(state, unit)
  const fog = state.fog.get(unit.owner)

  if (!fog || reachable.size === 0) return null

  // Find reachable hex that reveals the most new tiles
  let bestHex: HexCoord | null = null
  let bestNewTiles = 0

  for (const [key] of reachable) {
    const [q, r] = key.split(',').map(Number)
    const coord: HexCoord = { q: q!, r: r! }

    // Count new tiles that would be revealed from this position
    // (assuming 2-tile vision radius)
    const neighbors = hexNeighbors(coord)
    let newTiles = 0

    // Check if current position is new
    if (!fog.has(key)) newTiles++

    // Check neighbors
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.q},${neighbor.r}`
      if (!fog.has(neighborKey)) newTiles++

      // Check neighbors of neighbors (vision 2)
      const nn = hexNeighbors(neighbor)
      for (const nn2 of nn) {
        const nn2Key = `${nn2.q},${nn2.r}`
        if (!fog.has(nn2Key)) newTiles += 0.5 // Partial weight for outer ring
      }
    }

    if (newTiles > bestNewTiles) {
      bestNewTiles = newTiles
      bestHex = coord
    }
  }

  if (bestHex && bestNewTiles > 0) {
    return {
      type: 'MOVE_UNIT',
      unitId: unit.id,
      to: bestHex,
    }
  }

  return null
}

/**
 * Generate an attack action if there's a valid target
 */
function generateAttackAction(state: GameState, unit: Unit, personality: TribePersonality): GameAction | null {
  const targets = getValidTargets(state, unit)

  if (targets.length === 0) {
    return null
  }

  // Sort targets based on personality's target priority
  let sortedTargets: Unit[]
  switch (personality.targetPriority) {
    case 'strongest':
      // Aggressive tribes go for the biggest threat first
      sortedTargets = targets.sort((a, b) => {
        const aStrength = Math.max(a.combatStrength, a.rangedStrength)
        const bStrength = Math.max(b.combatStrength, b.rangedStrength)
        return bStrength - aStrength
      })
      break
    case 'closest':
      // Defensive tribes prioritize nearby threats
      sortedTargets = targets.sort((a, b) => {
        const aDist = hexDistance(unit.position, a.position)
        const bDist = hexDistance(unit.position, b.position)
        return aDist - bDist
      })
      break
    case 'weakest':
    default:
      // Default: prioritize weakest target (most likely to kill)
      sortedTargets = targets.sort((a, b) => a.health - b.health)
      break
  }

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

// =============================================================================
// Wonder AI - Prioritization and Selection
// =============================================================================

/**
 * Wonder priority scores based on tribe personality strengths
 */
const WONDER_CATEGORY_PRIORITIES: Record<TribeName, Record<string, number>> = {
  // Monkes: Vibes (primary), Economy (secondary)
  monkes: {
    vibes: 1.5,
    economy: 1.3,
    tech: 1.0,
    production: 0.9,
    military: 0.7,
  },
  // Geckos: Tech (primary), Military (secondary)
  geckos: {
    tech: 1.5,
    military: 1.2,
    production: 1.1,
    economy: 1.0,
    vibes: 0.8,
  },
  // DeGods: Military (primary), Economy (secondary)
  degods: {
    military: 1.5,
    economy: 1.3,
    production: 1.0,
    tech: 0.9,
    vibes: 0.7,
  },
  // Cets: Vibes (primary), Production (secondary)
  cets: {
    vibes: 1.4,
    production: 1.4,
    tech: 1.0,
    economy: 0.9,
    military: 0.7,
  },
  // Coming soon tribes - balanced
  gregs: { vibes: 1.0, economy: 1.0, tech: 1.0, production: 1.0, military: 1.0 },
  dragonz: { vibes: 1.0, economy: 1.0, tech: 1.0, production: 1.0, military: 1.0 },
}

/**
 * Score a wonder for AI prioritization
 */
function scoreWonderForAI(
  state: GameState,
  tribeId: TribeId,
  wonder: WonderDefinition,
  personality: TribePersonality
): number {
  const tribe = getTribeById(tribeId)
  if (!tribe) return 0

  let score = 0

  // Base score from floor price bonus (normalized by era)
  score += wonder.floorPriceBonus / 25 // Era 1 = 1, Era 2 = 2, Era 3 = 3

  // Category priority based on tribe
  const categoryPriorities = WONDER_CATEGORY_PRIORITIES[tribe.name]
  const categoryBonus = categoryPriorities[wonder.category] || 1.0
  score *= categoryBonus

  // Effect-specific bonuses based on game state
  const enemies = getEnemies(state, tribeId)
  const isAtWar = enemies.length > 0

  switch (wonder.effect.type) {
    case 'combat_strength':
    case 'unit_healing':
      // Military wonders more valuable when at war or for aggressive tribes
      if (isAtWar) score *= 1.5
      score *= personality.aggressionMultiplier
      break

    case 'research_speed':
      // Tech wonders always good for tech-focused tribes
      if (tribe.primaryStrength === 'tech') score *= 1.3
      break

    case 'production_speed':
    case 'forest_production':
      // Production wonders great for builder tribes
      if (tribe.primaryStrength === 'production' || tribe.secondaryStrength === 'production') {
        score *= 1.3
      }
      break

    case 'trade_gold':
    case 'settlement_gold':
    case 'kill_gold':
      // Economy wonders for economy-focused tribes
      if (tribe.primaryStrength === 'economy' || tribe.secondaryStrength === 'economy') {
        score *= 1.3
      }
      break

    case 'culture_per_turn':
    case 'floor_price_per_tech':
      // Vibes/victory wonders for vibes-focused tribes
      if (tribe.primaryStrength === 'vibes') score *= 1.3
      break
  }

  // Penalty if someone else is already building this wonder (race risk)
  if (isWonderInProgress(state, wonder.id)) {
    score *= 0.5
  }

  // Era consideration - prefer lower era wonders early game
  const turnFactor = Math.min(state.turn / 20, 1) // 0 to 1 over first 20 turns
  if (wonder.era === 1) {
    score *= 1 + (1 - turnFactor) * 0.3 // Bonus early game
  } else if (wonder.era === 3) {
    score *= 0.7 + turnFactor * 0.3 // Penalty early game
  }

  return score
}

/**
 * Get prioritized list of wonders for AI to consider building
 */
export function getAIWonderPriorities(
  state: GameState,
  tribeId: TribeId
): Array<{ wonder: WonderDefinition; score: number; bestSettlement: SettlementId | null }> {
  const personality = getTribePersonality(tribeId)
  const availableWonders = getAvailableWonders(state)

  // Get AI settlements
  const settlements = Array.from(state.settlements.values()).filter(
    (s) => s.owner === tribeId
  )

  if (settlements.length === 0) return []

  const priorities: Array<{
    wonder: WonderDefinition
    score: number
    bestSettlement: SettlementId | null
  }> = []

  for (const wonder of availableWonders) {
    // Find the best settlement that can build this wonder
    let bestSettlement: SettlementId | null = null
    let canBuild = false

    for (const settlement of settlements) {
      const result = canBuildWonder(state, settlement.id, wonder.id)
      if (result.canBuild) {
        canBuild = true
        // Prefer settlements with higher production or capital
        if (!bestSettlement || settlement.isCapital) {
          bestSettlement = settlement.id
        }
      }
    }

    if (canBuild && bestSettlement) {
      const score = scoreWonderForAI(state, tribeId, wonder, personality)
      priorities.push({ wonder, score, bestSettlement })
    }
  }

  // Sort by score descending
  priorities.sort((a, b) => b.score - a.score)

  return priorities
}

/**
 * Generate wonder production action if AI should build a wonder
 */
export function generateWonderAction(
  state: GameState,
  tribeId: TribeId
): GameAction | null {
  const priorities = getAIWonderPriorities(state, tribeId)

  if (priorities.length === 0) return null

  // Check if AI is already building a wonder
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      const buildingWonder = settlement.productionQueue.some(
        (item) => item.type === 'wonder'
      )
      if (buildingWonder) return null // Already building one
    }
  }

  // Consider building the top priority wonder
  const topPriority = priorities[0]
  if (!topPriority || topPriority.score < 1.5) {
    return null // Score too low, not worth it
  }

  // Check if the best settlement has an empty production queue
  const settlement = state.settlements.get(topPriority.bestSettlement!)
  if (!settlement) return null

  // Only start wonder if production queue is empty or has 1 item
  if (settlement.productionQueue.length > 1) {
    return null
  }

  return {
    type: 'START_PRODUCTION',
    settlementId: topPriority.bestSettlement!,
    item: {
      type: 'wonder',
      id: topPriority.wonder.id,
      progress: 0,
      cost: topPriority.wonder.productionCost,
    },
  }
}

// =============================================================================
// Research AI - Tech Selection
// =============================================================================

/**
 * Tech priority weights based on tribe strengths
 */
const TECH_PRIORITY_WEIGHTS: Record<TribeName, Record<string, number>> = {
  // Monkes: Vibes (primary), Economy (secondary)
  monkes: {
    military: 0.7,
    economy: 1.4,
    production: 0.9,
    science: 1.0,
    culture: 1.3,
  },
  // Geckos: Tech (primary), Military (secondary)
  geckos: {
    military: 1.2,
    economy: 1.0,
    production: 1.1,
    science: 1.5,
    culture: 0.8,
  },
  // DeGods: Military (primary), Economy (secondary)
  degods: {
    military: 1.5,
    economy: 1.3,
    production: 1.0,
    science: 0.9,
    culture: 0.7,
  },
  // Cets: Vibes (primary), Production (secondary)
  cets: {
    military: 0.7,
    economy: 0.9,
    production: 1.4,
    science: 1.0,
    culture: 1.4,
  },
  // Coming soon tribes - balanced
  gregs: { military: 1.0, economy: 1.0, production: 1.0, science: 1.0, culture: 1.0 },
  dragonz: { military: 1.0, economy: 1.0, production: 1.0, science: 1.0, culture: 1.0 },
}

/**
 * Categorize a tech by its primary purpose
 */
function categorizeTech(tech: Tech): string {
  if (!tech.unlocks) return 'science'

  if (tech.unlocks.units && tech.unlocks.units.length > 0) {
    return 'military'
  }
  if (tech.unlocks.buildings) {
    const buildings = tech.unlocks.buildings
    // Check building types
    const buildingId = buildings[0]?.toLowerCase() || ''
    if (buildingId.includes('barracks') || buildingId.includes('arena')) return 'military'
    if (buildingId.includes('market') || buildingId.includes('solanart') || buildingId.includes('farm') || buildingId.includes('yield')) return 'economy'
    if (buildingId.includes('granary') || buildingId.includes('server') || buildingId.includes('bot')) return 'production'
    if (buildingId.includes('library') || buildingId.includes('alpha')) return 'science'
    if (buildingId.includes('gallery') || buildingId.includes('art') || buildingId.includes('cult')) return 'culture'
  }
  if (tech.unlocks.improvements) {
    const improvements = tech.unlocks.improvements
    if (improvements.some(i => i === 'mine' || i === 'quarry' || i === 'server_farm')) return 'production'
    if (improvements.some(i => i === 'pasture' || i === 'sty' || i === 'airdrop_farm')) return 'economy'
    if (improvements.some(i => i === 'brewery')) return 'culture'
  }

  return 'science'
}

/**
 * Score a tech for AI prioritization
 */
function scoreTechForAI(
  state: GameState,
  player: Player,
  tech: Tech,
  personality: TribePersonality
): number {
  const tribe = getTribeById(player.tribeId)
  if (!tribe) return 0

  let score = 0

  // Base score from era (prefer earlier era techs early game)
  const turnFactor = Math.min(state.turn / 20, 1)
  if (tech.era === 1) {
    score += 3 + (1 - turnFactor) * 2 // Higher early game
  } else if (tech.era === 2) {
    score += 2 + turnFactor
  } else {
    score += 1 + turnFactor * 2 // Higher late game
  }

  // Category weight based on tribe
  const category = categorizeTech(tech)
  const weights = TECH_PRIORITY_WEIGHTS[tribe.name]
  const categoryWeight = weights[category] || 1.0
  score *= categoryWeight

  // Bonus for techs that unlock units when at war
  const enemies = getEnemies(state, player.tribeId)
  if (enemies.length > 0 && tech.unlocks?.units) {
    score *= 1.5 * personality.aggressionMultiplier
  }

  // Bonus for economy techs when building up
  if (category === 'economy' && enemies.length === 0) {
    score *= 1.2
  }

  // Lower priority for techs with unmet culture prerequisites
  if (tech.prerequisites.cultures && tech.prerequisites.cultures.length > 0) {
    const hasCultures = tech.prerequisites.cultures.every(c => hasUnlockedCulture(player, c))
    if (!hasCultures) score *= 0.3 // Heavy penalty
  }

  return score
}

/**
 * Get prioritized list of techs for AI to research
 */
export function getAIResearchPriorities(
  state: GameState,
  tribeId: TribeId
): Array<{ tech: Tech; score: number }> {
  const player = state.players.find(p => p.tribeId === tribeId)
  if (!player) return []

  const personality = getTribePersonality(tribeId)
  const availableTechs = getAvailableTechs(player)

  const priorities: Array<{ tech: Tech; score: number }> = []

  for (const tech of availableTechs) {
    const score = scoreTechForAI(state, player, tech, personality)
    priorities.push({ tech, score })
  }

  // Sort by score descending
  priorities.sort((a, b) => b.score - a.score)

  return priorities
}

/**
 * Generate research action if AI should start researching
 */
function generateResearchAction(
  state: GameState,
  tribeId: TribeId
): GameAction | null {
  const player = state.players.find(p => p.tribeId === tribeId)
  if (!player) return null

  // Don't start new research if already researching
  if (player.currentResearch) return null

  const priorities = getAIResearchPriorities(state, tribeId)
  if (priorities.length === 0) return null

  const topPriority = priorities[0]!

  return {
    type: 'START_RESEARCH',
    techId: topPriority.tech.id,
  }
}

// =============================================================================
// Culture AI - Culture Selection
// =============================================================================

/**
 * Culture priority weights based on tribe strengths
 */
const CULTURE_PRIORITY_WEIGHTS: Record<TribeName, Record<string, number>> = {
  monkes: { diplomacy: 1.4, economy: 1.3, military: 0.7, expansion: 1.1, culture: 1.3 },
  geckos: { diplomacy: 1.1, economy: 1.0, military: 1.2, expansion: 1.0, culture: 0.9 },
  degods: { diplomacy: 0.8, economy: 1.2, military: 1.5, expansion: 1.1, culture: 0.7 },
  cets: { diplomacy: 1.2, economy: 0.9, military: 0.7, expansion: 1.3, culture: 1.4 },
  gregs: { diplomacy: 1.0, economy: 1.0, military: 1.0, expansion: 1.0, culture: 1.0 },
  dragonz: { diplomacy: 1.0, economy: 1.0, military: 1.0, expansion: 1.0, culture: 1.0 },
}

/**
 * Categorize a culture by its primary purpose
 */
function categorizeCulture(culture: Culture): string {
  // Check policy choices for hints
  if (culture.policyChoices) {
    for (const policy of culture.policyChoices) {
      if (policy.slotType === 'military') return 'military'
      if (policy.slotType === 'economy') return 'economy'
    }
  }

  // Check slot unlocks
  if (culture.slotUnlocks) {
    if (culture.slotUnlocks.military) return 'military'
    if (culture.slotUnlocks.economy) return 'economy'
    if (culture.slotUnlocks.progress) return 'expansion'
    if (culture.slotUnlocks.wildcard) return 'culture'
  }

  return 'culture'
}

/**
 * Score a culture for AI prioritization
 */
function scoreCultureForAI(
  state: GameState,
  player: Player,
  culture: Culture,
  personality: TribePersonality
): number {
  const tribe = getTribeById(player.tribeId)
  if (!tribe) return 0

  let score = 0

  // Base score from era
  const turnFactor = Math.min(state.turn / 20, 1)
  if (culture.era === 1) {
    score += 3 + (1 - turnFactor) * 2
  } else if (culture.era === 2) {
    score += 2 + turnFactor
  } else {
    score += 1 + turnFactor * 2
  }

  // Category weight based on tribe
  const category = categorizeCulture(culture)
  const weights = CULTURE_PRIORITY_WEIGHTS[tribe.name]
  const categoryWeight = weights[category] || 1.0
  score *= categoryWeight

  // Bonus for slot unlocks
  if (culture.slotUnlocks) {
    score *= 1.3
  }

  // Bonus for military cultures when at war
  const enemies = getEnemies(state, player.tribeId)
  if (enemies.length > 0 && category === 'military') {
    score *= 1.4 * personality.aggressionMultiplier
  }

  // Lower priority for cultures with unmet tech prerequisites
  if (culture.prerequisites.techs && culture.prerequisites.techs.length > 0) {
    const hasTechs = culture.prerequisites.techs.every(t => hasResearched(player, t))
    if (!hasTechs) score *= 0.3
  }

  return score
}

/**
 * Get prioritized list of cultures for AI to unlock
 */
export function getAICulturePriorities(
  state: GameState,
  tribeId: TribeId
): Array<{ culture: Culture; score: number }> {
  const player = state.players.find(p => p.tribeId === tribeId)
  if (!player) return []

  const personality = getTribePersonality(tribeId)
  const availableCultures = getAvailableCultures(player)

  const priorities: Array<{ culture: Culture; score: number }> = []

  for (const culture of availableCultures) {
    const score = scoreCultureForAI(state, player, culture, personality)
    priorities.push({ culture, score })
  }

  priorities.sort((a, b) => b.score - a.score)

  return priorities
}

/**
 * Generate culture action if AI should start unlocking a culture
 */
function generateCultureAction(
  state: GameState,
  tribeId: TribeId
): GameAction | null {
  const player = state.players.find(p => p.tribeId === tribeId)
  if (!player) return null

  // Don't start new culture if already working on one
  if (player.currentCulture) return null

  const priorities = getAICulturePriorities(state, tribeId)
  if (priorities.length === 0) return null

  const topPriority = priorities[0]!

  return {
    type: 'START_CULTURE',
    cultureId: topPriority.culture.id,
  }
}

// =============================================================================
// Expansion AI - Settler Management
// =============================================================================

/**
 * Find the best location for a new settlement
 */
function findBestSettlementLocation(
  state: GameState,
  settler: Unit
): HexCoord | null {
  const reachable = getReachableHexes(state, settler)
  const existingSettlements = Array.from(state.settlements.values())

  let bestLocation: HexCoord | null = null
  let bestScore = -Infinity

  for (const [key] of reachable) {
    const [q, r] = key.split(',').map(Number)
    const coord: HexCoord = { q: q!, r: r! }

    if (!canFoundSettlement(state, coord)) continue

    // Score the location
    let score = 0

    // Check terrain quality
    const tile = state.map.tiles.get(key)
    if (!tile) continue

    // Base terrain scores
    if (tile.terrain === 'grassland') score += 3
    else if (tile.terrain === 'plains') score += 2
    else if (tile.terrain === 'hills') score += 2
    else if (tile.terrain === 'forest') score += 1

    // River bonus
    if (tile.feature === 'river') score += 3

    // Resource bonus
    if (tile.resource) score += 2

    // Distance from other settlements (want some spread)
    let minDistToSettlement = Infinity
    for (const settlement of existingSettlements) {
      const dist = hexDistance(coord, settlement.position)
      minDistToSettlement = Math.min(minDistToSettlement, dist)
    }
    // Prefer 3-5 tiles away from other settlements
    if (minDistToSettlement >= 3 && minDistToSettlement <= 5) {
      score += 3
    } else if (minDistToSettlement < 3) {
      score -= 5 // Too close
    }

    // Check neighboring tiles for resources
    const neighbors = hexNeighbors(coord)
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.q},${neighbor.r}`
      const neighborTile = state.map.tiles.get(neighborKey)
      if (neighborTile?.resource) score += 1
      if (neighborTile?.feature === 'river') score += 0.5
    }

    if (score > bestScore) {
      bestScore = score
      bestLocation = coord
    }
  }

  return bestLocation
}

/**
 * Generate action for settler units
 */
function generateSettlerAction(
  state: GameState,
  settler: Unit
): GameAction | null {
  // Check if we can found at current location
  if (canFoundSettlement(state, settler.position)) {
    // Good enough location? Found immediately if few settlements
    const ourSettlements = Array.from(state.settlements.values()).filter(
      s => s.owner === settler.owner
    )
    if (ourSettlements.length < 3) {
      return {
        type: 'FOUND_SETTLEMENT',
        settlerId: settler.id,
      }
    }
  }

  // Find best location
  const bestLocation = findBestSettlementLocation(state, settler)

  if (bestLocation) {
    // If at best location, found
    if (bestLocation.q === settler.position.q && bestLocation.r === settler.position.r) {
      return {
        type: 'FOUND_SETTLEMENT',
        settlerId: settler.id,
      }
    }

    // Move toward best location
    return {
      type: 'MOVE_UNIT',
      unitId: settler.id,
      to: bestLocation,
    }
  }

  return null
}

// =============================================================================
// Lootbox Hunting AI
// =============================================================================

/**
 * Find nearest unclaimed lootbox to a unit
 */
function findNearestLootbox(
  state: GameState,
  unit: Unit
): HexCoord | null {
  const lootboxes = getUnclaimedLootboxes(state)
  if (lootboxes.length === 0) return null

  let nearest: HexCoord | null = null
  let nearestDist = Infinity

  for (const lootbox of lootboxes) {
    const dist = hexDistance(unit.position, lootbox.position)
    if (dist < nearestDist) {
      nearestDist = dist
      nearest = lootbox.position
    }
  }

  return nearest
}

/**
 * Generate move action toward nearest lootbox for exploration
 */
function generateLootboxHuntAction(
  state: GameState,
  unit: Unit
): GameAction | null {
  // Only scouts should hunt lootboxes
  if (unit.type !== 'scout') return null
  if (unit.movementRemaining <= 0) return null

  const nearestLootbox = findNearestLootbox(state, unit)
  if (!nearestLootbox) return null

  // Check if we're at the lootbox
  if (unit.position.q === nearestLootbox.q && unit.position.r === nearestLootbox.r) {
    return null // Lootbox is claimed automatically on move
  }

  // Get reachable hexes
  const reachable = getReachableHexes(state, unit)

  // Find reachable hex closest to lootbox
  let bestHex: HexCoord | null = null
  let bestDist = hexDistance(unit.position, nearestLootbox)

  for (const [key] of reachable) {
    const [q, r] = key.split(',').map(Number)
    const coord: HexCoord = { q: q!, r: r! }
    const dist = hexDistance(coord, nearestLootbox)

    if (dist < bestDist) {
      bestDist = dist
      bestHex = coord
    }
  }

  if (bestHex) {
    return {
      type: 'MOVE_UNIT',
      unitId: unit.id,
      to: bestHex,
    }
  }

  return null
}

// =============================================================================
// Builder AI - Improvement Placement
// =============================================================================

/**
 * Resource priority for improvement AI
 * Higher values = more important to improve
 */
const RESOURCE_PRIORITY: Record<string, number> = {
  // Strategic resources - highest priority
  iron: 10,
  horses: 10,
  // Luxury resources - high priority
  gems: 8,
  marble: 8,
  hops: 7,
  airdrop: 7,
  silicon: 7,
  // Bonus resources - medium priority
  pig: 5,
  cattle: 5,
}

/**
 * Find tiles owned by a tribe that could use improvements
 * Sorted by priority (resources first, then by yield potential)
 */
function findTilesNeedingImprovement(
  state: GameState,
  tribeId: TribeId
): Array<{ coord: HexCoord; tile: Tile; priority: number; bestImprovement: ImprovementType | null }> {
  const results: Array<{ coord: HexCoord; tile: Tile; priority: number; bestImprovement: ImprovementType | null }> = []

  for (const [, tile] of state.map.tiles) {
    // Skip tiles not owned by this tribe
    if (tile.owner !== tribeId) continue

    // Skip tiles that already have improvements
    if (tile.improvement) continue

    // Skip impassable terrain
    if (tile.terrain === 'water' || tile.terrain === 'mountain') continue

    // Get valid improvements for this tile
    const validImprovements = getValidImprovements(state, tile.coord, tribeId)
    if (validImprovements.length === 0) continue

    // Calculate priority
    let priority = 1

    // Resource tiles get high priority
    if (tile.resource?.revealed) {
      priority = RESOURCE_PRIORITY[tile.resource.type] || 5

      // Find the improvement that works the resource
      const resourceImprovement = getBestImprovementForResource(tile.resource.type)
      if (resourceImprovement && validImprovements.includes(resourceImprovement)) {
        results.push({
          coord: tile.coord,
          tile,
          priority,
          bestImprovement: resourceImprovement,
        })
        continue
      }
    }

    // Non-resource tiles - prefer mines on hills
    let bestImprovement: ImprovementType | null = null
    if (validImprovements.includes('mine') && tile.terrain === 'hills') {
      bestImprovement = 'mine'
      priority = 3
    } else if (validImprovements.length > 0) {
      bestImprovement = validImprovements[0]!
      priority = 2
    }

    if (bestImprovement) {
      results.push({
        coord: tile.coord,
        tile,
        priority,
        bestImprovement,
      })
    }
  }

  // Sort by priority descending
  results.sort((a, b) => b.priority - a.priority)

  return results
}

/**
 * Find the best target tile for a builder to work on
 */
function findBestBuilderTarget(
  state: GameState,
  builder: Unit
): { coord: HexCoord; improvement: ImprovementType } | null {
  const tilesNeedingWork = findTilesNeedingImprovement(state, builder.owner)
  if (tilesNeedingWork.length === 0) return null

  // Find the closest high-priority tile
  let bestTarget: { coord: HexCoord; improvement: ImprovementType } | null = null
  let bestScore = -Infinity

  for (const target of tilesNeedingWork) {
    if (!target.bestImprovement) continue

    const distance = hexDistance(builder.position, target.coord)

    // Score = priority - distance penalty
    // High priority tiles are worth traveling for
    const score = target.priority * 2 - distance

    if (score > bestScore) {
      bestScore = score
      bestTarget = { coord: target.coord, improvement: target.bestImprovement }
    }
  }

  return bestTarget
}

/**
 * Generate action for builder units
 */
function generateBuilderAction(
  state: GameState,
  builder: Unit
): GameAction | null {
  // Check if builder has charges remaining
  // For simplicity, we track via hasActed per turn

  // First, check if we can build something at current location
  const currentTile = state.map.tiles.get(hexKey(builder.position))
  if (currentTile && !currentTile.improvement && currentTile.owner === builder.owner) {
    const validImprovements = getValidImprovements(state, builder.position, builder.owner)
    if (validImprovements.length > 0) {
      // Check for resource-specific improvement first
      let bestImprovement: ImprovementType | null = null
      if (currentTile.resource?.revealed) {
        const resourceImprovement = getBestImprovementForResource(currentTile.resource.type)
        if (resourceImprovement && validImprovements.includes(resourceImprovement)) {
          bestImprovement = resourceImprovement
        }
      }

      // Fall back to default improvement choices
      if (!bestImprovement) {
        if (validImprovements.includes('mine') && currentTile.terrain === 'hills') {
          bestImprovement = 'mine'
        } else if (validImprovements.includes('pasture') && (currentTile.terrain === 'grassland' || currentTile.terrain === 'plains')) {
          bestImprovement = 'pasture'
        } else {
          bestImprovement = validImprovements[0]!
        }
      }

      if (bestImprovement) {
        return {
          type: 'BUILD_IMPROVEMENT',
          builderId: builder.id,
          improvement: bestImprovement,
        }
      }
    }
  }

  // If we can't build here, move toward best target
  if (builder.movementRemaining <= 0) return null

  const target = findBestBuilderTarget(state, builder)
  if (!target) return null

  // Already at target? This shouldn't happen, but handle it
  if (target.coord.q === builder.position.q && target.coord.r === builder.position.r) {
    return null
  }

  // Get reachable hexes and find one closest to target
  const reachable = getReachableHexes(state, builder)
  let bestHex: HexCoord | null = null
  let bestDist = hexDistance(builder.position, target.coord)

  for (const [key] of reachable) {
    const [q, r] = key.split(',').map(Number)
    const coord: HexCoord = { q: q!, r: r! }
    const dist = hexDistance(coord, target.coord)

    if (dist < bestDist) {
      bestDist = dist
      bestHex = coord
    }
  }

  if (bestHex) {
    return {
      type: 'MOVE_UNIT',
      unitId: builder.id,
      to: bestHex,
    }
  }

  return null
}

// =============================================================================
// Trade Route AI - Optimization and Selection
// =============================================================================

/**
 * Trade route priority weights based on tribe strengths
 * Economy-focused tribes prioritize trade more highly
 */
const TRADE_ROUTE_PRIORITIES: Record<TribeName, number> = {
  monkes: 1.5,  // Vibes + Economy - loves trade
  geckos: 1.0,  // Tech + Military - balanced
  degods: 0.8,  // Military + Economy - prefers conquest
  cets: 1.2,    // Vibes + Production - likes steady income
  gregs: 1.0,
  dragonz: 1.0,
}

/**
 * Score a potential trade destination for AI
 */
function scoreTradeDestination(
  state: GameState,
  tribeId: TribeId,
  destination: { settlement: { owner: TribeId }; isInternal: boolean; goldPerTurn: number },
  personality: TribePersonality
): number {
  let score = destination.goldPerTurn // Base score is the gold yield

  // Internal routes are safer
  if (destination.isInternal) {
    score *= 1.2 // Bonus for reliability
  } else {
    // External routes depend on diplomatic risk
    const stance = getStance(state, tribeId, destination.settlement.owner)

    if (stance === 'allied') {
      score *= 1.3 // Best partner - stable and 25% bonus
    } else if (stance === 'friendly') {
      score *= 1.1 // Good partner
    } else if (stance === 'neutral') {
      score *= 0.9 // Risk of relationship souring
    }

    // Diplomatic tribes prefer external routes
    score *= personality.allianceMultiplier * 0.8
  }

  return score
}

/**
 * Get prioritized trade destinations for AI
 */
export function getAITradeRoutePriorities(
  state: GameState,
  tribeId: TribeId
): Array<{ originId: string; destinationId: string; score: number }> {
  // Check if trade is available
  if (!hasTradeUnlocked(state, tribeId)) return []

  // Check capacity
  const currentRoutes = getPlayerTradeRoutes(state, tribeId)
  const capacity = getTradeRouteCapacity(state, tribeId)
  if (currentRoutes.length >= capacity) return []

  const personality = getTribePersonality(tribeId)
  const destinations = getAvailableTradeDestinations(state, tribeId)

  if (destinations.length === 0) return []

  // Get player settlements for origins
  const playerSettlements = getPlayerSettlements(state, tribeId)
  if (playerSettlements.length === 0) return []

  const priorities: Array<{ originId: string; destinationId: string; score: number }> = []

  // Use capital as default origin (could optimize later)
  const origin = playerSettlements.find(s => s.isCapital) || playerSettlements[0]!

  for (const dest of destinations) {
    // Skip self
    if (dest.settlement.id === origin.id) continue

    // Check if route can be created
    const canCreate = canCreateTradeRoute(state, origin.id, dest.settlement.id)
    if (!canCreate.canCreate) continue

    const score = scoreTradeDestination(state, tribeId, dest, personality)
    priorities.push({
      originId: origin.id,
      destinationId: dest.settlement.id,
      score,
    })
  }

  // Sort by score descending
  priorities.sort((a, b) => b.score - a.score)

  return priorities
}

/**
 * Generate trade route action for AI
 */
function generateTradeRouteAction(
  state: GameState,
  tribeId: TribeId
): GameAction | null {
  // Check tribe's trade priority
  const tribe = getTribeById(tribeId)
  if (!tribe) return null

  const tradePriority = TRADE_ROUTE_PRIORITIES[tribe.name] || 1.0

  // Lower priority tribes might skip trade this turn
  if (tradePriority < 1.0 && Math.random() > tradePriority) {
    return null
  }

  const priorities = getAITradeRoutePriorities(state, tribeId)
  if (priorities.length === 0) return null

  // Take the best option if score is high enough
  const best = priorities[0]!

  // Minimum score threshold (at least 1 gold per turn equivalent value)
  const minScore = 1.0 / tradePriority
  if (best.score < minScore) return null

  return {
    type: 'CREATE_TRADE_ROUTE',
    origin: best.originId as never,
    destination: best.destinationId as never,
  }
}
