// Game state management - pure functions for deterministic state transitions

import type {
  GameState,
  GameAction,
  Player,
  TribeId,
  PlayerId,
  UnitId,
  SettlementId,
  HexMap,
  DiplomacyState,
  TribeName,
  Tribe,
  Yields,
  GreatPeopleAccumulator,
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
} from '../types'
import { hexKey } from '../hex'
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
import { processProduction, processPlayerEconomy } from '../economy'
import {
  createSettlement,
  addSettlement,
  canFoundSettlement,
} from '../settlements'
import { resolveCombat } from '../combat'
import { canResearchTech, TECH_DEFINITIONS } from '../tech'
import { canUnlockCulture, CULTURE_DEFINITIONS } from '../cultures'
import { canBuildImprovement } from '../improvements'
import {
  declareWar,
  makePeace,
  formAlliance,
  canDeclareWar,
  canProposePeace,
  canProposeAlliance,
} from '../diplomacy'

// =============================================================================
// Constants
// =============================================================================

export const GAME_VERSION = '0.1.0'
export const MAX_TURNS = 20
export const MAP_WIDTH = 15
export const MAP_HEIGHT = 15
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

const EMPTY_GREAT_PEOPLE_ACCUMULATOR: GreatPeopleAccumulator = {
  combat: 0,
  alpha: 0,
  gold: 0,
  vibes: 0,
}

const INITIAL_GOLDEN_AGE_STATE: GoldenAgeState = {
  active: false,
  turnsRemaining: 0,
  triggersUsed: [],
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
// Tribe Definitions
// =============================================================================

export const TRIBES: Record<TribeName, Omit<Tribe, 'id'>> = {
  monkes: {
    name: 'monkes',
    displayName: 'Monkes',
    primaryStrength: 'vibes',
    secondaryStrength: 'economy',
    uniqueUnitType: 'archer',
    uniqueBuildingId: 'degen_mints_cabana' as never,
    color: '#4ade80', // green
  },
  geckos: {
    name: 'geckos',
    displayName: 'Geckos',
    primaryStrength: 'tech',
    secondaryStrength: 'production',
    uniqueUnitType: 'scout',
    uniqueBuildingId: 'the_garage' as never,
    color: '#22d3ee', // cyan
  },
  degods: {
    name: 'degods',
    displayName: 'DeGods',
    primaryStrength: 'military',
    secondaryStrength: 'economy',
    uniqueUnitType: 'warrior',
    uniqueBuildingId: 'eternal_bridge' as never,
    color: '#fbbf24', // gold
  },
  cets: {
    name: 'cets',
    displayName: 'Cets',
    primaryStrength: 'vibes',
    secondaryStrength: 'production',
    uniqueUnitType: 'archer',
    uniqueBuildingId: 'creckhouse' as never,
    color: '#f97316', // orange
  },
  gregs: {
    name: 'gregs',
    displayName: 'Gregs',
    primaryStrength: 'production',
    secondaryStrength: 'military',
    uniqueUnitType: 'warrior',
    uniqueBuildingId: 'holder_chat' as never,
    color: '#ef4444', // red
  },
  dragonz: {
    name: 'dragonz',
    displayName: 'Dragonz',
    primaryStrength: 'economy',
    secondaryStrength: 'tech',
    uniqueUnitType: 'archer',
    uniqueBuildingId: 'dragonz_den' as never,
    color: '#a855f7', // purple
  },
}

// =============================================================================
// Player Creation
// =============================================================================

export function createPlayer(tribeId: TribeId, isHuman: boolean): Player {
  return {
    id: generatePlayerId(),
    tribeId,
    isHuman,
    yields: EMPTY_YIELDS,
    treasury: 0,
    researchedTechs: [],
    researchProgress: 0,
    unlockedCultures: [],
    cultureProgress: 0,
    policies: INITIAL_POLICIES,
    greatPeopleProgress: EMPTY_GREAT_PEOPLE_ACCUMULATOR,
    goldenAge: INITIAL_GOLDEN_AGE_STATE,
    killCount: 0,
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
  players.push(createPlayer(humanTribeId, true))

  for (const aiTribe of aiTribes) {
    const aiTribeId = tribeIds.get(aiTribe)!
    players.push(createPlayer(aiTribeId, false))
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
    barbarianCamps: [],
    lootboxes: [],
    wonders: [],
    floorPrices,
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
  const nextIndex = (currentIndex + 1) % state.players.length
  return state.players[nextIndex]!.tribeId
}

export function isGameOver(state: GameState): boolean {
  return state.turn > state.maxTurns
}

export function getWinner(state: GameState): TribeId | undefined {
  if (!isGameOver(state)) return undefined

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

    case 'FOUND_SETTLEMENT':
      return applyFoundSettlement(state, action.settlerId)

    case 'BUILD_IMPROVEMENT':
      return applyBuildImprovement(state, action.builderId, action.improvement)

    case 'START_PRODUCTION':
      return applyStartProduction(state, action.settlementId, action.item)

    case 'START_RESEARCH':
      return applyStartResearch(state, action.techId)

    case 'START_CULTURE':
      return applyStartCulture(state, action.cultureId)

    case 'SELECT_POLICY':
      return { success: false, error: 'SELECT_POLICY not yet implemented' }

    case 'SELECT_PROMOTION':
      return { success: false, error: 'SELECT_PROMOTION not yet implemented' }

    case 'SELECT_MILESTONE':
      return { success: false, error: 'SELECT_MILESTONE not yet implemented' }

    case 'CREATE_TRADE_ROUTE':
      return { success: false, error: 'CREATE_TRADE_ROUTE not yet implemented' }

    case 'CANCEL_TRADE_ROUTE':
      return { success: false, error: 'CANCEL_TRADE_ROUTE not yet implemented' }

    case 'USE_GREAT_PERSON':
      return { success: false, error: 'USE_GREAT_PERSON not yet implemented' }

    case 'DECLARE_WAR':
      return applyDeclareWar(state, action.target)

    case 'PROPOSE_PEACE':
      return applyProposePeace(state, action.target)

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
  let newState = state

  // Process production for all settlements owned by current player
  newState = processSettlementProduction(newState, currentPlayer)

  // Process economy (gold income/maintenance)
  newState = processPlayerEconomy(newState, currentPlayer)

  // TODO: Apply research progress
  // TODO: Process golden ages
  // TODO: Spawn barbarians
  // TODO: Check golden age triggers
  // TODO: Update diplomacy timers

  // Reset unit movement for current player
  newState = resetPlayerUnits(newState, currentPlayer)

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
 * Processes production for all settlements owned by a player
 */
function processSettlementProduction(state: GameState, tribeId: TribeId): GameState {
  let newState = state
  const newSettlements = new Map(state.settlements)

  for (const [settlementId, settlement] of state.settlements) {
    if (settlement.owner !== tribeId) continue

    // Process production
    const result = processProduction(state, settlement)

    // Update settlement
    newSettlements.set(settlementId, result.settlement)

    // Handle completed items
    for (const item of result.completed) {
      newState = handleCompletedProduction(newState, settlementId, item)
    }
  }

  return {
    ...newState,
    settlements: newSettlements,
  }
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
      // Spawn unit at settlement
      const unitType = item.id as UnitType
      const unit = createUnit({
        type: unitType,
        owner: settlement.owner,
        position: settlement.position,
      })
      return addUnit(state, unit)
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
      const result = completeWonder(state, settlementId, wonderId)
      return result ?? state
    }

    default:
      return state
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

      // Add to production queue
      const productionItem: ProductionItem = {
        type: 'building',
        id: buildingId,
        progress: 0,
        cost: buildingDef.productionCost,
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

// =============================================================================
// Floor Price Calculation
// =============================================================================

export function calculateFloorPrice(state: GameState, tribeId: TribeId): number {
  let score = 0

  // Settlements: 10 pts each
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      score += 10
      // Population: 1 pt each
      score += settlement.population
    }
  }

  // Controlled tiles: 1 pt each
  for (const tile of state.map.tiles.values()) {
    if (tile.owner === tribeId) {
      score += 1
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

  // Reveal fog around new position
  const vision = BASE_UNIT_VISION + unit.rarityBonuses.vision
  newState = revealFogAroundPosition(newState, unit.owner, movedUnit.position, vision)

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

  // Create settlement
  const settlement = createSettlement({
    owner: settler.owner,
    position: settler.position,
    isCapital,
  })

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
    // Add kill to defender's owner
    const newPlayers = newState.players.map((p) =>
      p.tribeId === target.owner ? { ...p, killCount: p.killCount + 1 } : p
    )
    newState = { ...newState, players: newPlayers }
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
    // Add kill to attacker's owner
    const newPlayers = newState.players.map((p) =>
      p.tribeId === attacker.owner ? { ...p, killCount: p.killCount + 1 } : p
    )
    newState = { ...newState, players: newPlayers }
  } else {
    // Update defender with combat result (health, experience)
    newState = updateUnit(newState, combatResult.defender)
  }

  return { success: true, state: newState }
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

  // Use a build charge (builders have limited charges)
  // For simplicity, we mark the builder as having acted
  // In a full implementation, track build charges and remove builder when depleted
  const newBuilder = {
    ...builder,
    hasActed: true,
  }
  newState = updateUnit(newState, newBuilder)

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
 * Proposes peace with another tribe (immediately accepted for now)
 */
function applyProposePeace(state: GameState, target: TribeId): ActionResult {
  const currentTribe = state.currentPlayer

  // Validate the action
  const canPropose = canProposePeace(state, currentTribe, target)
  if (!canPropose.canPropose) {
    return { success: false, error: canPropose.reason || 'Cannot propose peace' }
  }

  // Apply the peace treaty
  const newState = makePeace(state, currentTribe, target)
  if (!newState) {
    return { success: false, error: 'Failed to make peace' }
  }

  return { success: true, state: newState }
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
