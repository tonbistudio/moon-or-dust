// Game state management - pure functions for deterministic state transitions

import type {
  GameState,
  GameAction,
  Player,
  Unit,
  TribeId,
  PlayerId,
  UnitId,
  UnitRarity,
  SettlementId,
  HexMap,
  DiplomacyState,
  TribeName,
  Yields,
  GoldenAgeState,
  PlayerPolicies,
  ProductionItem,
  Settlement,
  WonderId,
  UnitType,
  HexCoord,
  TechId,
  CultureId,
  ImprovementType,
  PromotionId,
  TradeRouteId,
  DiplomaticRelation,
  PolicyId,
  BuildingId,
  PendingMint,
} from '../types'
import { hexKey, hexRange } from '../hex'
import { startWonderConstruction, canBuildWonder, completeWonder } from '../wonders'
import { BUILDING_DEFINITIONS, canConstructBuilding, addBuildingToSettlement } from '../buildings'
import {
  UNIT_DEFINITIONS,
  createUnit,
  addUnit,
  updateUnit,
  removeUnit,
  findPath,
  getPathCost,
  moveUnit as applyUnitMove,
} from '../units'
import { processProduction, processPlayerEconomy, createTradeRoute, cancelTradeRoute, processTradeRouteFormation } from '../economy'
import {
  createSettlement,
  addSettlement,
  canFoundSettlement,
  calculateSettlementYields,
  calculatePlayerYields,
  processSettlementGrowth,
  expandSettlementBorders,
} from '../settlements'
import {
  resolveCombat,
  resolveSettlementCombat,
  applySettlementCombatResult,
  calculateHealing,
  calculateAdjacentHealingReceived,
  healUnit,
  canLevelUp,
  getXpForNextLevel,
} from '../combat'
import { getSettlementMaxHealth } from '../settlements'
import { canResearchTech, TECH_DEFINITIONS, addResearchProgress } from '../tech'
import {
  canUnlockCulture,
  CULTURE_DEFINITIONS,
  completeCulture,
  isCultureReadyForCompletion,
  addCultureProgress,
  swapPolicies,
  calculatePolicyVisionBonus,
  calculatePolicyKillVibes,
  calculatePolicyPromotionVibes,
  calculatePolicyTerritoryKillGold,
  calculatePolicySettlePopulation,
  calculatePolicyFloorPriceBonus,
  calculatePolicyProductionModifiers,
  calculatePolicyCavalryMovementBonus,
  getPolicyFreePromotions,
} from '../cultures'
import { canBuildImprovement } from '../improvements'
import {
  declareWar,
  makePeace,
  formAlliance,
  canDeclareWar,
  canProposePeace,
  canProposeAlliance,
  areAtWar,
} from '../diplomacy'
import { applyPromotion, getAvailablePromotions } from '../promotions'
import { selectMilestone } from '../milestones'
import {
  getInitialGreatPeopleState,
  checkAndSpawnGreatPeople,
  useGreatPersonAction,
  GREAT_PERSON_DEFINITIONS,
  tickActiveBuffs,
  getActiveYieldBuffPercent,
} from '../greatpeople'
import {
  checkAllTriggers,
  activateGoldenAge,
  processGoldenAgeTurn,
  cleanupRecentTechs,
  getGoldenAgeYieldBonus,
} from '../goldenage'
import { getPlayerTribeBonuses } from '../tribes'
import { claimLootbox, hasLootboxAt } from '../lootbox'

// =============================================================================
// Constants
// =============================================================================

export const GAME_VERSION = '0.1.0'
export const MAX_TURNS = 50
export const MAP_WIDTH = 20
export const MAP_HEIGHT = 20
export const BASE_UNIT_VISION = 2

// =============================================================================
// ID Generation (deterministic based on seed)
// =============================================================================

/**
 * Simple deterministic random number generator (mulberry32)
 */
export function createRng(seed: number): () => number {
  let state = seed
  return (): number => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let idCounter = 0

export function generateId(prefix: string): string {
  idCounter++
  return `${prefix}_${idCounter.toString(36)}`
}

export function resetIdCounter(): void {
  idCounter = 0
}

// Type-safe ID generators
export const generateTribeId = (): TribeId => generateId('tribe') as TribeId
export const generatePlayerId = (): PlayerId => generateId('player') as PlayerId
export const generateUnitId = (): UnitId => generateId('unit') as UnitId
export const generateSettlementId = (): SettlementId => generateId('settlement') as SettlementId

// =============================================================================
// Default Values
// =============================================================================

const EMPTY_YIELDS: Yields = {
  gold: 0,
  alpha: 0,
  vibes: 0,
  production: 0,
  growth: 0,
}


const INITIAL_GOLDEN_AGE_STATE: GoldenAgeState = {
  active: false,
  turnsRemaining: 0,
  triggersUsed: [],
  recentTechTurns: [],
}

const INITIAL_POLICIES: PlayerPolicies = {
  slots: {
    military: 1,
    economy: 1,
    progress: 0,
    wildcard: 0,
  },
  pool: [],
  active: [],
}

// =============================================================================
// Player Creation
// =============================================================================

export function createPlayer(tribeId: TribeId, tribeName: TribeName, isHuman: boolean): Player {
  return {
    id: generatePlayerId(),
    tribeId,
    tribeName,
    isHuman,
    yields: EMPTY_YIELDS,
    treasury: 0,
    researchedTechs: [],
    researchProgress: 0,
    unlockedCultures: [],
    cultureProgress: 0,
    policies: INITIAL_POLICIES,
    greatPeople: getInitialGreatPeopleState(),
    goldenAge: INITIAL_GOLDEN_AGE_STATE,
    killCount: 0,
    pendingMints: [],
    activeBuffs: [],
  }
}

// =============================================================================
// Initial State Creation
// =============================================================================

export interface GameConfig {
  seed: number
  humanTribe: TribeName
  aiTribes: TribeName[]
}

export function createInitialState(config: GameConfig): GameState {
  resetIdCounter()

  const { seed, humanTribe, aiTribes } = config

  // Create tribe IDs
  const allTribes = [humanTribe, ...aiTribes]
  const tribeIds = new Map<TribeName, TribeId>()
  for (const tribe of allTribes) {
    tribeIds.set(tribe, generateTribeId())
  }

  // Create players
  const players: Player[] = []
  const humanTribeId = tribeIds.get(humanTribe)!
  players.push(createPlayer(humanTribeId, humanTribe, true))

  for (const aiTribe of aiTribes) {
    const aiTribeId = tribeIds.get(aiTribe)!
    players.push(createPlayer(aiTribeId, aiTribe, false))
  }

  // Create empty map (will be populated by map generation)
  const emptyMap: HexMap = {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tiles: new Map(),
  }

  // Create empty diplomacy state
  const diplomacy: DiplomacyState = {
    relations: new Map(),
    warWeariness: new Map(),
    reputationModifiers: new Map(),
    peaceRejectionTurns: new Map(),
  }

  // Initialize diplomacy relations between all tribes (start neutral)
  const tribeIdList = Array.from(tribeIds.values())
  for (let i = 0; i < tribeIdList.length; i++) {
    for (let j = i + 1; j < tribeIdList.length; j++) {
      const key = `${tribeIdList[i]}-${tribeIdList[j]}`
      ;(diplomacy.relations as Map<string, unknown>).set(key, {
        stance: 'neutral',
        turnsAtCurrentStance: 0,
        reputation: 0,
      })
    }
  }

  // Create floor prices map
  const floorPrices = new Map<TribeId, number>()
  for (const tribeId of tribeIds.values()) {
    floorPrices.set(tribeId, 0)
  }

  // Create fog of war (all hidden initially)
  const fog = new Map<TribeId, ReadonlySet<string>>()
  for (const tribeId of tribeIds.values()) {
    fog.set(tribeId, new Set())
  }

  return {
    version: GAME_VERSION,
    seed,
    turn: 1,
    maxTurns: MAX_TURNS,
    currentPlayer: humanTribeId,
    players,
    map: emptyMap,
    units: new Map(),
    settlements: new Map(),
    fog,
    diplomacy,
    tradeRoutes: [],
    greatPersons: new Map(),
    lootboxes: [],
    wonders: [],
    floorPrices,
    pendingPeaceProposals: [],
  }
}

// =============================================================================
// State Queries
// =============================================================================

export function getPlayer(state: GameState, tribeId: TribeId): Player | undefined {
  return state.players.find((p) => p.tribeId === tribeId)
}

export function getCurrentPlayer(state: GameState): Player | undefined {
  return getPlayer(state, state.currentPlayer)
}

export function getNextPlayer(state: GameState): TribeId {
  const currentIndex = state.players.findIndex((p) => p.tribeId === state.currentPlayer)
  // Skip eliminated players
  for (let i = 1; i <= state.players.length; i++) {
    const nextIndex = (currentIndex + i) % state.players.length
    const nextPlayer = state.players[nextIndex]!
    if (nextPlayer.eliminatedOnTurn === undefined) {
      return nextPlayer.tribeId
    }
  }
  // Fallback (shouldn't happen — at least one player is alive)
  return state.players[(currentIndex + 1) % state.players.length]!.tribeId
}

export function isGameOver(state: GameState): boolean {
  // Turn limit reached
  if (state.turn > state.maxTurns) return true
  // Conquest victory: only one tribe has settlements
  // Skip early turns — AI needs time to found their first settlements
  if (state.turn > 5 && state.settlements.size > 0) {
    const tribesWithSettlements = new Set<TribeId>()
    for (const settlement of state.settlements.values()) {
      tribesWithSettlements.add(settlement.owner)
    }
    if (tribesWithSettlements.size <= 1) return true
  }
  return false
}

export function getWinner(state: GameState): TribeId | undefined {
  if (!isGameOver(state)) return undefined

  // Conquest victory: last tribe standing
  const tribesWithSettlements = new Set<TribeId>()
  for (const settlement of state.settlements.values()) {
    tribesWithSettlements.add(settlement.owner)
  }
  if (tribesWithSettlements.size === 1) {
    return Array.from(tribesWithSettlements)[0]
  }

  // Score victory: highest floor price
  let maxScore = -1
  let winner: TribeId | undefined

  for (const [tribeId, score] of state.floorPrices) {
    if (score > maxScore) {
      maxScore = score
      winner = tribeId
    }
  }

  return winner
}

/**
 * Check if a tribe has been eliminated (no settlements remaining).
 * Returns updated state with eliminatedOnTurn set if applicable.
 */
function checkTribeElimination(state: GameState, tribeId: TribeId): GameState {
  // Skip if already eliminated
  const player = state.players.find(p => p.tribeId === tribeId)
  if (!player || player.eliminatedOnTurn !== undefined) return state

  // Check if tribe has any settlements left
  let hasSettlements = false
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      hasSettlements = true
      break
    }
  }

  if (hasSettlements) return state

  // Tribe eliminated — mark them and clear their land
  const players = state.players.map(p =>
    p.tribeId === tribeId ? { ...p, eliminatedOnTurn: state.turn } : p
  )

  // Remove all tile ownership for eliminated tribe
  const tiles = new Map(state.map.tiles)
  for (const [key, tile] of tiles) {
    if (tile.owner === tribeId) {
      const { owner: _removed, ...tileWithoutOwner } = tile
      tiles.set(key, tileWithoutOwner)
    }
  }

  // Remove all units belonging to eliminated tribe
  const units = new Map(state.units)
  for (const [unitId, unit] of units) {
    if (unit.owner === tribeId) {
      units.delete(unitId)
    }
  }

  return {
    ...state,
    players,
    units,
    map: { ...state.map, tiles },
  }
}

// =============================================================================
// Fog of War
// =============================================================================

/**
 * Reveals fog of war around a position for a tribe
 * @param state - Current game state
 * @param tribeId - The tribe to reveal fog for
 * @param position - Center position to reveal around
 * @param radius - Vision radius (typically BASE_UNIT_VISION + rarity bonus)
 */
export function revealFogAroundPosition(
  state: GameState,
  tribeId: TribeId,
  position: HexCoord,
  radius: number
): GameState {
  const currentFog = state.fog.get(tribeId)
  if (!currentFog) return state

  const newVisibleHexes = new Set(currentFog)

  // Reveal hexes within radius
  for (let dq = -radius; dq <= radius; dq++) {
    for (let dr = -radius; dr <= radius; dr++) {
      // Use hex distance check for proper hex radius
      if (Math.abs(dq + dr) <= radius) {
        const q = position.q + dq
        const r = position.r + dr
        if (q >= 0 && q < state.map.width && r >= 0 && r < state.map.height) {
          newVisibleHexes.add(`${q},${r}`)
        }
      }
    }
  }

  const newFog = new Map(state.fog)
  newFog.set(tribeId, newVisibleHexes)

  return { ...state, fog: newFog }
}

/**
 * Gets the vision range for a unit (base + rarity bonus)
 */
export function getUnitVision(state: GameState, unitId: UnitId): number {
  const unit = state.units.get(unitId)
  if (!unit) return BASE_UNIT_VISION
  return BASE_UNIT_VISION + unit.rarityBonuses.vision
}

// =============================================================================
// Action Application
// =============================================================================

export type ActionResult =
  | { success: true; state: GameState }
  | { success: false; error: string }

/**
 * Applies an action to the game state, returning a new state
 * This is the main entry point for all game mutations
 */
export function applyAction(state: GameState, action: GameAction): ActionResult {
  // Validate it's the correct player's turn (for most actions)
  if (action.type !== 'END_TURN') {
    // Action validation will be added per action type
  }

  switch (action.type) {
    case 'END_TURN':
      return applyEndTurn(state)

    case 'MOVE_UNIT':
      return applyMoveUnit(state, action.unitId, action.to)

    case 'ATTACK':
      return applyAttack(state, action.attackerId, action.targetId)

    case 'ATTACK_SETTLEMENT':
      return applyAttackSettlement(state, action.attackerId, action.settlementId)

    case 'CAPTURE_SETTLEMENT':
      return applyCaptureSettlement(state, action.settlementId)

    case 'RAZE_SETTLEMENT':
      return applyRazeSettlement(state, action.settlementId)

    case 'FOUND_SETTLEMENT':
      return applyFoundSettlement(state, action.settlerId)

    case 'BUILD_IMPROVEMENT':
      return applyBuildImprovement(state, action.builderId, action.improvement)

    case 'START_PRODUCTION':
      return applyStartProduction(state, action.settlementId, action.item)

    case 'CANCEL_PRODUCTION':
      return applyCancelProduction(state, action.settlementId, action.queueIndex)

    case 'PURCHASE':
      return applyPurchase(state, action.settlementId, action.itemType, action.itemId)

    case 'MINT_UNIT':
      return applyMintUnit(state, action.settlementId, action.index, action.rarity)

    case 'START_RESEARCH':
      return applyStartResearch(state, action.techId)

    case 'START_CULTURE':
      return applyStartCulture(state, action.cultureId)

    case 'SELECT_POLICY':
      return applySelectPolicy(state, action.choice)

    case 'SELECT_PROMOTION':
      return applySelectPromotion(state, action.unitId, action.promotionId)

    case 'SELECT_MILESTONE':
      return applySelectMilestone(state, action.settlementId, action.level, action.choice)

    case 'CREATE_TRADE_ROUTE':
      return applyCreateTradeRoute(state, action.origin, action.destination)

    case 'CANCEL_TRADE_ROUTE':
      return applyCancelTradeRoute(state, action.routeId)

    case 'USE_GREAT_PERSON':
      return applyUseGreatPerson(state, action.unitId)

    case 'SWAP_POLICIES':
      return applySwapPolicies(state, action.toSlot, action.toUnslot)

    case 'SLEEP_UNIT': {
      const unit = state.units.get(action.unitId)
      if (!unit || unit.owner !== state.currentPlayer) {
        return { success: false, error: 'Invalid unit' }
      }
      const newUnits = new Map(state.units)
      newUnits.set(action.unitId, { ...unit, sleeping: true, hasActed: true })
      return { success: true, state: { ...state, units: newUnits } }
    }

    case 'WAKE_UNIT': {
      const unit = state.units.get(action.unitId)
      if (!unit || unit.owner !== state.currentPlayer) {
        return { success: false, error: 'Invalid unit' }
      }
      const newUnits = new Map(state.units)
      newUnits.set(action.unitId, { ...unit, sleeping: false })
      return { success: true, state: { ...state, units: newUnits } }
    }

    case 'DECLARE_WAR':
      return applyDeclareWar(state, action.target)

    case 'PROPOSE_PEACE':
      return applyProposePeace(state, action.target)

    case 'RESPOND_PEACE_PROPOSAL':
      return applyRespondPeaceProposal(state, action.target, action.accept)

    case 'PROPOSE_ALLIANCE':
      return applyProposeAlliance(state, action.target)

    default: {
      const _exhaustive: never = action
      return { success: false, error: `Unknown action type: ${JSON.stringify(_exhaustive)}` }
    }
  }
}

// =============================================================================
// Turn Management
// =============================================================================

function applyEndTurn(state: GameState): ActionResult {
  const currentPlayer = state.currentPlayer

  // Block if human player has pending mints
  const player = state.players.find((p) => p.tribeId === currentPlayer)
  if (player?.isHuman && player.pendingMints.length > 0) {
    return {
      success: false,
      error: `You have ${player.pendingMints.length} unit(s) awaiting minting`,
    }
  }

  let newState = state

  // Process production for all settlements owned by current player
  newState = processSettlementProduction(newState, currentPlayer)

  // Auto-mint for AI players (no VRF popup needed)
  const updatedPlayer = newState.players.find(p => p.tribeId === currentPlayer)
  if (updatedPlayer && !updatedPlayer.isHuman && updatedPlayer.pendingMints.length > 0) {
    // Process in reverse order so splice indices stay valid
    for (let i = updatedPlayer.pendingMints.length - 1; i >= 0; i--) {
      const mintResult = applyMintUnit(
        newState,
        updatedPlayer.pendingMints[i]!.settlementId,
        i
      )
      if (mintResult.success && mintResult.state) {
        newState = mintResult.state
      }
    }
  }

  // Process growth for all settlements owned by current player
  newState = processSettlementGrowthForPlayer(newState, currentPlayer)

  // Process economy (gold income/maintenance)
  newState = processPlayerEconomy(newState, currentPlayer)

  // Process trade route formation (2-turn delay)
  newState = processTradeRouteFormation(newState, currentPlayer)

  // Apply research progress from Alpha yield
  newState = applyResearchProgress(newState, currentPlayer)

  // Apply culture progress from Vibes yield
  newState = applyCultureProgress(newState, currentPlayer)

  // Process golden ages (decrement turns remaining)
  newState = processGoldenAges(newState, currentPlayer)

  // Check golden age triggers
  newState = checkGoldenAgeTriggers(newState, currentPlayer)

  // Tick active buffs (decrement timers, remove expired)
  newState = tickActiveBuffs(newState, currentPlayer)

  // Update diplomacy timers (increment turnsAtCurrentStance)
  newState = updateDiplomacyTimers(newState)

  // Check for great person spawning
  const gpRng = createRng(state.seed + state.turn * 100 + currentPlayer.charCodeAt(0))
  newState = checkAndSpawnGreatPeople(newState, currentPlayer, gpRng)

  // Process unit healing (before resetting movement, so hasActed is still accurate)
  newState = processUnitHealing(newState, currentPlayer)

  // Reset unit movement for current player
  newState = resetPlayerUnits(newState, currentPlayer)

  // Update player yields for UI display (so turns remaining calculations work)
  newState = updatePlayerYields(newState, currentPlayer)

  // Update floor prices for all players (for real-time display)
  newState = updateAllFloorPrices(newState)

  // Move to next player
  const nextPlayer = getNextPlayer(newState)
  const isNewRound = newState.players.findIndex((p) => p.tribeId === nextPlayer) === 0

  // If we're back to the first player, increment the turn
  const newTurn = isNewRound ? newState.turn + 1 : newState.turn

  // Check for game over
  if (newTurn > newState.maxTurns) {
    return {
      success: true,
      state: {
        ...newState,
        turn: newTurn,
        currentPlayer: nextPlayer,
      },
    }
  }

  return {
    success: true,
    state: {
      ...newState,
      turn: newTurn,
      currentPlayer: nextPlayer,
    },
  }
}

/**
 * Processes growth for all settlements owned by a player
 */
function processSettlementGrowthForPlayer(state: GameState, tribeId: TribeId): GameState {
  const newSettlements = new Map(state.settlements)
  const settlementsToExpand: Settlement[] = []

  for (const [settlementId, settlement] of state.settlements) {
    if (settlement.owner !== tribeId) continue

    // Calculate growth yield for this settlement
    const yields = calculateSettlementYields(state, settlement)

    // Track old level to detect level ups
    const oldLevel = settlement.level

    // Apply growth
    const result = processSettlementGrowth(settlement, yields.growth)
    newSettlements.set(settlementId, result.settlement)

    // If leveled up past level 5, schedule border expansion
    if (result.settlement.level > oldLevel && result.settlement.level > 5) {
      settlementsToExpand.push(result.settlement)
    }
  }

  let newState: GameState = {
    ...state,
    settlements: newSettlements,
  }

  // Expand borders for settlements that leveled up past level 5
  for (const settlement of settlementsToExpand) {
    newState = expandSettlementBorders(newState, settlement)
  }

  return newState
}

/**
 * Processes production for all settlements owned by a player
 */
function processSettlementProduction(state: GameState, tribeId: TribeId): GameState {
  let newState = state

  for (const [settlementId, settlement] of state.settlements) {
    if (settlement.owner !== tribeId) continue

    // Process production (updates queue, progress, currentProduction)
    const result = processProduction(newState, settlement)

    // Update settlement with production result first
    const newSettlements = new Map(newState.settlements)
    newSettlements.set(settlementId, result.settlement)
    newState = { ...newState, settlements: newSettlements }

    // Handle completed items (adds buildings, spawns units, etc.)
    for (const item of result.completed) {
      newState = handleCompletedProduction(newState, settlementId, item)
    }
  }

  return newState
}

/**
 * Handles a completed production item
 */
function handleCompletedProduction(
  state: GameState,
  settlementId: SettlementId,
  item: ProductionItem
): GameState {
  const settlement = state.settlements.get(settlementId)
  if (!settlement) return state

  switch (item.type) {
    case 'unit': {
      const unitType = item.id as UnitType
      const def = UNIT_DEFINITIONS[unitType]

      // Civilian units (settler, builder) spawn immediately with common rarity
      if (def.isCivilian) {
        const unit = createUnit({
          type: unitType,
          owner: settlement.owner,
          position: settlement.position,
          rarity: 'common',
        })
        return addUnit(state, unit)
      }

      // Military units go to pendingMints for the minting experience
      // Rarity will be rolled LIVE when user clicks Mint button
      const pendingMint: PendingMint = {
        settlementId,
        unitType,
        position: settlement.position,
        owner: settlement.owner,
      }

      const playerIndex = state.players.findIndex((p) => p.tribeId === settlement.owner)
      if (playerIndex === -1) return state

      const player = state.players[playerIndex]!
      const updatedPlayer: Player = {
        ...player,
        pendingMints: [...player.pendingMints, pendingMint],
      }

      const newPlayers = [...state.players]
      newPlayers[playerIndex] = updatedPlayer

      return { ...state, players: newPlayers }
    }

    case 'building': {
      // Add building to settlement
      const updatedSettlement = addBuildingToSettlement(
        settlement,
        item.id as never
      )
      const newSettlements = new Map(state.settlements)
      newSettlements.set(settlementId, updatedSettlement)
      return { ...state, settlements: newSettlements }
    }

    case 'wonder': {
      // Complete wonder
      const wonderId = item.id as WonderId
      let result = completeWonder(state, settlementId, wonderId)
      if (!result) return state

      // Increment wondersBuilt in GP accumulator
      result = incrementWondersBuilt(result, settlement.owner)

      return result
    }

    default:
      return state
  }
}


/**
 * Increments wondersBuilt counter in GP accumulator
 */
function incrementWondersBuilt(state: GameState, tribeId: TribeId): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  const updatedPlayer: Player = {
    ...player,
    greatPeople: {
      ...player.greatPeople,
      accumulator: {
        ...player.greatPeople.accumulator,
        wondersBuilt: player.greatPeople.accumulator.wondersBuilt + 1,
      },
    },
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

/**
 * Processes healing for all units belonging to a player
 */
function processUnitHealing(state: GameState, tribeId: TribeId): GameState {
  const newUnits = new Map(state.units)

  for (const [unitId, unit] of state.units) {
    if (unit.owner !== tribeId) continue

    // Skip units at full health
    if (unit.health >= unit.maxHealth) continue

    // Calculate total healing
    const baseHealing = calculateHealing(state, unit)
    const adjacentHealing = calculateAdjacentHealingReceived(state, unit)
    const totalHealing = baseHealing + adjacentHealing

    if (totalHealing > 0) {
      newUnits.set(unitId, healUnit(unit, totalHealing))
    }
  }

  return {
    ...state,
    units: newUnits,
  }
}

/**
 * Resets unit movement and actions for a player's units
 */
function resetPlayerUnits(state: GameState, tribeId: TribeId): GameState {
  const newUnits = new Map(state.units)

  for (const [unitId, unit] of state.units) {
    if (unit.owner !== tribeId) continue

    const unitDef = UNIT_DEFINITIONS[unit.type]
    newUnits.set(unitId, {
      ...unit,
      movementRemaining: unitDef.baseMovement + unit.rarityBonuses.movement,
      hasActed: false,
    })
  }

  return {
    ...state,
    units: newUnits,
  }
}

/**
 * Updates a player's yields for UI display (so turns remaining calculations work)
 */
function updatePlayerYields(state: GameState, tribeId: TribeId): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  const baseYields = calculatePlayerYields(state, tribeId)

  // Start with base yields and apply bonuses
  let alpha = baseYields.alpha
  let vibes = baseYields.vibes

  // Apply tribe bonuses
  const tribeBonuses = getPlayerTribeBonuses(state, tribeId)
  if (tribeBonuses.alphaYieldPercent) {
    alpha = Math.floor(alpha * (1 + tribeBonuses.alphaYieldPercent))
  }
  if (tribeBonuses.vibesYieldPercent) {
    vibes = Math.floor(vibes * (1 + tribeBonuses.vibesYieldPercent))
  }

  // Apply golden age bonus if active
  const alphaBonus = getGoldenAgeYieldBonus(player, 'alpha')
  if (alphaBonus > 0) {
    alpha = Math.floor(alpha * (1 + alphaBonus))
  }
  const vibesBonus = getGoldenAgeYieldBonus(player, 'vibes')
  if (vibesBonus > 0) {
    vibes = Math.floor(vibes * (1 + vibesBonus))
  }

  // Apply great person yield buffs
  const alphaBuffPercent = getActiveYieldBuffPercent(player, 'alpha')
  if (alphaBuffPercent > 0) {
    alpha = Math.floor(alpha * (1 + alphaBuffPercent / 100))
  }
  const vibesBuffPercent = getActiveYieldBuffPercent(player, 'vibes')
  if (vibesBuffPercent > 0) {
    vibes = Math.floor(vibes * (1 + vibesBuffPercent / 100))
  }

  const updatedPlayer: Player = {
    ...player,
    yields: {
      ...baseYields,
      alpha,
      vibes,
    },
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

// =============================================================================
// Turn Processing Helpers
// =============================================================================

/**
 * Applies research progress based on player's Alpha yield
 */
function applyResearchProgress(state: GameState, tribeId: TribeId): GameState {
  const player = getPlayer(state, tribeId)
  if (!player) return state

  // Calculate Alpha yield from all settlements
  let totalAlpha = 0
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      const yields = calculateSettlementYields(state, settlement)
      totalAlpha += yields.alpha
    }
  }

  // Apply tribe bonus (e.g., Geckos +5% Alpha)
  const tribeBonuses = getPlayerTribeBonuses(state, tribeId)
  if (tribeBonuses.alphaYieldPercent) {
    totalAlpha = Math.floor(totalAlpha * (1 + tribeBonuses.alphaYieldPercent))
  }

  // Apply golden age bonus if active
  const alphaBonus = getGoldenAgeYieldBonus(player, 'alpha')
  if (alphaBonus > 0) {
    totalAlpha = Math.floor(totalAlpha * (1 + alphaBonus))
  }

  // Apply great person yield buff
  const alphaBuffPercent = getActiveYieldBuffPercent(player, 'alpha')
  if (alphaBuffPercent > 0) {
    totalAlpha = Math.floor(totalAlpha * (1 + alphaBuffPercent / 100))
  }

  if (totalAlpha <= 0) return state

  // Update Great People accumulator with alpha earned
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  const updatedPlayer: Player = {
    ...player,
    greatPeople: {
      ...player.greatPeople,
      accumulator: {
        ...player.greatPeople.accumulator,
        alpha: player.greatPeople.accumulator.alpha + totalAlpha,
      },
    },
  }
  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer
  let newState: GameState = { ...state, players: newPlayers }

  // Only add to research queue if there's current research
  if (!player.currentResearch) return newState

  return addResearchProgress(newState, tribeId, totalAlpha)
}

/**
 * Applies culture progress based on player's Vibes yield
 */
function applyCultureProgress(state: GameState, tribeId: TribeId): GameState {
  const player = getPlayer(state, tribeId)
  if (!player) return state

  // Calculate Vibes yield from all settlements
  let totalVibes = 0
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      const yields = calculateSettlementYields(state, settlement)
      totalVibes += yields.vibes
    }
  }

  // Apply tribe bonus (e.g., Monkes +5% Vibes)
  const tribeBonuses = getPlayerTribeBonuses(state, tribeId)
  if (tribeBonuses.vibesYieldPercent) {
    totalVibes = Math.floor(totalVibes * (1 + tribeBonuses.vibesYieldPercent))
  }

  // Apply golden age bonus if active
  const vibesBonus = getGoldenAgeYieldBonus(player, 'vibes')
  if (vibesBonus > 0) {
    totalVibes = Math.floor(totalVibes * (1 + vibesBonus))
  }

  // Apply great person yield buff
  const vibesBuffPercent = getActiveYieldBuffPercent(player, 'vibes')
  if (vibesBuffPercent > 0) {
    totalVibes = Math.floor(totalVibes * (1 + vibesBuffPercent / 100))
  }

  if (totalVibes <= 0) return state

  // Update Great People accumulator with vibes earned
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  const updatedPlayer: Player = {
    ...player,
    greatPeople: {
      ...player.greatPeople,
      accumulator: {
        ...player.greatPeople.accumulator,
        vibes: player.greatPeople.accumulator.vibes + totalVibes,
      },
    },
  }
  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer
  let newState: GameState = { ...state, players: newPlayers }

  // Only add to culture progress if there's current culture being researched
  if (!player.currentCulture) return newState

  return addCultureProgress(newState, tribeId, totalVibes)
}

/**
 * Processes golden age state (decrement turns remaining, cleanup old tech records)
 */
function processGoldenAges(state: GameState, tribeId: TribeId): GameState {
  // Clean up old tech records for the "3 techs in 5 turns" trigger
  let newState = cleanupRecentTechs(state, tribeId, state.turn)

  // Process active golden age (decrement turns remaining)
  newState = processGoldenAgeTurn(newState, tribeId)

  return newState
}

/**
 * Checks and triggers golden ages based on achievements
 */
function checkGoldenAgeTriggers(state: GameState, tribeId: TribeId): GameState {
  const player = getPlayer(state, tribeId)
  if (!player) return state

  // Don't check if already in a golden age
  if (player.goldenAge.active) return state

  // Use the goldenage module to check all triggers
  const metTriggers = checkAllTriggers(state, tribeId)

  // If no triggers met, return unchanged state
  if (metTriggers.length === 0) return state

  // Activate with the first met trigger (priority order is already in checkAllTriggers)
  const triggerId = metTriggers[0]!
  const rng = createRng(state.seed + state.turn * 1000 + tribeId.charCodeAt(0))

  return activateGoldenAge(state, tribeId, triggerId, rng)
}

/**
 * Updates diplomacy timers (increment turnsAtCurrentStance for all relations)
 */
function updateDiplomacyTimers(state: GameState): GameState {
  const newRelations = new Map(state.diplomacy.relations)

  for (const [key, relation] of state.diplomacy.relations) {
    const updatedRelation: DiplomaticRelation = {
      ...relation,
      turnsAtCurrentStance: relation.turnsAtCurrentStance + 1,
    }
    newRelations.set(key, updatedRelation)
  }

  return {
    ...state,
    diplomacy: {
      ...state.diplomacy,
      relations: newRelations,
    },
  }
}

// =============================================================================
// Production Management
// =============================================================================

/**
 * Starts production of an item in a settlement
 */
function applyStartProduction(
  state: GameState,
  settlementId: SettlementId,
  item: ProductionItem
): ActionResult {
  // Get settlement
  const settlement = state.settlements.get(settlementId)
  if (!settlement) {
    return { success: false, error: 'Settlement not found' }
  }

  // Validate ownership
  if (settlement.owner !== state.currentPlayer) {
    return { success: false, error: 'Settlement not owned by current player' }
  }

  // Handle based on production type
  switch (item.type) {
    case 'wonder': {
      const wonderId = item.id as WonderId
      const result = canBuildWonder(state, settlementId, wonderId)
      if (!result.canBuild) {
        return { success: false, error: result.reason || 'Cannot build wonder' }
      }

      const newState = startWonderConstruction(state, settlementId, wonderId)
      if (!newState) {
        return { success: false, error: 'Failed to start wonder construction' }
      }

      return { success: true, state: newState }
    }

    case 'building': {
      const buildingId = item.id as string
      const buildingDef = BUILDING_DEFINITIONS[buildingId]
      if (!buildingDef) {
        return { success: false, error: 'Building not found' }
      }

      const result = canConstructBuilding(state, settlement, buildingId)
      if (!result.canBuild) {
        return { success: false, error: result.reason || 'Cannot build building' }
      }

      // Calculate cost with policy discounts
      let cost = buildingDef.productionCost
      const player = state.players.find(p => p.tribeId === settlement.owner)
      if (player) {
        const policyMods = calculatePolicyProductionModifiers(player)
        if (policyMods.buildingDiscountPercent > 0) {
          cost = Math.floor(cost * (1 - policyMods.buildingDiscountPercent / 100))
        }
      }

      // Add to production queue
      const productionItem: ProductionItem = {
        type: 'building',
        id: buildingId,
        progress: 0,
        cost,
      }

      const updatedSettlement: Settlement = {
        ...settlement,
        productionQueue: [...settlement.productionQueue, productionItem],
      }

      const newSettlements = new Map(state.settlements)
      newSettlements.set(settlementId, updatedSettlement)

      return { success: true, state: { ...state, settlements: newSettlements } }
    }

    case 'unit': {
      const unitType = item.id as UnitType
      const unitDef = UNIT_DEFINITIONS[unitType]
      if (!unitDef) {
        return { success: false, error: 'Unit type not found' }
      }

      if (unitDef.productionCost === 0) {
        return { success: false, error: 'This unit cannot be produced directly' }
      }

      // Add to production queue
      const productionItem: ProductionItem = {
        type: 'unit',
        id: unitType,
        progress: 0,
        cost: unitDef.productionCost,
      }

      const updatedSettlement: Settlement = {
        ...settlement,
        productionQueue: [...settlement.productionQueue, productionItem],
      }

      const newSettlements = new Map(state.settlements)
      newSettlements.set(settlementId, updatedSettlement)

      return { success: true, state: { ...state, settlements: newSettlements } }
    }

    default:
      return { success: false, error: 'Unknown production type' }
  }
}

function applyCancelProduction(
  state: GameState,
  settlementId: SettlementId,
  queueIndex: number
): ActionResult {
  // Get settlement
  const settlement = state.settlements.get(settlementId)
  if (!settlement) {
    return { success: false, error: 'Settlement not found' }
  }

  // Validate ownership
  if (settlement.owner !== state.currentPlayer) {
    return { success: false, error: 'Settlement not owned by current player' }
  }

  // Validate queue index
  if (queueIndex < 0 || queueIndex >= settlement.productionQueue.length) {
    return { success: false, error: 'Invalid queue index' }
  }

  // Remove item from queue
  const newQueue = [...settlement.productionQueue]
  newQueue.splice(queueIndex, 1)

  const updatedSettlement: Settlement = {
    ...settlement,
    productionQueue: newQueue,
  }

  const newSettlements = new Map(state.settlements)
  newSettlements.set(settlementId, updatedSettlement)

  return { success: true, state: { ...state, settlements: newSettlements } }
}

// Gold purchase multiplier (4x production cost)
const PURCHASE_GOLD_MULTIPLIER = 4

/**
 * Calculates the gold cost to purchase an item
 */
export function calculatePurchaseCost(productionCost: number): number {
  return productionCost * PURCHASE_GOLD_MULTIPLIER
}

/**
 * Purchases a building or unit instantly with gold
 */
function applyPurchase(
  state: GameState,
  settlementId: SettlementId,
  itemType: 'unit' | 'building',
  itemId: string
): ActionResult {
  // Get settlement
  const settlement = state.settlements.get(settlementId)
  if (!settlement) {
    return { success: false, error: 'Settlement not found' }
  }

  // Validate ownership
  if (settlement.owner !== state.currentPlayer) {
    return { success: false, error: 'Settlement not owned by current player' }
  }

  // Get player
  const playerIndex = state.players.findIndex(p => p.tribeId === state.currentPlayer)
  if (playerIndex === -1) {
    return { success: false, error: 'Player not found' }
  }
  const player = state.players[playerIndex]!

  let productionCost = 0

  if (itemType === 'building') {
    const building = BUILDING_DEFINITIONS[itemId as keyof typeof BUILDING_DEFINITIONS]
    if (!building) {
      return { success: false, error: 'Building not found' }
    }
    productionCost = building.productionCost

    // Check if settlement already has this building
    if (settlement.buildings.includes(itemId as BuildingId)) {
      return { success: false, error: 'Settlement already has this building' }
    }
  } else {
    // Unit
    const unit = UNIT_DEFINITIONS[itemId as keyof typeof UNIT_DEFINITIONS]
    if (!unit) {
      return { success: false, error: 'Unit not found' }
    }
    productionCost = unit.productionCost
  }

  // Calculate gold cost
  const goldCost = calculatePurchaseCost(productionCost)

  // Check if player has enough gold
  if (player.treasury < goldCost) {
    return { success: false, error: `Not enough gold (need ${goldCost}, have ${player.treasury})` }
  }

  // Deduct gold
  const updatedPlayer: Player = {
    ...player,
    treasury: player.treasury - goldCost,
  }
  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer
  let newState: GameState = { ...state, players: newPlayers }

  if (itemType === 'building') {
    // Add building to settlement
    const newSettlements = new Map(newState.settlements)
    const updatedSettlement: Settlement = {
      ...settlement,
      buildings: [...settlement.buildings, itemId as BuildingId],
    }
    newSettlements.set(settlementId, updatedSettlement)
    newState = { ...newState, settlements: newSettlements }
  } else {
    // Create and add unit at settlement position
    const rng = createRng(state.seed + state.turn + itemId.charCodeAt(0))
    const newUnit = createUnit({
      type: itemId as UnitType,
      owner: state.currentPlayer,
      position: settlement.position,
      rng,
    })
    newState = addUnit(newState, newUnit)
  }

  return { success: true, state: newState }
}

/**
 * Processes a pending mint - rolls rarity LIVE and creates the unit
 * If rarity is provided (e.g. from VRF), it is used directly instead of local RNG.
 */
function applyMintUnit(
  state: GameState,
  settlementId: SettlementId,
  index: number,
  rarity?: UnitRarity
): ActionResult {
  const currentTribe = state.currentPlayer
  const playerIndex = state.players.findIndex((p) => p.tribeId === currentTribe)
  if (playerIndex === -1) {
    return { success: false, error: 'Player not found' }
  }

  const player = state.players[playerIndex]!

  // Validate index
  if (index < 0 || index >= player.pendingMints.length) {
    return { success: false, error: 'Invalid mint index' }
  }

  const pendingMint = player.pendingMints[index]!

  // Verify ownership
  if (pendingMint.owner !== currentTribe) {
    return { success: false, error: 'Pending mint not owned by current player' }
  }

  // Verify settlement matches
  if (pendingMint.settlementId !== settlementId) {
    return { success: false, error: 'Settlement ID mismatch' }
  }

  // Create unit with rarity - either VRF-provided or local RNG
  let unit: Unit
  if (rarity) {
    // Use VRF-provided rarity directly
    unit = createUnit({
      type: pendingMint.unitType,
      owner: pendingMint.owner,
      position: pendingMint.position,
      rarity, // VRF-determined rarity
    })
  } else {
    // Roll rarity LIVE using deterministic RNG
    // Seed includes: base seed + turn + settlement + index for determinism
    const rng = createRng(
      state.seed +
        state.turn * 10000 +
        settlementId.charCodeAt(0) * 100 +
        index
    )
    unit = createUnit({
      type: pendingMint.unitType,
      owner: pendingMint.owner,
      position: pendingMint.position,
      rng, // This triggers live rarity roll in createUnit
    })
  }

  // Apply policy bonuses (same as original handleCompletedProduction)
  // Apply cavalry_movement policy bonus (+movement for cavalry units)
  const cavalryTypes: UnitType[] = ['horseman', 'knight', 'tank']
  if (cavalryTypes.includes(pendingMint.unitType)) {
    const cavalryBonus = calculatePolicyCavalryMovementBonus(player)
    if (cavalryBonus > 0) {
      unit = {
        ...unit,
        maxMovement: unit.maxMovement + cavalryBonus,
        movementRemaining: unit.movementRemaining + cavalryBonus,
      }
    }
  }

  // Apply free_promotion policy bonus (military units start with a free promotion)
  const freePromotions = getPolicyFreePromotions(player)
  const def = UNIT_DEFINITIONS[pendingMint.unitType]
  if (freePromotions > 0 && !def.isCivilian && def.canAttack) {
    // Grant free promotions
    for (let i = 0; i < freePromotions; i++) {
      const available = getAvailablePromotions(unit)
      if (available.length > 0) {
        // Pick a random tier 1 promotion
        const tier1Promotions = available.filter((p) => p.tier === 1)
        if (tier1Promotions.length > 0) {
          const randomPromotion =
            tier1Promotions[Math.floor(Math.random() * tier1Promotions.length)]!
          const promoted = applyPromotion(unit, randomPromotion.id)
          if (promoted) {
            unit = promoted
          }
        }
      }
    }
  }

  // Add unit to game
  let newState = addUnit(state, unit)

  // Remove from pending mints
  const newPendingMints = [...player.pendingMints]
  newPendingMints.splice(index, 1)

  const updatedPlayer: Player = {
    ...player,
    pendingMints: newPendingMints,
  }

  const newPlayers = [...newState.players]
  newPlayers[playerIndex] = updatedPlayer

  return {
    success: true,
    state: { ...newState, players: newPlayers },
  }
}

// =============================================================================
// Floor Price Calculation
// =============================================================================

export function calculateFloorPrice(state: GameState, tribeId: TribeId): number {
  let score = 0

  // Track totals for policy bonuses
  let totalPopulation = 0
  let tilesControlled = 0

  // Settlements: 10 pts each + 5 pts per level
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      score += 10
      score += settlement.level * 5
      totalPopulation += settlement.level
    }
  }

  // Controlled tiles: 1 pt each
  for (const tile of state.map.tiles.values()) {
    if (tile.owner === tribeId) {
      score += 1
      tilesControlled += 1
    }
  }

  // Find player
  const player = getPlayer(state, tribeId)
  if (player) {
    // Technologies: 5 pts each
    score += player.researchedTechs.length * 5

    // Cultures: 5 pts each
    score += player.unlockedCultures.length * 5

    // Gold: 1 pt per 10 gold
    score += Math.floor(player.treasury / 10)

    // Kill count: 3 pts each
    score += player.killCount * 3

    // Policy bonuses for population and tiles (pop_floor_price, tile_floor_price)
    score += calculatePolicyFloorPriceBonus(player, totalPopulation, tilesControlled)
  }

  // Units: 2 pts each + rarity bonus
  for (const unit of state.units.values()) {
    if (unit.owner === tribeId) {
      score += 2

      // Rarity bonuses
      switch (unit.rarity) {
        case 'rare':
          score += 2
          break
        case 'epic':
          score += 5
          break
        case 'legendary':
          score += 10
          break
      }
    }
  }

  // Wonders: 50-100 pts each (based on wonder definition)
  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      score += wonder.floorPriceBonus
    }
  }

  return score
}

export interface FloorPriceBreakdown {
  settlements: number
  population: number
  tiles: number
  technologies: number
  cultures: number
  gold: number
  kills: number
  units: number
  rarityBonus: number
  wonders: number
  policyBonus: number
  total: number
}

export function calculateFloorPriceBreakdown(state: GameState, tribeId: TribeId): FloorPriceBreakdown {
  const breakdown: FloorPriceBreakdown = {
    settlements: 0,
    population: 0,
    tiles: 0,
    technologies: 0,
    cultures: 0,
    gold: 0,
    kills: 0,
    units: 0,
    rarityBonus: 0,
    wonders: 0,
    policyBonus: 0,
    total: 0,
  }

  let totalPopulation = 0
  let tilesControlled = 0

  // Settlements: 10 pts each
  // Population: 5 pts per level
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      breakdown.settlements += 10
      breakdown.population += settlement.level * 5
      totalPopulation += settlement.level
    }
  }

  // Controlled tiles: 1 pt each
  for (const tile of state.map.tiles.values()) {
    if (tile.owner === tribeId) {
      breakdown.tiles += 1
      tilesControlled += 1
    }
  }

  // Find player
  const player = getPlayer(state, tribeId)
  if (player) {
    // Technologies: 5 pts each
    breakdown.technologies = player.researchedTechs.length * 5

    // Cultures: 5 pts each
    breakdown.cultures = player.unlockedCultures.length * 5

    // Gold: 1 pt per 10 gold
    breakdown.gold = Math.floor(player.treasury / 10)

    // Kill count: 3 pts each
    breakdown.kills = player.killCount * 3

    // Policy bonuses
    breakdown.policyBonus = calculatePolicyFloorPriceBonus(player, totalPopulation, tilesControlled)
  }

  // Units: 2 pts each + rarity bonus
  for (const unit of state.units.values()) {
    if (unit.owner === tribeId) {
      breakdown.units += 2

      // Rarity bonuses
      switch (unit.rarity) {
        case 'rare':
          breakdown.rarityBonus += 2
          break
        case 'epic':
          breakdown.rarityBonus += 5
          break
        case 'legendary':
          breakdown.rarityBonus += 10
          break
      }
    }
  }

  // Wonders
  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      breakdown.wonders += wonder.floorPriceBonus
    }
  }

  breakdown.total =
    breakdown.settlements +
    breakdown.population +
    breakdown.tiles +
    breakdown.technologies +
    breakdown.cultures +
    breakdown.gold +
    breakdown.kills +
    breakdown.units +
    breakdown.rarityBonus +
    breakdown.wonders +
    breakdown.policyBonus

  return breakdown
}

export function updateAllFloorPrices(state: GameState): GameState {
  const newFloorPrices = new Map<TribeId, number>()

  for (const player of state.players) {
    newFloorPrices.set(player.tribeId, calculateFloorPrice(state, player.tribeId))
  }

  return {
    ...state,
    floorPrices: newFloorPrices,
  }
}

// =============================================================================
// Pending Mints Helpers
// =============================================================================

/**
 * Checks if current player has pending mints
 */
export function hasPendingMints(state: GameState): boolean {
  const player = state.players.find((p) => p.tribeId === state.currentPlayer)
  return player ? player.pendingMints.length > 0 : false
}

/**
 * Gets pending mints for current player
 */
export function getPendingMints(state: GameState): readonly PendingMint[] {
  const player = state.players.find((p) => p.tribeId === state.currentPlayer)
  return player?.pendingMints ?? []
}

// =============================================================================
// Unit Movement
// =============================================================================

/**
 * Moves a unit to a target hex
 */
function applyMoveUnit(
  state: GameState,
  unitId: UnitId,
  to: HexCoord
): ActionResult {
  const unit = state.units.get(unitId)
  if (!unit) {
    return { success: false, error: 'Unit not found' }
  }

  // Validate ownership
  if (unit.owner !== state.currentPlayer) {
    return { success: false, error: 'Unit not owned by current player' }
  }

  // Check if unit has movement remaining
  if (unit.movementRemaining <= 0) {
    return { success: false, error: 'Unit has no movement remaining' }
  }

  // Find path to target
  const path = findPath(state, unit, to)
  if (!path) {
    return { success: false, error: 'No valid path to target' }
  }

  // Calculate movement cost
  const cost = getPathCost(state, unit, path)
  if (cost > unit.movementRemaining) {
    return { success: false, error: 'Not enough movement points' }
  }

  // Apply movement
  const movedUnit = applyUnitMove(unit, path, cost)
  let newState = updateUnit(state, movedUnit)

  // Reveal fog around new position - includes policy vision bonus
  const player = state.players.find(p => p.tribeId === unit.owner)
  const policyVisionBonus = player ? calculatePolicyVisionBonus(player) : 0
  const vision = BASE_UNIT_VISION + unit.rarityBonuses.vision + policyVisionBonus
  newState = revealFogAroundPosition(newState, unit.owner, movedUnit.position, vision)

  // Check for lootbox at destination
  if (hasLootboxAt(newState, movedUnit.position)) {
    const rng = createRng(newState.seed + newState.turn * 1000 + unitId.charCodeAt(0))
    const claimResult = claimLootbox(newState, movedUnit.position, unit.owner, rng)
    if (claimResult) {
      newState = claimResult.state
    }
  }

  return { success: true, state: newState }
}

// =============================================================================
// Settlement Founding
// =============================================================================

/**
 * Founds a new settlement with a settler unit
 */
function applyFoundSettlement(
  state: GameState,
  settlerId: UnitId
): ActionResult {
  const settler = state.units.get(settlerId)
  if (!settler) {
    return { success: false, error: 'Settler not found' }
  }

  // Validate it's a settler
  if (settler.type !== 'settler') {
    return { success: false, error: 'Only settlers can found settlements' }
  }

  // Validate ownership
  if (settler.owner !== state.currentPlayer) {
    return { success: false, error: 'Settler not owned by current player' }
  }

  // Check if unit has already acted
  if (settler.hasActed) {
    return { success: false, error: 'Settler has already acted this turn' }
  }

  // Check if location is valid
  if (!canFoundSettlement(state, settler.position)) {
    return { success: false, error: 'Cannot found settlement here' }
  }

  // Check if this is the first settlement (capital)
  const playerSettlements = Array.from(state.settlements.values()).filter(
    (s) => s.owner === settler.owner
  )
  const isCapital = playerSettlements.length === 0

  // Get the player's tribe name for settlement naming
  const player = state.players.find((p) => p.tribeId === settler.owner)

  // Create settlement
  let settlement = createSettlement({
    owner: settler.owner,
    position: settler.position,
    ...(player?.tribeName && { tribeName: player.tribeName }),
    isCapital,
  })

  // Apply extra population from policies (settle_population)
  if (player) {
    const extraPop = calculatePolicySettlePopulation(player)
    if (extraPop > 0) {
      // Extra population = extra levels
      settlement = {
        ...settlement,
        level: settlement.level + extraPop,
      }
    }
  }

  // Add settlement and remove settler
  let newState = addSettlement(state, settlement)
  newState = removeUnit(newState, settlerId)

  // Reveal tiles around new settlement
  const newFog = new Map(newState.fog)
  const currentFog = newFog.get(settler.owner) ?? new Set<string>()
  const newVisibleHexes = new Set(currentFog)

  // Reveal 2-hex radius around settlement
  for (let dq = -2; dq <= 2; dq++) {
    for (let dr = -2; dr <= 2; dr++) {
      const q = settlement.position.q + dq
      const r = settlement.position.r + dr
      if (q >= 0 && q < newState.map.width && r >= 0 && r < newState.map.height) {
        newVisibleHexes.add(`${q},${r}`)
      }
    }
  }
  newFog.set(settler.owner, newVisibleHexes)
  newState = { ...newState, fog: newFog }

  return { success: true, state: newState }
}

// =============================================================================
// Combat
// =============================================================================

/**
 * Applies bonuses when a player gets a kill (kill count, vibes, territory gold)
 */
function applyKillBonuses(state: GameState, killerTribeId: TribeId, killPosition: HexCoord): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === killerTribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!

  // Base kill count increment
  const killCount = player.killCount + 1

  // Calculate policy bonuses
  const killVibes = calculatePolicyKillVibes(player)
  const territoryKillGold = calculatePolicyTerritoryKillGold(player)

  // Check if kill happened in killer's territory
  const tile = state.map.tiles.get(hexKey(killPosition))
  const isInOwnTerritory = tile?.owner === killerTribeId
  const goldBonus = isInOwnTerritory ? territoryKillGold : 0

  // Apply bonuses
  const updatedPlayer = {
    ...player,
    killCount,
    treasury: player.treasury + goldBonus,
    cultureProgress: player.cultureProgress + killVibes, // Vibes add to culture progress
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

/**
 * Executes an attack from one unit to another
 */
function applyAttack(
  state: GameState,
  attackerId: UnitId,
  targetId: UnitId
): ActionResult {
  const attacker = state.units.get(attackerId)
  const target = state.units.get(targetId)

  if (!attacker) {
    return { success: false, error: 'Attacker not found' }
  }

  if (!target) {
    return { success: false, error: 'Target not found' }
  }

  // Validate ownership
  if (attacker.owner !== state.currentPlayer) {
    return { success: false, error: 'Attacker not owned by current player' }
  }

  // Can't attack own units
  if (attacker.owner === target.owner) {
    return { success: false, error: 'Cannot attack friendly units' }
  }

  // Check diplomatic status - must be at war to attack
  if (!areAtWar(state, attacker.owner, target.owner)) {
    return { success: false, error: 'Cannot attack units of tribes you are not at war with' }
  }

  // Check if unit can attack
  const attackerDef = UNIT_DEFINITIONS[attacker.type]
  if (!attackerDef.canAttack) {
    return { success: false, error: 'This unit cannot attack' }
  }

  // Check if unit has already acted
  if (attacker.hasActed) {
    return { success: false, error: 'Unit has already acted this turn' }
  }

  // Resolve combat
  const combatResult = resolveCombat(state, attackerId, targetId)
  if (!combatResult) {
    return { success: false, error: 'Combat could not be resolved' }
  }

  let newState = state

  // Apply combat results
  if (combatResult.attackerKilled) {
    newState = removeUnit(newState, attackerId)
    // Add kill to defender's owner + apply policy bonuses
    newState = applyKillBonuses(newState, target.owner, attacker.position)
  } else {
    // Update attacker with combat result (health, experience, acted flag)
    const updatedAttacker = {
      ...combatResult.attacker,
      hasActed: true,
      movementRemaining: 0, // Attacking ends movement
    }
    newState = updateUnit(newState, updatedAttacker)
  }

  if (combatResult.defenderKilled) {
    newState = removeUnit(newState, targetId)
    // Add kill to attacker's owner + apply policy bonuses
    newState = applyKillBonuses(newState, attacker.owner, target.position)
    // Unique unit kill bonuses
    newState = applyUniqueUnitKillBonus(newState, attacker)
  } else {
    // Update defender with combat result (health, experience)
    // Apply Stuckers immobilize debuff
    let updatedDefender = combatResult.defender
    if (attacker.type === 'stuckers') {
      updatedDefender = { ...updatedDefender, immobilizedTurns: 2 }
    }
    newState = updateUnit(newState, updatedDefender)
  }

  return { success: true, state: newState }
}

/**
 * Applies unique unit kill bonuses (Neon Geck +5 Alpha, DeadGod +20 Gold)
 */
function applyUniqueUnitKillBonus(state: GameState, killer: Unit): GameState {
  if (killer.type !== 'neon_geck' && killer.type !== 'deadgod') return state

  const playerIndex = state.players.findIndex((p) => p.tribeId === killer.owner)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  let updatedPlayer = player

  if (killer.type === 'neon_geck') {
    // +5 Alpha (added to research progress)
    updatedPlayer = { ...updatedPlayer, researchProgress: player.researchProgress + 5 }
  } else if (killer.type === 'deadgod') {
    // +20 Gold
    updatedPlayer = { ...updatedPlayer, treasury: player.treasury + 20 }
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer
  return { ...state, players: newPlayers }
}

// =============================================================================
// Settlement Combat
// =============================================================================

/**
 * Executes an attack from a unit to a settlement
 */
function applyAttackSettlement(
  state: GameState,
  attackerId: UnitId,
  settlementId: SettlementId
): ActionResult {
  const attacker = state.units.get(attackerId)
  const settlement = state.settlements.get(settlementId)

  if (!attacker) {
    return { success: false, error: 'Attacker not found' }
  }

  if (!settlement) {
    return { success: false, error: 'Settlement not found' }
  }

  // Validate ownership
  if (attacker.owner !== state.currentPlayer) {
    return { success: false, error: 'Attacker not owned by current player' }
  }

  // Check diplomatic status - must be at war to attack settlement
  if (!areAtWar(state, attacker.owner, settlement.owner)) {
    return { success: false, error: 'Cannot attack settlements of tribes you are not at war with' }
  }

  // Resolve settlement combat
  const combatResult = resolveSettlementCombat(state, attackerId, settlementId)
  if (!combatResult) {
    return { success: false, error: 'Settlement combat could not be resolved' }
  }

  // Apply combat results
  let newState = applySettlementCombatResult(state, combatResult)

  // If settlement is conquered, player will need to choose capture or raze
  // For now, just mark the settlement as having 0 HP

  return { success: true, state: newState }
}

/**
 * Captures a conquered settlement (HP = 0), transferring ownership
 */
function applyCaptureSettlement(
  state: GameState,
  settlementId: SettlementId
): ActionResult {
  const settlement = state.settlements.get(settlementId)

  if (!settlement) {
    return { success: false, error: 'Settlement not found' }
  }

  // Verify settlement is conquered (HP = 0)
  if (settlement.health > 0) {
    return { success: false, error: 'Settlement is not conquered' }
  }

  // Verify current player doesn't already own it
  if (settlement.owner === state.currentPlayer) {
    return { success: false, error: 'You already own this settlement' }
  }

  // Calculate captured settlement HP (restored to half max)
  const capturedMaxHealth = getSettlementMaxHealth(settlement.level)
  const capturedHealth = Math.floor(capturedMaxHealth / 2)

  // Transfer ownership
  const capturedSettlement: Settlement = {
    ...settlement,
    owner: state.currentPlayer,
    health: capturedHealth,
    maxHealth: capturedMaxHealth,
    // Reset production queue (capturing player starts fresh)
    productionQueue: [],
    currentProduction: 0,
    // Keep buildings, but not capital status
    isCapital: false,
  }

  const settlements = new Map(state.settlements)
  settlements.set(settlementId, capturedSettlement)

  // Update tile ownership — transfer tiles near the captured settlement
  const tiles = new Map(state.map.tiles)
  const previousOwner = settlement.owner
  const nearbyCoords = hexRange(settlement.position, 3)
  for (const coord of nearbyCoords) {
    const tileKey = hexKey(coord)
    const tile = tiles.get(tileKey)
    if (tile && tile.owner === previousOwner) {
      tiles.set(tileKey, { ...tile, owner: state.currentPlayer })
    }
  }
  // Also ensure the settlement tile itself is transferred
  const settlementKey = hexKey(settlement.position)
  const settlementTile = tiles.get(settlementKey)
  if (settlementTile) {
    tiles.set(settlementKey, { ...settlementTile, owner: state.currentPlayer })
  }

  const newMap: HexMap = { ...state.map, tiles }

  const capturedState = { ...state, settlements, map: newMap }
  // Check if previous owner has been eliminated
  const finalState = checkTribeElimination(capturedState, previousOwner)

  return {
    success: true,
    state: finalState,
  }
}

/**
 * Razes a conquered settlement, destroying it completely
 */
function applyRazeSettlement(
  state: GameState,
  settlementId: SettlementId
): ActionResult {
  const settlement = state.settlements.get(settlementId)

  if (!settlement) {
    return { success: false, error: 'Settlement not found' }
  }

  // Verify settlement is conquered (HP = 0)
  if (settlement.health > 0) {
    return { success: false, error: 'Settlement is not conquered' }
  }

  // Verify current player doesn't already own it (can't raze your own)
  if (settlement.owner === state.currentPlayer) {
    return { success: false, error: 'Cannot raze your own settlement' }
  }

  // Remove settlement
  const settlements = new Map(state.settlements)
  settlements.delete(settlementId)

  // Clear tile ownership in the razed settlement's former territory
  const tiles = new Map(state.map.tiles)
  for (const [key, tile] of tiles) {
    if (tile.owner === settlement.owner) {
      // Remove ownership from tiles that belonged to the razed settlement
      // For simplicity, just clear the settlement tile for now
      if (key === hexKey(settlement.position)) {
        // Remove owner by creating tile without owner property
        const { owner: _removed, ...tileWithoutOwner } = tile
        tiles.set(key, tileWithoutOwner)
      }
    }
  }

  const newMap: HexMap = { ...state.map, tiles }

  const razedState = { ...state, settlements, map: newMap }
  // Check if the settlement's former owner has been eliminated
  const finalState = checkTribeElimination(razedState, settlement.owner)

  return {
    success: true,
    state: finalState,
  }
}

// =============================================================================
// Tile Improvements
// =============================================================================

/**
 * Builds an improvement on a tile using a builder unit
 */
function applyBuildImprovement(
  state: GameState,
  builderId: UnitId,
  improvement: ImprovementType
): ActionResult {
  const builder = state.units.get(builderId)
  if (!builder) {
    return { success: false, error: 'Builder not found' }
  }

  // Validate it's a builder
  if (builder.type !== 'builder') {
    return { success: false, error: 'Only builders can build improvements' }
  }

  // Validate ownership
  if (builder.owner !== state.currentPlayer) {
    return { success: false, error: 'Builder not owned by current player' }
  }

  // Check if unit has already acted
  if (builder.hasActed) {
    return { success: false, error: 'Builder has already acted this turn' }
  }

  // Validate improvement can be built here
  const canBuild = canBuildImprovement(state, builder.position, improvement, builder.owner)
  if (!canBuild.canBuild) {
    return { success: false, error: canBuild.reason || 'Cannot build improvement here' }
  }

  // Build the improvement
  const tile = state.map.tiles.get(hexKey(builder.position))
  if (!tile) {
    return { success: false, error: 'Tile not found' }
  }

  const newTile = {
    ...tile,
    improvement,
    ...(tile.resource && { resource: { ...tile.resource, improved: true } }),
  }

  const newTiles = new Map(state.map.tiles)
  newTiles.set(hexKey(builder.position), newTile)

  let newState: GameState = {
    ...state,
    map: { ...state.map, tiles: newTiles },
  }

  // Check builder has charges remaining
  if (builder.buildCharges <= 0) {
    return { success: false, error: 'Builder has no charges remaining' }
  }

  // Decrement build charges
  const newCharges = builder.buildCharges - 1

  if (newCharges <= 0) {
    // Builder is consumed - remove from game
    newState = removeUnit(newState, builderId)
  } else {
    // Update builder with decremented charges
    // Note: Builders can use multiple charges per turn (don't set hasActed)
    const newBuilder = {
      ...builder,
      buildCharges: newCharges,
    }
    newState = updateUnit(newState, newBuilder)
  }

  return { success: true, state: newState }
}

// =============================================================================
// Technology Research
// =============================================================================

/**
 * Sets the current research target for a player
 */
function applyStartResearch(
  state: GameState,
  techId: TechId
): ActionResult {
  const player = state.players.find((p) => p.tribeId === state.currentPlayer)
  if (!player) {
    return { success: false, error: 'Player not found' }
  }

  // Check if tech exists
  const tech = TECH_DEFINITIONS[techId]
  if (!tech) {
    return { success: false, error: 'Technology not found' }
  }

  // Check if can research
  const canResearch = canResearchTech(player, techId)
  if (!canResearch.canResearch) {
    return { success: false, error: canResearch.reason || 'Cannot research this technology' }
  }

  // Set current research
  const newPlayers = state.players.map((p) =>
    p.tribeId === state.currentPlayer
      ? { ...p, currentResearch: techId }
      : p
  )

  return {
    success: true,
    state: { ...state, players: newPlayers },
  }
}

// =============================================================================
// Culture Progression
// =============================================================================

/**
 * Sets the current culture target for a player
 */
function applyStartCulture(
  state: GameState,
  cultureId: CultureId
): ActionResult {
  const player = state.players.find((p) => p.tribeId === state.currentPlayer)
  if (!player) {
    return { success: false, error: 'Player not found' }
  }

  // Check if culture exists
  const culture = CULTURE_DEFINITIONS[cultureId]
  if (!culture) {
    return { success: false, error: 'Culture not found' }
  }

  // Check if can unlock
  const canUnlock = canUnlockCulture(player, cultureId)
  if (!canUnlock.canUnlock) {
    return { success: false, error: canUnlock.reason || 'Cannot unlock this culture' }
  }

  // Set current culture
  const newPlayers = state.players.map((p) =>
    p.tribeId === state.currentPlayer
      ? { ...p, currentCulture: cultureId }
      : p
  )

  return {
    success: true,
    state: { ...state, players: newPlayers },
  }
}

// =============================================================================
// Diplomacy Actions
// =============================================================================

/**
 * Declares war on another tribe
 */
function applyDeclareWar(state: GameState, target: TribeId): ActionResult {
  const currentTribe = state.currentPlayer

  // Validate the action
  const canDeclare = canDeclareWar(state, currentTribe, target)
  if (!canDeclare.canDeclare) {
    return { success: false, error: canDeclare.reason || 'Cannot declare war' }
  }

  // Apply the war declaration
  const newState = declareWar(state, currentTribe, target)
  if (!newState) {
    return { success: false, error: 'Failed to declare war' }
  }

  return { success: true, state: newState }
}

/**
 * Proposes peace with another tribe.
 * Peace proposals are stored as pending — the target must accept or reject.
 */
function applyProposePeace(state: GameState, target: TribeId): ActionResult {
  const currentTribe = state.currentPlayer

  // Validate the action
  const canPropose = canProposePeace(state, currentTribe, target)
  if (!canPropose.canPropose) {
    return { success: false, error: canPropose.reason || 'Cannot propose peace' }
  }

  // Don't duplicate proposals to same target
  if (state.pendingPeaceProposals.some(p => p.proposer === currentTribe && p.target === target)) {
    return { success: false, error: 'Peace already proposed' }
  }

  // Store as pending proposal with both proposer and target
  const newState: GameState = {
    ...state,
    pendingPeaceProposals: [...state.pendingPeaceProposals, { proposer: currentTribe, target }],
  }

  return { success: true, state: newState }
}

/**
 * Responds to a peace proposal (accept or reject)
 */
function applyRespondPeaceProposal(
  state: GameState,
  target: TribeId,
  accept: boolean
): ActionResult {
  // Remove the proposal from pending list (target here is the proposer we're responding to)
  const newPending = state.pendingPeaceProposals.filter(
    p => !(p.proposer === target && p.target === state.currentPlayer)
  )

  if (accept) {
    // Apply peace treaty
    const peaceState = makePeace(state, state.currentPlayer, target)
    if (!peaceState) {
      return { success: false, error: 'Failed to make peace' }
    }
    return {
      success: true,
      state: { ...peaceState, pendingPeaceProposals: newPending },
    }
  }

  // Rejected — remove proposal and record rejection turn for cooldown
  const rejectionKey = `${target}-${state.currentPlayer}`
  const newRejections = new Map(state.diplomacy.peaceRejectionTurns)
  newRejections.set(rejectionKey, state.turn)
  return {
    success: true,
    state: {
      ...state,
      pendingPeaceProposals: newPending,
      diplomacy: { ...state.diplomacy, peaceRejectionTurns: newRejections },
    },
  }
}

/**
 * Proposes alliance with another tribe (immediately accepted for now)
 */
function applyProposeAlliance(state: GameState, target: TribeId): ActionResult {
  const currentTribe = state.currentPlayer

  // Validate the action
  const canPropose = canProposeAlliance(state, currentTribe, target)
  if (!canPropose.canPropose) {
    return { success: false, error: canPropose.reason || 'Cannot propose alliance' }
  }

  // Apply the alliance
  const newState = formAlliance(state, currentTribe, target)
  if (!newState) {
    return { success: false, error: 'Failed to form alliance' }
  }

  return { success: true, state: newState }
}

// =============================================================================
// Policy, Promotion, Milestone, and Trade Route Actions
// =============================================================================

/**
 * Selects a policy when completing a culture (chooses A or B policy card)
 */
function applySelectPolicy(
  state: GameState,
  choice: 'a' | 'b'
): ActionResult {
  const currentTribe = state.currentPlayer
  const player = state.players.find((p) => p.tribeId === currentTribe)

  if (!player) {
    return { success: false, error: 'Player not found' }
  }

  // Verify player has a culture in progress
  if (!player.currentCulture) {
    return { success: false, error: 'No culture in progress' }
  }

  if (!isCultureReadyForCompletion(player)) {
    return { success: false, error: 'Culture research not complete' }
  }

  // Complete the culture with the chosen policy
  let newState = completeCulture(state, currentTribe, choice)

  if (!newState) {
    return { success: false, error: 'Failed to complete culture' }
  }

  // Recalculate yields immediately so policy effects are visible
  newState = updatePlayerYields(newState, currentTribe)

  return { success: true, state: newState }
}

/**
 * Swaps active policy cards (slot/unslot policies)
 * Can be used after completing a culture to rearrange active policies
 */
function applySwapPolicies(
  state: GameState,
  toSlot: PolicyId[],
  toUnslot: PolicyId[]
): ActionResult {
  const currentTribe = state.currentPlayer

  let newState = swapPolicies(state, currentTribe, toSlot, toUnslot)

  if (!newState) {
    return { success: false, error: 'Failed to swap policies - check slot availability' }
  }

  // Recalculate yields immediately so policy effects are visible
  newState = updatePlayerYields(newState, currentTribe)

  return { success: true, state: newState }
}

/**
 * Selects a promotion for a unit that has leveled up
 */
function applySelectPromotion(
  state: GameState,
  unitId: UnitId,
  promotionId: PromotionId
): ActionResult {
  const unit = state.units.get(unitId)
  if (!unit) {
    return { success: false, error: 'Unit not found' }
  }

  // Validate ownership
  if (unit.owner !== state.currentPlayer) {
    return { success: false, error: 'Unit not owned by current player' }
  }

  // Check if unit can level up (has enough XP)
  if (!canLevelUp(unit)) {
    return { success: false, error: 'Unit does not have enough XP to level up' }
  }

  // Check if unit can get a promotion (has pending promotion)
  const availablePromotions = getAvailablePromotions(unit)
  if (availablePromotions.length === 0) {
    return { success: false, error: 'Unit has no promotions available' }
  }

  // Verify the selected promotion is available
  const isAvailable = availablePromotions.some((p) => p.id === promotionId)
  if (!isAvailable) {
    return { success: false, error: 'Promotion not available for this unit' }
  }

  // Apply the promotion (returns updated unit with promotion added + effects)
  const promoted = applyPromotion(unit, promotionId)
  if (!promoted) {
    return { success: false, error: 'Failed to apply promotion' }
  }

  // Increment level and deduct XP cost
  const xpCost = getXpForNextLevel(unit)
  const updatedUnit: Unit = {
    ...promoted,
    level: unit.level + 1,
    experience: Math.max(0, unit.experience - xpCost),
  }

  // Update the unit in state
  const newUnits = new Map(state.units)
  newUnits.set(unitId, updatedUnit)

  let newState: GameState = { ...state, units: newUnits }

  // Apply promotion vibes from policies
  const player = state.players.find(p => p.tribeId === unit.owner)
  if (player) {
    const promotionVibes = calculatePolicyPromotionVibes(player)
    if (promotionVibes > 0) {
      const playerIndex = state.players.findIndex(p => p.tribeId === unit.owner)
      const updatedPlayer = {
        ...player,
        cultureProgress: player.cultureProgress + promotionVibes,
      }
      const newPlayers = [...newState.players]
      newPlayers[playerIndex] = updatedPlayer
      newState = { ...newState, players: newPlayers }
    }
  }

  return { success: true, state: newState }
}

/**
 * Selects a milestone reward when a settlement levels up
 */
function applySelectMilestone(
  state: GameState,
  settlementId: SettlementId,
  level: number,
  choice: 'a' | 'b'
): ActionResult {
  const settlement = state.settlements.get(settlementId)
  if (!settlement) {
    return { success: false, error: 'Settlement not found' }
  }

  // Validate ownership
  if (settlement.owner !== state.currentPlayer) {
    return { success: false, error: 'Settlement not owned by current player' }
  }

  // Apply the milestone selection (selectMilestone validates the level is valid)
  const newState = selectMilestone(state, settlementId, level, choice)
  if (!newState) {
    return { success: false, error: 'Failed to apply milestone selection' }
  }

  return { success: true, state: newState }
}

/**
 * Creates a trade route between two settlements
 */
function applyCreateTradeRoute(
  state: GameState,
  originId: SettlementId,
  destinationId: SettlementId
): ActionResult {
  const origin = state.settlements.get(originId)
  if (!origin) {
    return { success: false, error: 'Origin settlement not found' }
  }

  // Validate ownership of origin
  if (origin.owner !== state.currentPlayer) {
    return { success: false, error: 'Origin settlement not owned by current player' }
  }

  const destination = state.settlements.get(destinationId)
  if (!destination) {
    return { success: false, error: 'Destination settlement not found' }
  }

  // Create the trade route
  const result = createTradeRoute(state, originId, destinationId)
  if (!result) {
    return { success: false, error: 'Cannot create trade route (check diplomatic relations or route limits)' }
  }

  return { success: true, state: result.state }
}

/**
 * Cancels an existing trade route
 */
function applyCancelTradeRoute(
  state: GameState,
  routeId: TradeRouteId
): ActionResult {
  // Find the route
  const route = state.tradeRoutes.find((r) => r.id === routeId)
  if (!route) {
    return { success: false, error: 'Trade route not found' }
  }

  // Validate ownership (route must originate from player's settlement)
  const origin = state.settlements.get(route.origin)
  if (!origin || origin.owner !== state.currentPlayer) {
    return { success: false, error: 'Trade route not owned by current player' }
  }

  // Check if route is active
  if (!route.active) {
    return { success: false, error: 'Trade route already cancelled' }
  }

  // Cancel the route
  const newState = cancelTradeRoute(state, routeId)

  return { success: true, state: newState }
}

// =============================================================================
// Great Person Actions
// =============================================================================

/**
 * Uses a great person's one-time action
 */
function applyUseGreatPerson(
  state: GameState,
  unitId: UnitId
): ActionResult {
  const unit = state.units.get(unitId)
  if (!unit) {
    return { success: false, error: 'Unit not found' }
  }

  // Validate ownership
  if (unit.owner !== state.currentPlayer) {
    return { success: false, error: 'Unit not owned by current player' }
  }

  // Validate it's a great person
  if (unit.type !== 'great_person') {
    return { success: false, error: 'Unit is not a great person' }
  }

  // Check if the great person has already acted
  const greatPerson = state.greatPersons?.get(unitId)
  if (!greatPerson) {
    return { success: false, error: 'Great person data not found' }
  }

  if (greatPerson.hasActed) {
    return { success: false, error: 'This great person has already used their action' }
  }

  // Get the great person definition to check for special effects
  const definition = GREAT_PERSON_DEFINITIONS[greatPerson.greatPersonId]
  if (!definition) {
    return { success: false, error: 'Great person definition not found' }
  }

  // Create RNG based on state
  const rng = createRng(state.seed + state.turn + unitId.charCodeAt(0))

  // Use the great person action (handles most effects)
  let newState = useGreatPersonAction(state, unitId, rng)
  if (!newState) {
    return { success: false, error: 'Failed to use great person action' }
  }

  // Handle special effects that require state-level access (due to circular dependencies)
  const effect = definition.effect
  const tribeId = state.currentPlayer

  if (effect.type === 'instant_building') {
    // Instantly complete a building of the specified category (Mert's Eureka)
    // First tries to complete a queued building, then grants the best unbuilt one
    const buildingCategory = 'buildingCategory' in effect ? effect.buildingCategory : 'tech'
    let buildingCompleted = false

    const isTechBuildingId = (id: string): boolean => {
      const building = BUILDING_DEFINITIONS[id as keyof typeof BUILDING_DEFINITIONS]
      if (!building) return false
      return building.category === 'tech' ||
        (building.baseYields && building.baseYields.alpha > 0) ||
        id === 'library' || id === 'alpha_hunter_hideout'
    }

    // Pass 1: Try to complete a matching building already in a production queue
    for (const settlement of newState.settlements.values()) {
      if (settlement.owner !== tribeId) continue
      if (buildingCompleted) break

      for (let i = 0; i < settlement.productionQueue.length; i++) {
        const item = settlement.productionQueue[i]
        if (!item || item.type !== 'building') continue

        if (buildingCategory === 'tech' && isTechBuildingId(item.id)) {
          const updatedSettlements: Map<SettlementId, Settlement> = new Map(newState.settlements)
          const newQueue = [...settlement.productionQueue]
          const completedBuilding = newQueue.splice(i, 1)[0]!

          const updatedSettlement: Settlement = {
            ...settlement,
            buildings: [...settlement.buildings, completedBuilding.id as BuildingId],
            productionQueue: newQueue,
          }
          updatedSettlements.set(settlement.id, updatedSettlement)
          newState = { ...newState, settlements: updatedSettlements }
          buildingCompleted = true
          break
        }
      }
    }

    // Pass 2: If nothing was queued, grant the best unbuilt tech building to a settlement
    if (!buildingCompleted && buildingCategory === 'tech') {
      const techBuildings = Object.values(BUILDING_DEFINITIONS)
        .filter(b => isTechBuildingId(b.id) && !b.isUnique)
        .sort((a, b) => b.productionCost - a.productionCost) // best first

      for (const settlement of newState.settlements.values()) {
        if (settlement.owner !== tribeId) continue
        if (buildingCompleted) break

        for (const building of techBuildings) {
          if (!settlement.buildings.includes(building.id)) {
            const updatedSettlements: Map<SettlementId, Settlement> = new Map(newState.settlements)
            const updatedSettlement: Settlement = {
              ...settlement,
              buildings: [...settlement.buildings, building.id],
            }
            updatedSettlements.set(settlement.id, updatedSettlement)
            newState = { ...newState, settlements: updatedSettlements }
            buildingCompleted = true
            break
          }
        }
      }
    }
  }

  return { success: true, state: newState }
}
