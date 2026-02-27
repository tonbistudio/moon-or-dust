// Diplomacy system - relations, war, peace, alliances, and reputation

import type {
  GameState,
  TribeId,
  DiplomacyState,
  DiplomaticRelation,
  DiplomaticStance,
  ReputationEvent,
} from '../types'
import { hexRange, hexKey } from '../hex'

// =============================================================================
// Constants
// =============================================================================

/** Turns required at hostile before auto-transition to neutral */
const HOSTILE_TO_NEUTRAL_TURNS = 5

/** War weariness per turn at war */
const WAR_WEARINESS_PER_TURN = 5

/** Reputation penalty for declaring war while friendly */
const FRIENDLY_WAR_PENALTY = -20

/** Reputation penalty for breaking an alliance */
const ALLIANCE_BREAK_PENALTY = -30

/** Reputation bonus for honoring alliance (joining ally's war) */
const ALLIANCE_HONOR_BONUS = 10

/** Shared vision radius around allied capitals */
const ALLIED_VISION_RADIUS = 2

/** Trade yield bonus when allied (percentage) */
export const ALLIED_TRADE_BONUS = 10

// =============================================================================
// Relation Key Helpers
// =============================================================================

/**
 * Creates a consistent key for a tribe pair (alphabetically sorted)
 */
export function getRelationKey(tribe1: TribeId, tribe2: TribeId): string {
  const sorted = [tribe1, tribe2].sort()
  return `${sorted[0]}-${sorted[1]}`
}

/**
 * Parses a relation key back to tribe IDs
 */
export function parseRelationKey(key: string): [TribeId, TribeId] {
  const parts = key.split('-')
  return [parts[0] as TribeId, parts[1] as TribeId]
}

// =============================================================================
// Relation Queries
// =============================================================================

/**
 * Gets the diplomatic relation between two tribes
 */
export function getRelation(
  state: GameState,
  tribe1: TribeId,
  tribe2: TribeId
): DiplomaticRelation | undefined {
  const key = getRelationKey(tribe1, tribe2)
  return state.diplomacy.relations.get(key)
}

/**
 * Gets the diplomatic stance between two tribes
 */
export function getStance(
  state: GameState,
  tribe1: TribeId,
  tribe2: TribeId
): DiplomaticStance {
  const relation = getRelation(state, tribe1, tribe2)
  return relation?.stance ?? 'neutral'
}

/**
 * Checks if two tribes are at war
 */
export function areAtWar(state: GameState, tribe1: TribeId, tribe2: TribeId): boolean {
  return getStance(state, tribe1, tribe2) === 'war'
}

/**
 * Checks if two tribes are allied
 */
export function areAllied(state: GameState, tribe1: TribeId, tribe2: TribeId): boolean {
  return getStance(state, tribe1, tribe2) === 'allied'
}

/**
 * Checks if two tribes are friendly (or better)
 */
export function areFriendlyOrBetter(state: GameState, tribe1: TribeId, tribe2: TribeId): boolean {
  const stance = getStance(state, tribe1, tribe2)
  return stance === 'friendly' || stance === 'allied'
}

/**
 * Gets all tribes at war with a given tribe
 */
export function getEnemies(state: GameState, tribeId: TribeId): TribeId[] {
  const enemies: TribeId[] = []

  for (const [key, relation] of state.diplomacy.relations) {
    if (relation.stance === 'war') {
      const [tribe1, tribe2] = parseRelationKey(key)
      if (tribe1 === tribeId) enemies.push(tribe2)
      else if (tribe2 === tribeId) enemies.push(tribe1)
    }
  }

  return enemies
}

/**
 * Gets all tribes allied with a given tribe
 */
export function getAllies(state: GameState, tribeId: TribeId): TribeId[] {
  const allies: TribeId[] = []

  for (const [key, relation] of state.diplomacy.relations) {
    if (relation.stance === 'allied') {
      const [tribe1, tribe2] = parseRelationKey(key)
      if (tribe1 === tribeId) allies.push(tribe2)
      else if (tribe2 === tribeId) allies.push(tribe1)
    }
  }

  return allies
}

/**
 * Gets all tribes friendly (but not allied) with a given tribe
 */
export function getFriendlyTribes(state: GameState, tribeId: TribeId): TribeId[] {
  const friendly: TribeId[] = []

  for (const [key, relation] of state.diplomacy.relations) {
    if (relation.stance === 'friendly') {
      const [tribe1, tribe2] = parseRelationKey(key)
      if (tribe1 === tribeId) friendly.push(tribe2)
      else if (tribe2 === tribeId) friendly.push(tribe1)
    }
  }

  return friendly
}

/**
 * Gets reputation score between two tribes
 */
export function getReputation(state: GameState, tribe1: TribeId, tribe2: TribeId): number {
  const relation = getRelation(state, tribe1, tribe2)
  return relation?.reputation ?? 0
}

/**
 * Gets war weariness for a tribe
 */
export function getWarWeariness(state: GameState, tribeId: TribeId): number {
  return state.diplomacy.warWeariness.get(tribeId) ?? 0
}

// =============================================================================
// Can Perform Actions
// =============================================================================

/**
 * Checks if a tribe can declare war on another
 */
export function canDeclareWar(
  state: GameState,
  aggressor: TribeId,
  target: TribeId
): { canDeclare: boolean; reason?: string } {
  if (aggressor === target) {
    return { canDeclare: false, reason: 'Cannot declare war on yourself' }
  }

  const stance = getStance(state, aggressor, target)

  if (stance === 'war') {
    return { canDeclare: false, reason: 'Already at war' }
  }

  // Can always declare war (even on allies, though with penalties)
  return { canDeclare: true }
}

/**
 * Checks if a tribe can propose peace
 */
export function canProposePeace(
  state: GameState,
  proposer: TribeId,
  target: TribeId
): { canPropose: boolean; reason?: string } {
  const stance = getStance(state, proposer, target)

  if (stance !== 'war') {
    return { canPropose: false, reason: 'Not at war' }
  }

  // Check minimum war duration (at least 5 turns)
  const relation = getRelation(state, proposer, target)
  if (relation && relation.turnsAtCurrentStance < 5) {
    return { canPropose: false, reason: 'War too recent (minimum 5 turns)' }
  }

  // Check peace rejection cooldown (3 turns after rejection)
  const rejectionKey = `${proposer}-${target}`
  const lastRejection = state.diplomacy.peaceRejectionTurns.get(rejectionKey)
  if (lastRejection !== undefined && state.turn - lastRejection < 3) {
    return { canPropose: false, reason: 'Peace was recently rejected (wait 3 turns)' }
  }

  return { canPropose: true }
}

/**
 * Checks if a tribe can propose alliance
 */
export function canProposeAlliance(
  state: GameState,
  proposer: TribeId,
  target: TribeId
): { canPropose: boolean; reason?: string } {
  if (proposer === target) {
    return { canPropose: false, reason: 'Cannot ally with yourself' }
  }

  const stance = getStance(state, proposer, target)

  if (stance !== 'friendly') {
    return { canPropose: false, reason: 'Must be friendly to propose alliance' }
  }

  return { canPropose: true }
}

// =============================================================================
// State Transitions
// =============================================================================

/**
 * Updates a diplomatic relation
 */
function updateRelation(
  diplomacy: DiplomacyState,
  tribe1: TribeId,
  tribe2: TribeId,
  update: Partial<DiplomaticRelation>
): DiplomacyState {
  const key = getRelationKey(tribe1, tribe2)
  const existing = diplomacy.relations.get(key)
  const current: DiplomaticRelation = existing ?? {
    stance: 'neutral',
    turnsAtCurrentStance: 0,
    reputation: 0,
  }

  const newRelations = new Map(diplomacy.relations)
  newRelations.set(key, { ...current, ...update })

  return {
    ...diplomacy,
    relations: newRelations,
  }
}

/**
 * Sets the diplomatic stance between two tribes
 */
function setStance(
  diplomacy: DiplomacyState,
  tribe1: TribeId,
  tribe2: TribeId,
  stance: DiplomaticStance
): DiplomacyState {
  return updateRelation(diplomacy, tribe1, tribe2, {
    stance,
    turnsAtCurrentStance: 0,
  })
}

/**
 * Adds a reputation event
 */
function addReputationEvent(
  diplomacy: DiplomacyState,
  tribeId: TribeId,
  event: ReputationEvent
): DiplomacyState {
  const existing = diplomacy.reputationModifiers.get(tribeId) ?? []
  const newModifiers = new Map(diplomacy.reputationModifiers)
  newModifiers.set(tribeId, [...existing, event])

  return {
    ...diplomacy,
    reputationModifiers: newModifiers,
  }
}

/**
 * Updates reputation between two tribes
 */
function updateReputation(
  diplomacy: DiplomacyState,
  tribe1: TribeId,
  tribe2: TribeId,
  delta: number
): DiplomacyState {
  const key = getRelationKey(tribe1, tribe2)
  const existing = diplomacy.relations.get(key)
  const currentRep = existing?.reputation ?? 0

  return updateRelation(diplomacy, tribe1, tribe2, {
    reputation: currentRep + delta,
  })
}

// =============================================================================
// War Declaration
// =============================================================================

/**
 * Declares war on another tribe
 * - Sets stance to war
 * - Applies reputation penalties
 * - Triggers alliance obligations
 */
export function declareWar(
  state: GameState,
  aggressor: TribeId,
  target: TribeId
): GameState | null {
  const result = canDeclareWar(state, aggressor, target)
  if (!result.canDeclare) return null

  const currentStance = getStance(state, aggressor, target)
  let newDiplomacy = state.diplomacy

  // Set to war
  newDiplomacy = setStance(newDiplomacy, aggressor, target, 'war')

  // Reputation penalty for declaring war while friendly
  if (currentStance === 'friendly') {
    // Penalty with the target
    newDiplomacy = updateReputation(newDiplomacy, aggressor, target, FRIENDLY_WAR_PENALTY)

    // Penalty with all other tribes friendly with target
    const targetFriends = getFriendlyTribes({ ...state, diplomacy: newDiplomacy }, target)
    for (const friend of targetFriends) {
      if (friend !== aggressor) {
        newDiplomacy = updateReputation(newDiplomacy, aggressor, friend, FRIENDLY_WAR_PENALTY)
        newDiplomacy = addReputationEvent(newDiplomacy, aggressor, {
          type: 'war_declaration',
          turn: state.turn,
          amount: FRIENDLY_WAR_PENALTY,
        })
      }
    }
  }

  // Breaking alliance is even worse
  if (currentStance === 'allied') {
    newDiplomacy = updateReputation(newDiplomacy, aggressor, target, ALLIANCE_BREAK_PENALTY)
    newDiplomacy = addReputationEvent(newDiplomacy, aggressor, {
      type: 'betrayal',
      turn: state.turn,
      amount: ALLIANCE_BREAK_PENALTY,
    })

    // All other tribes see this betrayal
    for (const player of state.players) {
      if (player.tribeId !== aggressor && player.tribeId !== target) {
        newDiplomacy = updateReputation(newDiplomacy, aggressor, player.tribeId, -10)
      }
    }
  }

  // Alliance obligations: allies of target join the war
  const targetAllies = getAllies({ ...state, diplomacy: newDiplomacy }, target)
  for (const ally of targetAllies) {
    if (ally !== aggressor) {
      // Ally joins war against aggressor
      newDiplomacy = setStance(newDiplomacy, aggressor, ally, 'war')

      // Ally gains reputation for honoring alliance
      newDiplomacy = updateReputation(newDiplomacy, ally, target, ALLIANCE_HONOR_BONUS)
      newDiplomacy = addReputationEvent(newDiplomacy, ally, {
        type: 'alliance',
        turn: state.turn,
        amount: ALLIANCE_HONOR_BONUS,
      })
    }
  }

  // Cancel trade routes between warring tribes
  const newTradeRoutes = state.tradeRoutes.map((route) => {
    if (!route.active) return route

    const origin = state.settlements.get(route.origin)
    const dest = state.settlements.get(route.destination)

    if (!origin || !dest) return route

    // Cancel if route goes between aggressor and target (or their allies now at war)
    const involvedTribes = [aggressor, target, ...targetAllies.filter((a) => a !== aggressor)]
    const originInvolved = involvedTribes.includes(origin.owner)
    const destInvolved = involvedTribes.includes(dest.owner)

    // Cancel if both ends are in opposing sides
    const originIsAggressor = origin.owner === aggressor
    const destIsAggressor = dest.owner === aggressor

    if (originInvolved && destInvolved && originIsAggressor !== destIsAggressor) {
      return { ...route, active: false }
    }

    return route
  })

  return {
    ...state,
    diplomacy: newDiplomacy,
    tradeRoutes: newTradeRoutes,
  }
}

// =============================================================================
// Peace Treaty
// =============================================================================

/**
 * Proposes peace (immediate effect for now - could add acceptance later)
 * Transitions from war to hostile
 */
export function makePeace(
  state: GameState,
  tribe1: TribeId,
  tribe2: TribeId
): GameState | null {
  const result = canProposePeace(state, tribe1, tribe2)
  if (!result.canPropose) return null

  let newDiplomacy = state.diplomacy

  // Transition to hostile
  newDiplomacy = setStance(newDiplomacy, tribe1, tribe2, 'hostile')

  // Reset war weariness for both tribes
  const newWarWeariness = new Map(newDiplomacy.warWeariness)
  newWarWeariness.set(tribe1, Math.max(0, (newWarWeariness.get(tribe1) ?? 0) - 20))
  newWarWeariness.set(tribe2, Math.max(0, (newWarWeariness.get(tribe2) ?? 0) - 20))

  return {
    ...state,
    diplomacy: {
      ...newDiplomacy,
      warWeariness: newWarWeariness,
    },
  }
}

// =============================================================================
// Alliance Formation
// =============================================================================

/**
 * Forms an alliance between two tribes (both must agree)
 * For now, immediate effect - could add proposal system later
 */
export function formAlliance(
  state: GameState,
  tribe1: TribeId,
  tribe2: TribeId
): GameState | null {
  // Check both can propose
  const result1 = canProposeAlliance(state, tribe1, tribe2)
  const result2 = canProposeAlliance(state, tribe2, tribe1)

  if (!result1.canPropose || !result2.canPropose) return null

  let newDiplomacy = state.diplomacy

  // Set to allied
  newDiplomacy = setStance(newDiplomacy, tribe1, tribe2, 'allied')

  // Positive reputation
  newDiplomacy = updateReputation(newDiplomacy, tribe1, tribe2, 20)
  newDiplomacy = addReputationEvent(newDiplomacy, tribe1, {
    type: 'alliance',
    turn: state.turn,
    amount: 20,
  })
  newDiplomacy = addReputationEvent(newDiplomacy, tribe2, {
    type: 'alliance',
    turn: state.turn,
    amount: 20,
  })

  return {
    ...state,
    diplomacy: newDiplomacy,
  }
}

/**
 * Breaks an alliance (transitions to friendly, with reputation hit)
 */
export function breakAlliance(
  state: GameState,
  breaker: TribeId,
  other: TribeId
): GameState | null {
  if (!areAllied(state, breaker, other)) return null

  let newDiplomacy = state.diplomacy

  // Transition to friendly
  newDiplomacy = setStance(newDiplomacy, breaker, other, 'friendly')

  // Reputation penalty
  newDiplomacy = updateReputation(newDiplomacy, breaker, other, -15)
  newDiplomacy = addReputationEvent(newDiplomacy, breaker, {
    type: 'betrayal',
    turn: state.turn,
    amount: -15,
  })

  return {
    ...state,
    diplomacy: newDiplomacy,
  }
}

// =============================================================================
// Friendship
// =============================================================================

/**
 * Improves relation to friendly (from neutral)
 * Usually triggered by gifts or lack of conflict
 */
export function improvToFriendly(
  state: GameState,
  tribe1: TribeId,
  tribe2: TribeId
): GameState | null {
  const stance = getStance(state, tribe1, tribe2)

  if (stance !== 'neutral') {
    return null
  }

  let newDiplomacy = state.diplomacy
  newDiplomacy = setStance(newDiplomacy, tribe1, tribe2, 'friendly')

  return {
    ...state,
    diplomacy: newDiplomacy,
  }
}

/**
 * Sends a gift to improve relations
 */
export function sendGift(
  state: GameState,
  sender: TribeId,
  receiver: TribeId,
  goldAmount: number
): GameState | null {
  // Check if sender can afford
  const senderPlayer = state.players.find((p) => p.tribeId === sender)
  if (!senderPlayer || senderPlayer.treasury < goldAmount) {
    return null
  }

  // Can't gift to enemies
  if (areAtWar(state, sender, receiver)) {
    return null
  }

  // Transfer gold
  const newPlayers = state.players.map((p) => {
    if (p.tribeId === sender) {
      return { ...p, treasury: p.treasury - goldAmount }
    }
    if (p.tribeId === receiver) {
      return { ...p, treasury: p.treasury + goldAmount }
    }
    return p
  })

  // Improve reputation
  const repBonus = Math.floor(goldAmount / 10)
  let newDiplomacy = updateReputation(state.diplomacy, sender, receiver, repBonus)
  newDiplomacy = addReputationEvent(newDiplomacy, sender, {
    type: 'gift',
    turn: state.turn,
    amount: repBonus,
  })

  // Check if this improves stance
  const stance = getStance(state, sender, receiver)
  const newRep = getReputation({ ...state, diplomacy: newDiplomacy }, sender, receiver)

  if (stance === 'neutral' && newRep >= 20) {
    newDiplomacy = setStance(newDiplomacy, sender, receiver, 'friendly')
  }

  return {
    ...state,
    players: newPlayers,
    diplomacy: newDiplomacy,
  }
}

// =============================================================================
// Shared Vision (Alliance Benefit)
// =============================================================================

/**
 * Gets hexes visible due to alliance (around allied capitals)
 */
export function getAlliedVisionHexes(state: GameState, tribeId: TribeId): Set<string> {
  const visibleHexes = new Set<string>()
  const allies = getAllies(state, tribeId)

  for (const allyId of allies) {
    // Find ally's capital
    for (const settlement of state.settlements.values()) {
      if (settlement.owner === allyId && settlement.isCapital) {
        // Add hexes in radius around capital
        const capitalHexes = hexRange(settlement.position, ALLIED_VISION_RADIUS)
        for (const hex of capitalHexes) {
          visibleHexes.add(hexKey(hex))
        }
        break // Only one capital per player
      }
    }
  }

  return visibleHexes
}

/**
 * Updates fog of war to include allied vision
 */
export function applyAlliedVision(state: GameState, tribeId: TribeId): GameState {
  const alliedHexes = getAlliedVisionHexes(state, tribeId)

  if (alliedHexes.size === 0) {
    return state
  }

  const currentFog = state.fog.get(tribeId) ?? new Set<string>()
  const newFogSet = new Set([...currentFog, ...alliedHexes])

  const newFog = new Map(state.fog)
  newFog.set(tribeId, newFogSet)

  return {
    ...state,
    fog: newFog,
  }
}

// =============================================================================
// Turn Processing
// =============================================================================

/**
 * Processes diplomacy at end of turn
 * - Increments turnsAtCurrentStance
 * - Auto-transitions hostile → neutral after time
 * - Accumulates war weariness
 */
export function processDiplomacyTurn(state: GameState): GameState {
  let newDiplomacy = state.diplomacy
  const newRelations = new Map(newDiplomacy.relations)
  const newWarWeariness = new Map(newDiplomacy.warWeariness)

  // Process each relation
  for (const [key, relation] of newRelations) {
    const [tribe1, tribe2] = parseRelationKey(key)

    // Auto-transition: hostile → neutral after enough turns
    const shouldTransition =
      relation.stance === 'hostile' && relation.turnsAtCurrentStance >= HOSTILE_TO_NEUTRAL_TURNS

    // Create updated relation with correct values
    const updatedRelation: DiplomaticRelation = shouldTransition
      ? {
          ...relation,
          stance: 'neutral',
          turnsAtCurrentStance: 0,
        }
      : {
          ...relation,
          turnsAtCurrentStance: relation.turnsAtCurrentStance + 1,
        }

    newRelations.set(key, updatedRelation)

    // War weariness accumulation
    if (relation.stance === 'war') {
      newWarWeariness.set(
        tribe1,
        (newWarWeariness.get(tribe1) ?? 0) + WAR_WEARINESS_PER_TURN
      )
      newWarWeariness.set(
        tribe2,
        (newWarWeariness.get(tribe2) ?? 0) + WAR_WEARINESS_PER_TURN
      )
    }
  }

  newDiplomacy = {
    ...newDiplomacy,
    relations: newRelations,
    warWeariness: newWarWeariness,
  }

  // Apply allied vision for all players
  let newState: GameState = { ...state, diplomacy: newDiplomacy }
  for (const player of state.players) {
    newState = applyAlliedVision(newState, player.tribeId)
  }

  return newState
}

// =============================================================================
// Territory and Movement Checks
// =============================================================================

/**
 * Checks if a tribe can enter another tribe's territory
 */
export function canEnterTerritory(
  state: GameState,
  movingTribe: TribeId,
  territoryOwner: TribeId
): { canEnter: boolean; cost?: number } {
  if (movingTribe === territoryOwner) {
    return { canEnter: true }
  }

  const stance = getStance(state, movingTribe, territoryOwner)

  switch (stance) {
    case 'war':
      return { canEnter: true } // Can attack
    case 'hostile':
      return { canEnter: false }
    case 'neutral':
      return { canEnter: true, cost: 1 } // Extra movement cost
    case 'friendly':
    case 'allied':
      return { canEnter: true }
    default:
      return { canEnter: false }
  }
}

/**
 * Checks if a tribe can attack units of another tribe based on diplomatic status
 */
export function canAttackDiplomatically(
  state: GameState,
  attacker: TribeId,
  defender: TribeId
): boolean {
  if (attacker === defender) return false
  return areAtWar(state, attacker, defender)
}

// =============================================================================
// Diplomatic Summary
// =============================================================================

/**
 * Gets a summary of all diplomatic relations for a tribe
 */
export function getDiplomaticSummary(
  state: GameState,
  tribeId: TribeId
): Map<TribeId, { stance: DiplomaticStance; reputation: number; turns: number }> {
  const summary = new Map<TribeId, { stance: DiplomaticStance; reputation: number; turns: number }>()

  for (const player of state.players) {
    if (player.tribeId === tribeId) continue

    const relation = getRelation(state, tribeId, player.tribeId)
    summary.set(player.tribeId, {
      stance: relation?.stance ?? 'neutral',
      reputation: relation?.reputation ?? 0,
      turns: relation?.turnsAtCurrentStance ?? 0,
    })
  }

  return summary
}

/**
 * Counts tribes at each diplomatic stance with a given tribe
 */
export function countByStance(
  state: GameState,
  tribeId: TribeId
): Record<DiplomaticStance, number> {
  const counts: Record<DiplomaticStance, number> = {
    war: 0,
    hostile: 0,
    neutral: 0,
    friendly: 0,
    allied: 0,
  }

  for (const player of state.players) {
    if (player.tribeId === tribeId) continue
    const stance = getStance(state, tribeId, player.tribeId)
    counts[stance]++
  }

  return counts
}

// =============================================================================
// Initialize Diplomacy
// =============================================================================

/**
 * Creates initial diplomacy state for a new game
 */
export function createInitialDiplomacy(tribeIds: TribeId[]): DiplomacyState {
  const relations = new Map<string, DiplomaticRelation>()

  // Initialize all pairs as neutral
  for (let i = 0; i < tribeIds.length; i++) {
    for (let j = i + 1; j < tribeIds.length; j++) {
      const key = getRelationKey(tribeIds[i]!, tribeIds[j]!)
      relations.set(key, {
        stance: 'neutral',
        turnsAtCurrentStance: 0,
        reputation: 0,
      })
    }
  }

  return {
    relations,
    warWeariness: new Map(),
    reputationModifiers: new Map(),
    peaceRejectionTurns: new Map(),
  }
}
