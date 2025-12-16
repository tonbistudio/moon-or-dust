// Economy system - gold, maintenance, production queue, and trade routes

import type {
  GameState,
  Settlement,
  TribeId,
  ProductionItem,
  TradeRoute,
  TradeRouteId,
  SettlementId,
  UnitType,
  BuildingId,
  WonderId,
  Player,
} from '../types'
import { calculateSettlementYields, getPlayerSettlements } from '../settlements'
import {
  calculateBuildingYields,
  calculatePlayerBuildingMaintenance,
  getAvailableBuildings,
  BUILDING_DEFINITIONS,
  type BuildingDefinition,
} from '../buildings'
import { areAllied, getStance } from '../diplomacy'
import { UNIT_DEFINITIONS, type UnitDefinition } from '../units'
import {
  getAvailableWonders,
  canBuildWonder,
  WONDER_DEFINITIONS,
  type WonderDefinition,
} from '../wonders'
import { TECH_DEFINITIONS } from '../tech'
import { getGoldenAgeYieldBonus } from '../goldenage'
import { getPlayerTribeBonuses, getUnitProductionBonus } from '../tribes'

// =============================================================================
// Unit Maintenance Costs
// =============================================================================

const UNIT_MAINTENANCE: Record<UnitType, number> = {
  // Base units
  scout: 1,
  warrior: 2,
  settler: 0, // Civilians don't cost maintenance
  builder: 0,
  great_person: 0,
  // Era 1
  archer: 2,
  horseman: 3,
  // Era 2
  swordsman: 3,
  sniper: 3,
  knight: 4,
  social_engineer: 4,
  // Era 3
  bot_fighter: 5,
  rockeeter: 5,
  tank: 6,
  bombard: 6,
  // Tribal unique units
  banana_slinger: 2, // Monkes (replaces Archer)
  neon_geck: 3, // Geckos (replaces Sniper)
  deadgod: 3, // DeGods (replaces Swordsman)
  stuckers: 3, // Cets (replaces Swordsman)
}

/**
 * Calculates total unit maintenance for a player
 */
export function calculateUnitMaintenance(state: GameState, tribeId: TribeId): number {
  let maintenance = 0

  for (const unit of state.units.values()) {
    if (unit.owner === tribeId) {
      maintenance += UNIT_MAINTENANCE[unit.type]
    }
  }

  return maintenance
}

// =============================================================================
// Gold Income Calculation
// =============================================================================

/**
 * Calculates net gold income for a player per turn
 */
export function calculateGoldIncome(state: GameState, tribeId: TribeId): {
  gross: number
  maintenance: number
  net: number
  breakdown: GoldBreakdown
} {
  const player = state.players.find((p) => p.tribeId === tribeId)
  const settlements = getPlayerSettlements(state, tribeId)

  let grossGold = 0
  const breakdown: GoldBreakdown = {
    settlements: 0,
    tradeRoutes: 0,
    buildingMaintenance: 0,
    unitMaintenance: 0,
  }

  // Gold from settlements
  const tribeBonuses = player ? getPlayerTribeBonuses(state, player.tribeId) : undefined
  for (const settlement of settlements) {
    const yields = calculateSettlementYields(state, settlement)
    const buildingYields = calculateBuildingYields(state, settlement, tribeBonuses)
    breakdown.settlements += yields.gold + buildingYields.gold
  }
  grossGold += breakdown.settlements

  // Gold from trade routes
  const tradeGold = calculateTradeRouteIncome(state, tribeId)
  breakdown.tradeRoutes = tradeGold
  grossGold += tradeGold

  // Apply golden age bonus to gross gold
  if (player) {
    const goldBonus = getGoldenAgeYieldBonus(player, 'gold')
    if (goldBonus > 0) {
      grossGold = Math.floor(grossGold * (1 + goldBonus))
    }
  }

  // Maintenance costs
  breakdown.buildingMaintenance = calculatePlayerBuildingMaintenance(state, tribeId)
  breakdown.unitMaintenance = calculateUnitMaintenance(state, tribeId)

  const totalMaintenance = breakdown.buildingMaintenance + breakdown.unitMaintenance

  return {
    gross: grossGold,
    maintenance: totalMaintenance,
    net: grossGold - totalMaintenance,
    breakdown,
  }
}

export interface GoldBreakdown {
  settlements: number
  tradeRoutes: number
  buildingMaintenance: number
  unitMaintenance: number
}

// =============================================================================
// Trade Route System
// =============================================================================

/** Turns for a trade route to become active */
const TRADE_ROUTE_FORMATION_TURNS = 2

/** Base trade route yield percentage (20% of combined Gold) */
const TRADE_ROUTE_BASE_PERCENT = 0.20

/** Allied trade route yield percentage (25% of combined Gold) */
const TRADE_ROUTE_ALLIED_PERCENT = 0.25

let tradeRouteIdCounter = 1

function generateTradeRouteId(): TradeRouteId {
  return `trade_${tradeRouteIdCounter++}` as TradeRouteId
}

export function resetTradeRouteIds(): void {
  tradeRouteIdCounter = 1
}

/**
 * Gets the trade route capacity for a tribe (global, not per settlement)
 * Based on techs: Smart Contracts (+1), Currency (+1), Lending (+1)
 * Plus tribe bonus (Monkes +1)
 */
export function getTradeRouteCapacity(state: GameState, tribeId: TribeId): number {
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (!player) return 0

  let capacity = 0

  // Smart Contracts tech unlocks trade routes with +1 capacity
  if (player.researchedTechs.includes('smart_contracts' as never)) {
    capacity += 1
  }

  // Currency tech: +1 trade route
  if (player.researchedTechs.includes('currency' as never)) {
    capacity += 1
  }

  // Lending tech: +1 trade route capacity
  if (player.researchedTechs.includes('lending' as never)) {
    capacity += 1
  }

  // Apply tribe bonus (Monkes +1)
  const tribeBonuses = getPlayerTribeBonuses(state, tribeId)
  if (tribeBonuses.extraTradeRouteCapacity) {
    capacity += tribeBonuses.extraTradeRouteCapacity
  }

  return capacity
}

/**
 * Checks if a tribe can create trade routes (has unlocked the ability)
 */
export function hasTradeUnlocked(state: GameState, tribeId: TribeId): boolean {
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (!player) return false
  return player.researchedTechs.includes('smart_contracts' as never)
}

/**
 * Checks if a settlement is visible to a tribe (required for trade)
 */
function isSettlementVisible(state: GameState, tribeId: TribeId, settlement: Settlement): boolean {
  const fog = state.fog.get(tribeId)
  if (!fog) return false
  const key = `${settlement.position.q},${settlement.position.r}`
  return fog.has(key)
}

/**
 * Checks if destination already has a trade route from the same tribe
 */
function hasRouteFromTribe(state: GameState, destinationId: SettlementId, tribeId: TribeId): boolean {
  return state.tradeRoutes.some((r) =>
    r.active && r.destination === destinationId && r.ownerTribe === tribeId
  )
}

/**
 * Creates a new trade route between two settlements
 * Routes take 2 turns to form before becoming active
 */
export function createTradeRoute(
  state: GameState,
  originId: SettlementId,
  destinationId: SettlementId
): { state: GameState; route: TradeRoute } | null {
  const origin = state.settlements.get(originId)
  const destination = state.settlements.get(destinationId)

  if (!origin || !destination) {
    return null
  }

  // Check if trade is unlocked
  if (!hasTradeUnlocked(state, origin.owner)) {
    return null
  }

  // Check if tribe has route capacity
  const currentRoutes = getPlayerTradeRoutes(state, origin.owner)
  const capacity = getTradeRouteCapacity(state, origin.owner)
  if (currentRoutes.length >= capacity) {
    return null
  }

  // Check diplomatic relations for external routes
  const isInternal = origin.owner === destination.owner
  if (!isInternal) {
    // External routes require Neutral or better relations (cannot initiate in Hostile)
    const stance = getStance(state, origin.owner, destination.owner)
    if (stance === 'war' || stance === 'hostile') {
      return null // Cannot initiate trade with enemies or hostile tribes
    }

    // Destination must be visible
    if (!isSettlementVisible(state, origin.owner, destination)) {
      return null
    }

    // Destination cannot already receive a route from this tribe
    if (hasRouteFromTribe(state, destinationId, origin.owner)) {
      return null
    }
  }

  // Calculate gold per turn (will recalculate when active)
  const goldPerTurn = calculateTradeRouteGold(state, origin, destination)

  const route: TradeRoute = {
    id: generateTradeRouteId(),
    origin: originId,
    destination: destinationId,
    ownerTribe: origin.owner,
    targetTribe: destination.owner,
    goldPerTurn,
    active: false, // Starts inactive, becomes active after formation
    turnsUntilActive: TRADE_ROUTE_FORMATION_TURNS,
  }

  let newState: GameState = {
    ...state,
    tradeRoutes: [...state.tradeRoutes, route],
  }

  // Update trade route count in GP accumulator
  newState = updateTradeRouteCount(newState, origin.owner)

  return {
    state: newState,
    route,
  }
}

/**
 * Updates the trade route count in the GP accumulator based on active routes
 */
function updateTradeRouteCount(state: GameState, tribeId: TribeId): GameState {
  // Count active routes for this player
  const activeRoutes = getPlayerTradeRoutes(state, tribeId).length

  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  const updatedPlayer: Player = {
    ...player,
    greatPeople: {
      ...player.greatPeople,
      accumulator: {
        ...player.greatPeople.accumulator,
        tradeRoutes: activeRoutes,
      },
    },
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

/**
 * Calculates the Gold yield of a settlement (for trade route calculations)
 */
function getSettlementGoldYield(state: GameState, settlement: Settlement): number {
  const player = state.players.find((p) => p.tribeId === settlement.owner)
  const tribeBonuses = player ? getPlayerTribeBonuses(state, player.tribeId) : undefined
  const baseYields = calculateSettlementYields(state, settlement)
  const buildingYields = calculateBuildingYields(state, settlement, tribeBonuses)
  return baseYields.gold + buildingYields.gold
}

/**
 * Counts luxury resources in tiles owned by a settlement
 */
function countLuxuryResources(state: GameState, settlement: Settlement): number {
  let count = 0
  for (const tile of state.map.tiles.values()) {
    if (tile.owner === settlement.owner && tile.resource?.category === 'luxury' && tile.resource.improved) {
      count++
    }
  }
  return count
}

/**
 * Calculates gold per turn for a trade route
 * Internal routes: 20% of combined Gold yield
 * External routes: 20% of combined Gold yield + 1 per luxury (25% if allied)
 */
export function calculateTradeRouteGold(
  state: GameState,
  origin: Settlement,
  destination: Settlement
): number {
  const isInternal = origin.owner === destination.owner

  // Get combined Gold yield of both settlements
  const originGold = getSettlementGoldYield(state, origin)
  const destinationGold = getSettlementGoldYield(state, destination)
  const combinedGold = originGold + destinationGold

  // Determine yield percentage
  let yieldPercent = TRADE_ROUTE_BASE_PERCENT // 20%

  if (!isInternal && areAllied(state, origin.owner, destination.owner)) {
    yieldPercent = TRADE_ROUTE_ALLIED_PERCENT // 25% for allied
  }

  // Calculate base gold from percentage of combined yields
  let gold = Math.floor(combinedGold * yieldPercent)

  // External routes: +1 Gold per luxury resource at destination
  if (!isInternal) {
    const luxuryCount = countLuxuryResources(state, destination)
    gold += luxuryCount
  }

  // Minimum 1 gold per route
  return Math.max(1, gold)
}

/**
 * Gets trade routes originating from a settlement
 */
export function getTradeRoutesFrom(
  state: GameState,
  settlementId: SettlementId
): TradeRoute[] {
  return state.tradeRoutes.filter((r) => r.origin === settlementId && r.active)
}

/**
 * Gets trade routes going to a settlement
 */
export function getTradeRoutesTo(
  state: GameState,
  settlementId: SettlementId
): TradeRoute[] {
  return state.tradeRoutes.filter((r) => r.destination === settlementId && r.active)
}

/**
 * Gets all trade routes for a player (both forming and active)
 */
export function getPlayerTradeRoutes(state: GameState, tribeId: TribeId): TradeRoute[] {
  return state.tradeRoutes.filter((r) => r.ownerTribe === tribeId && (r.active || r.turnsUntilActive > 0))
}

/**
 * Gets only active trade routes for a player (for income calculation)
 */
export function getActiveTradeRoutes(state: GameState, tribeId: TribeId): TradeRoute[] {
  return state.tradeRoutes.filter((r) => r.ownerTribe === tribeId && r.active)
}

/**
 * Calculates total trade route income for a player (only from active routes)
 */
export function calculateTradeRouteIncome(state: GameState, tribeId: TribeId): number {
  const routes = getActiveTradeRoutes(state, tribeId)
  return routes.reduce((sum, r) => sum + r.goldPerTurn, 0)
}

/**
 * Gets maximum trade routes a player can have (tech-based)
 * @deprecated Use getTradeRouteCapacity instead
 */
export function getMaxTradeRoutes(state: GameState, tribeId: TribeId): number {
  return getTradeRouteCapacity(state, tribeId)
}

/**
 * Cancels a trade route
 */
export function cancelTradeRoute(state: GameState, routeId: TradeRouteId): GameState {
  const route = state.tradeRoutes.find((r) => r.id === routeId)
  if (!route) return state

  const newRoutes = state.tradeRoutes.map((r) =>
    r.id === routeId ? { ...r, active: false, turnsUntilActive: 0 } : r
  )

  let newState: GameState = {
    ...state,
    tradeRoutes: newRoutes,
  }

  // Update trade route count in GP accumulator
  newState = updateTradeRouteCount(newState, route.ownerTribe)

  return newState
}

/**
 * Processes trade route formation each turn
 * Decrements turnsUntilActive and activates routes when ready
 */
export function processTradeRouteFormation(state: GameState, tribeId: TribeId): GameState {
  let routesChanged = false
  const newRoutes = state.tradeRoutes.map((route) => {
    // Only process routes owned by this tribe that are still forming
    if (route.ownerTribe !== tribeId || route.active || route.turnsUntilActive <= 0) {
      return route
    }

    routesChanged = true
    const newTurns = route.turnsUntilActive - 1

    if (newTurns <= 0) {
      // Route becomes active - recalculate gold yield
      const origin = state.settlements.get(route.origin)
      const destination = state.settlements.get(route.destination)

      if (!origin || !destination) {
        // Settlement was destroyed, cancel route
        return { ...route, active: false, turnsUntilActive: 0 }
      }

      const goldPerTurn = calculateTradeRouteGold(state, origin, destination)

      return {
        ...route,
        active: true,
        turnsUntilActive: 0,
        goldPerTurn,
      }
    }

    return { ...route, turnsUntilActive: newTurns }
  })

  if (!routesChanged) return state

  return {
    ...state,
    tradeRoutes: newRoutes,
  }
}

/**
 * Checks if two tribes can establish trade routes
 */
export function canTradeWith(
  state: GameState,
  tribe1: TribeId,
  tribe2: TribeId
): { canTrade: boolean; reason?: string } {
  if (tribe1 === tribe2) {
    return { canTrade: true } // Internal trade always allowed
  }

  const stance = getStance(state, tribe1, tribe2)

  if (stance === 'war') {
    return { canTrade: false, reason: 'At war' }
  }

  if (stance === 'hostile') {
    return { canTrade: false, reason: 'Relations too hostile' }
  }

  return { canTrade: true }
}

/**
 * Cancels all trade routes between two tribes at war
 */
export function cancelTradeRoutesDueToWar(
  state: GameState,
  tribe1: TribeId,
  tribe2: TribeId
): GameState {
  const newRoutes = state.tradeRoutes.map((route) => {
    if (!route.active && route.turnsUntilActive <= 0) return route

    // Cancel if route goes between the two warring tribes
    const isAffected =
      (route.ownerTribe === tribe1 && route.targetTribe === tribe2) ||
      (route.ownerTribe === tribe2 && route.targetTribe === tribe1)

    if (isAffected) {
      return { ...route, active: false, turnsUntilActive: 0 }
    }

    return route
  })

  let newState: GameState = {
    ...state,
    tradeRoutes: newRoutes,
  }

  // Update trade route counts for both tribes
  newState = updateTradeRouteCount(newState, tribe1)
  newState = updateTradeRouteCount(newState, tribe2)

  return newState
}

/**
 * Pillages trade routes connected to a settlement when it takes damage
 * Triggered by settlement HP damage, not by unit actions directly
 * Returns gold to the pillaging player (1 turn of route value)
 */
export function pillageSettlementTradeRoutes(
  state: GameState,
  settlementId: SettlementId,
  pillagerTribeId: TribeId
): { state: GameState; goldGained: number; routesBroken: number } {
  const settlement = state.settlements.get(settlementId)
  if (!settlement) {
    return { state, goldGained: 0, routesBroken: 0 }
  }

  let goldGained = 0
  let routesBroken = 0
  const affectedOwners = new Set<TribeId>()

  // Find all active routes connected to this settlement (either end)
  const newRoutes = state.tradeRoutes.map((route) => {
    if (!route.active) return route

    const isConnected = route.origin === settlementId || route.destination === settlementId

    if (isConnected) {
      // Pillager gains 1 turn worth of bonus gold
      goldGained += route.goldPerTurn
      routesBroken++
      affectedOwners.add(route.ownerTribe)

      return { ...route, active: false, turnsUntilActive: 0 }
    }

    return route
  })

  if (routesBroken === 0) {
    return { state, goldGained: 0, routesBroken: 0 }
  }

  // Grant gold to pillager
  const newPlayers = state.players.map((p) =>
    p.tribeId === pillagerTribeId
      ? { ...p, treasury: p.treasury + goldGained }
      : p
  )

  let newState: GameState = {
    ...state,
    tradeRoutes: newRoutes,
    players: newPlayers,
  }

  // Update trade route counts for affected route owners
  for (const ownerId of affectedOwners) {
    newState = updateTradeRouteCount(newState, ownerId)
  }

  return {
    state: newState,
    goldGained,
    routesBroken,
  }
}

/**
 * @deprecated Use pillageSettlementTradeRoutes instead
 * Pillages a specific trade route
 */
export function pillageTradeRoute(
  state: GameState,
  routeId: TradeRouteId,
  pillagerTribeId: TribeId
): { state: GameState; goldGained: number } | null {
  const route = state.tradeRoutes.find((r) => r.id === routeId)

  if (!route || !route.active) {
    return null
  }

  // Can't pillage own routes
  if (route.ownerTribe === pillagerTribeId) {
    return null
  }

  // Gold gained = 1 turn of route value (per TRADE.md spec)
  const goldGained = route.goldPerTurn

  // Deactivate the route
  const newRoutes = state.tradeRoutes.map((r) =>
    r.id === routeId ? { ...r, active: false, turnsUntilActive: 0 } : r
  )

  // Grant gold to pillager
  const newPlayers = state.players.map((p) =>
    p.tribeId === pillagerTribeId
      ? { ...p, treasury: p.treasury + goldGained }
      : p
  )

  let newState: GameState = {
    ...state,
    tradeRoutes: newRoutes,
    players: newPlayers,
  }

  // Update trade route count for the route owner
  newState = updateTradeRouteCount(newState, route.ownerTribe)

  return {
    state: newState,
    goldGained,
  }
}

/**
 * Gets all valid trade route destinations for a tribe
 */
export function getAvailableTradeDestinations(
  state: GameState,
  tribeId: TribeId
): { settlement: Settlement; isInternal: boolean; goldPerTurn: number }[] {
  const destinations: { settlement: Settlement; isInternal: boolean; goldPerTurn: number }[] = []

  // Check if trade is unlocked
  if (!hasTradeUnlocked(state, tribeId)) {
    return destinations
  }

  // Check if tribe has capacity
  const currentRoutes = getPlayerTradeRoutes(state, tribeId)
  const capacity = getTradeRouteCapacity(state, tribeId)
  if (currentRoutes.length >= capacity) {
    return destinations
  }

  // Get player's settlements for origin
  const playerSettlements = getPlayerSettlements(state, tribeId)
  if (playerSettlements.length === 0) {
    return destinations
  }

  // Use first settlement as reference origin for gold calculation
  const originSettlement = playerSettlements[0]!

  for (const settlement of state.settlements.values()) {
    const isInternal = settlement.owner === tribeId

    if (!isInternal) {
      // External routes require visibility and neutral+ stance
      const stance = getStance(state, tribeId, settlement.owner)
      if (stance === 'war' || stance === 'hostile') continue

      if (!isSettlementVisible(state, tribeId, settlement)) continue

      // Can't already have a route from this tribe
      if (hasRouteFromTribe(state, settlement.id, tribeId)) continue
    }

    // Calculate potential gold per turn
    const goldPerTurn = calculateTradeRouteGold(state, originSettlement, settlement)

    destinations.push({ settlement, isInternal, goldPerTurn })
  }

  return destinations
}

/**
 * Checks if a specific trade route can be created
 */
export function canCreateTradeRoute(
  state: GameState,
  originId: SettlementId,
  destinationId: SettlementId
): { canCreate: boolean; reason?: string } {
  const origin = state.settlements.get(originId)
  const destination = state.settlements.get(destinationId)

  if (!origin) {
    return { canCreate: false, reason: 'Origin settlement not found' }
  }

  if (!destination) {
    return { canCreate: false, reason: 'Destination settlement not found' }
  }

  if (!hasTradeUnlocked(state, origin.owner)) {
    return { canCreate: false, reason: 'Trade not unlocked (requires Smart Contracts tech)' }
  }

  const currentRoutes = getPlayerTradeRoutes(state, origin.owner)
  const capacity = getTradeRouteCapacity(state, origin.owner)
  if (currentRoutes.length >= capacity) {
    return { canCreate: false, reason: `Trade route capacity full (${currentRoutes.length}/${capacity})` }
  }

  const isInternal = origin.owner === destination.owner
  if (!isInternal) {
    const stance = getStance(state, origin.owner, destination.owner)
    if (stance === 'war') {
      return { canCreate: false, reason: 'Cannot trade with enemies' }
    }
    if (stance === 'hostile') {
      return { canCreate: false, reason: 'Cannot initiate trade while hostile' }
    }

    if (!isSettlementVisible(state, origin.owner, destination)) {
      return { canCreate: false, reason: 'Destination not visible' }
    }

    if (hasRouteFromTribe(state, destinationId, origin.owner)) {
      return { canCreate: false, reason: 'Already have a route to this settlement' }
    }
  }

  return { canCreate: true }
}

/**
 * Gets trade route status summary for a tribe
 */
export function getTradeRouteSummary(
  state: GameState,
  tribeId: TribeId
): {
  capacity: number
  active: number
  forming: number
  income: number
  unlocked: boolean
} {
  const unlocked = hasTradeUnlocked(state, tribeId)
  const capacity = getTradeRouteCapacity(state, tribeId)
  const allRoutes = getPlayerTradeRoutes(state, tribeId)
  const activeRoutes = allRoutes.filter(r => r.active)
  const formingRoutes = allRoutes.filter(r => !r.active && r.turnsUntilActive > 0)
  const income = calculateTradeRouteIncome(state, tribeId)

  return {
    capacity,
    active: activeRoutes.length,
    forming: formingRoutes.length,
    income,
    unlocked,
  }
}

// =============================================================================
// Production Queue System
// =============================================================================

/**
 * Adds an item to a settlement's production queue
 */
export function addToProductionQueue(
  settlement: Settlement,
  item: Omit<ProductionItem, 'progress'>
): Settlement {
  const newItem: ProductionItem = {
    ...item,
    progress: 0,
  }

  return {
    ...settlement,
    productionQueue: [...settlement.productionQueue, newItem],
  }
}

/**
 * Removes an item from the production queue
 */
export function removeFromProductionQueue(
  settlement: Settlement,
  index: number
): Settlement {
  const newQueue = [...settlement.productionQueue]
  newQueue.splice(index, 1)

  return {
    ...settlement,
    productionQueue: newQueue,
  }
}

/**
 * Moves an item up in the production queue
 */
export function moveUpInQueue(settlement: Settlement, index: number): Settlement {
  if (index <= 0) return settlement

  const newQueue = [...settlement.productionQueue]
  const temp = newQueue[index - 1]!
  newQueue[index - 1] = newQueue[index]!
  newQueue[index] = temp

  return {
    ...settlement,
    productionQueue: newQueue,
  }
}

/**
 * Processes production for a settlement each turn
 * Returns updated settlement and any completed items
 */
export function processProduction(
  state: GameState,
  settlement: Settlement
): {
  settlement: Settlement
  completed: ProductionItem[]
} {
  if (settlement.productionQueue.length === 0) {
    return { settlement, completed: [] }
  }

  // Calculate production yields
  const player = state.players.find((p) => p.tribeId === settlement.owner)
  const tribeBonuses = player ? getPlayerTribeBonuses(state, player.tribeId) : undefined
  const baseYields = calculateSettlementYields(state, settlement)
  const buildingYields = calculateBuildingYields(state, settlement, tribeBonuses)
  let totalProduction = baseYields.production + buildingYields.production

  // Apply golden age production bonus
  if (player) {
    const productionBonus = getGoldenAgeYieldBonus(player, 'production')
    if (productionBonus > 0) {
      totalProduction = Math.floor(totalProduction * (1 + productionBonus))
    }
  }

  const completed: ProductionItem[] = []
  let currentItem = settlement.productionQueue[0]!
  let overflow = settlement.currentProduction + totalProduction

  // Process items until we run out of production
  const newQueue: ProductionItem[] = []
  let itemIndex = 0

  while (overflow > 0 && itemIndex < settlement.productionQueue.length) {
    currentItem = settlement.productionQueue[itemIndex]!
    const remaining = currentItem.cost - currentItem.progress

    // Calculate effective production for this item (with unit type bonuses)
    let effectiveProduction = overflow
    if (currentItem.type === 'unit' && tribeBonuses) {
      const unitBonus = getUnitProductionBonus(currentItem.id, tribeBonuses)
      if (unitBonus > 0) {
        effectiveProduction = Math.floor(overflow * (1 + unitBonus))
      }
    }

    if (effectiveProduction >= remaining) {
      // Item completed
      completed.push(currentItem)
      // Subtract the actual production used (before bonus), not the effective production
      const productionUsed = tribeBonuses && currentItem.type === 'unit'
        ? Math.ceil(remaining / (1 + getUnitProductionBonus(currentItem.id, tribeBonuses)))
        : remaining
      overflow -= Math.min(productionUsed, overflow)
      itemIndex++
    } else {
      // Item partially complete
      newQueue.push({
        ...currentItem,
        progress: currentItem.progress + effectiveProduction,
      })
      overflow = 0
      itemIndex++
    }
  }

  // Add remaining queue items
  for (let i = itemIndex; i < settlement.productionQueue.length; i++) {
    newQueue.push(settlement.productionQueue[i]!)
  }

  return {
    settlement: {
      ...settlement,
      productionQueue: newQueue,
      currentProduction: overflow, // Overflow carries to next turn
    },
    completed,
  }
}

/**
 * Gets the estimated turns to complete current production
 */
export function getProductionTurnsRemaining(
  state: GameState,
  settlement: Settlement
): number | null {
  if (settlement.productionQueue.length === 0) {
    return null
  }

  const currentItem = settlement.productionQueue[0]!
  const remaining = currentItem.cost - currentItem.progress - settlement.currentProduction

  const tribeBonuses = getPlayerTribeBonuses(state, settlement.owner)
  const baseYields = calculateSettlementYields(state, settlement)
  const buildingYields = calculateBuildingYields(state, settlement, tribeBonuses)
  let totalProduction = baseYields.production + buildingYields.production

  // Apply unit production bonus for turn estimate
  if (currentItem.type === 'unit' && tribeBonuses) {
    const unitBonus = getUnitProductionBonus(currentItem.id, tribeBonuses)
    if (unitBonus > 0) {
      totalProduction = Math.floor(totalProduction * (1 + unitBonus))
    }
  }

  if (totalProduction <= 0) {
    return Infinity
  }

  return Math.ceil(remaining / totalProduction)
}

// =============================================================================
// Turn Processing - Economy
// =============================================================================

/**
 * Processes all economic updates at end of turn for a player
 */
export function processPlayerEconomy(
  state: GameState,
  tribeId: TribeId
): GameState {
  const goldIncome = calculateGoldIncome(state, tribeId)

  // Update player treasury and great people accumulator
  const newPlayers = state.players.map((p) => {
    if (p.tribeId !== tribeId) return p

    const newTreasury = Math.max(0, p.treasury + goldIncome.net)

    // Track gross gold earned for Great People accumulator
    const goldEarned = goldIncome.gross
    const updatedPlayer: Player = {
      ...p,
      treasury: newTreasury,
      greatPeople: {
        ...p.greatPeople,
        accumulator: {
          ...p.greatPeople.accumulator,
          gold: p.greatPeople.accumulator.gold + goldEarned,
        },
      },
    }

    return updatedPlayer
  })

  return {
    ...state,
    players: newPlayers,
  }
}

/**
 * Checks if player can afford a purchase
 */
export function canAfford(state: GameState, tribeId: TribeId, cost: number): boolean {
  const player = state.players.find((p) => p.tribeId === tribeId)
  return player !== undefined && player.treasury >= cost
}

/**
 * Deducts gold from player treasury
 */
export function deductGold(
  state: GameState,
  tribeId: TribeId,
  amount: number
): GameState | null {
  if (!canAfford(state, tribeId, amount)) {
    return null
  }

  const newPlayers = state.players.map((p) =>
    p.tribeId === tribeId ? { ...p, treasury: p.treasury - amount } : p
  )

  return {
    ...state,
    players: newPlayers,
  }
}

/**
 * Adds gold to player treasury
 */
export function addGold(
  state: GameState,
  tribeId: TribeId,
  amount: number
): GameState {
  const newPlayers = state.players.map((p) =>
    p.tribeId === tribeId ? { ...p, treasury: p.treasury + amount } : p
  )

  return {
    ...state,
    players: newPlayers,
  }
}

// =============================================================================
// Gold Purchase System
// =============================================================================

/**
 * Calculates cost to purchase a unit with gold
 */
export function getGoldPurchaseCost(productionCost: number): number {
  // Gold cost = production cost * 4
  return productionCost * 4
}

/**
 * Purchases a unit with gold (instant production)
 */
export function purchaseWithGold(
  state: GameState,
  tribeId: TribeId,
  cost: number
): GameState | null {
  return deductGold(state, tribeId, cost)
}

// =============================================================================
// Production Query Functions
// =============================================================================

export interface AvailableProductionItem {
  type: 'unit' | 'building' | 'wonder'
  id: string
  name: string
  cost: number
  turnsRemaining: number | null
}

/**
 * Gets all units that a player can build based on researched techs
 * Note: Basic units (scout, settler, builder) are always available
 */
export function getAvailableUnits(state: GameState, tribeId: TribeId): UnitDefinition[] {
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (!player) return []

  const researchedTechs = new Set(player.researchedTechs)
  const availableUnits: UnitDefinition[] = []

  // Basic units always available (no tech requirement)
  const basicUnits: UnitType[] = ['scout', 'settler', 'builder']
  for (const unitType of basicUnits) {
    const def = UNIT_DEFINITIONS[unitType]
    if (def && def.productionCost > 0) {
      availableUnits.push(def)
    }
  }

  // Check tech unlocks for other units
  for (const tech of Object.values(TECH_DEFINITIONS)) {
    if (researchedTechs.has(tech.id)) {
      const unlockedUnits = tech.unlocks.units ?? []
      for (const unitType of unlockedUnits) {
        const def = UNIT_DEFINITIONS[unitType as UnitType]
        if (def && def.productionCost > 0 && !basicUnits.includes(unitType as UnitType)) {
          // Avoid duplicates
          if (!availableUnits.some((u) => u.type === def.type)) {
            availableUnits.push(def)
          }
        }
      }
    }
  }

  return availableUnits
}

/**
 * Calculates turns remaining to complete a production item
 */
export function calculateTurnsRemaining(
  state: GameState,
  settlement: Settlement,
  cost: number,
  currentProgress: number = 0
): number | null {
  const tribeBonuses = getPlayerTribeBonuses(state, settlement.owner)
  const baseYields = calculateSettlementYields(state, settlement)
  const buildingYields = calculateBuildingYields(state, settlement, tribeBonuses)
  const totalProduction = baseYields.production + buildingYields.production

  if (totalProduction <= 0) {
    return null // Infinite turns
  }

  const remaining = cost - currentProgress - settlement.currentProduction
  return Math.max(1, Math.ceil(remaining / totalProduction))
}

/**
 * Gets all available production options for a settlement
 */
export function getAvailableProduction(
  state: GameState,
  settlementId: SettlementId
): AvailableProductionItem[] {
  const settlement = state.settlements.get(settlementId)
  if (!settlement) return []

  const available: AvailableProductionItem[] = []

  // Get available units
  const units = getAvailableUnits(state, settlement.owner)
  for (const unit of units) {
    available.push({
      type: 'unit',
      id: unit.type,
      name: formatUnitName(unit.type),
      cost: unit.productionCost,
      turnsRemaining: calculateTurnsRemaining(state, settlement, unit.productionCost),
    })
  }

  // Get available buildings
  const buildings = getAvailableBuildings(state, settlement)
  for (const building of buildings) {
    available.push({
      type: 'building',
      id: building.id,
      name: building.name,
      cost: building.productionCost,
      turnsRemaining: calculateTurnsRemaining(state, settlement, building.productionCost),
    })
  }

  // Get available wonders
  const wonders = getAvailableWonders(state)
  for (const wonder of wonders) {
    const canBuild = canBuildWonder(state, settlementId, wonder.id)
    if (canBuild.canBuild) {
      available.push({
        type: 'wonder',
        id: wonder.id,
        name: wonder.name,
        cost: wonder.productionCost,
        turnsRemaining: calculateTurnsRemaining(state, settlement, wonder.productionCost),
      })
    }
  }

  return available
}

/**
 * Validates if an item can be built in a settlement
 */
export function canBuildItem(
  state: GameState,
  settlement: Settlement,
  itemType: 'unit' | 'building' | 'wonder',
  itemId: string
): { canBuild: boolean; reason?: string } {
  switch (itemType) {
    case 'unit': {
      const unitDef = UNIT_DEFINITIONS[itemId as UnitType]
      if (!unitDef) {
        return { canBuild: false, reason: 'Unit type does not exist' }
      }
      if (unitDef.productionCost <= 0) {
        return { canBuild: false, reason: 'Unit cannot be produced directly' }
      }

      // Check tech requirements
      const availableUnits = getAvailableUnits(state, settlement.owner)
      if (!availableUnits.some((u) => u.type === itemId)) {
        return { canBuild: false, reason: 'Required technology not researched' }
      }

      return { canBuild: true }
    }

    case 'building': {
      const buildingDef = BUILDING_DEFINITIONS[itemId]
      if (!buildingDef) {
        return { canBuild: false, reason: 'Building does not exist' }
      }

      // Check if already built
      if (settlement.buildings.includes(itemId as BuildingId)) {
        return { canBuild: false, reason: 'Building already exists in settlement' }
      }

      // Check tech requirements
      if (buildingDef.prerequisiteTech) {
        const player = state.players.find((p) => p.tribeId === settlement.owner)
        if (!player?.researchedTechs.includes(buildingDef.prerequisiteTech as never)) {
          return { canBuild: false, reason: `Requires ${buildingDef.prerequisiteTech}` }
        }
      }

      return { canBuild: true }
    }

    case 'wonder': {
      return canBuildWonder(state, settlement.id, itemId as WonderId)
    }

    default:
      return { canBuild: false, reason: 'Invalid item type' }
  }
}

/**
 * Gets the definition for a production item
 */
export function getProductionItemDefinition(
  itemType: 'unit' | 'building' | 'wonder',
  itemId: string
): UnitDefinition | BuildingDefinition | WonderDefinition | undefined {
  switch (itemType) {
    case 'unit':
      return UNIT_DEFINITIONS[itemId as UnitType]
    case 'building':
      return BUILDING_DEFINITIONS[itemId]
    case 'wonder':
      return WONDER_DEFINITIONS[itemId]
  }
}

/**
 * Formats a unit type to a display name
 */
function formatUnitName(unitType: UnitType): string {
  const names: Record<UnitType, string> = {
    // Base units
    scout: 'Scout',
    warrior: 'Warrior',
    settler: 'Settler',
    builder: 'Builder',
    great_person: 'Great Person',
    // Era 1
    archer: 'Archer',
    horseman: 'Horseman',
    // Era 2
    swordsman: 'Swordsman',
    sniper: 'Sniper',
    knight: 'Knight',
    social_engineer: 'Social Engineer',
    // Era 3
    bot_fighter: 'Bot Fighter',
    rockeeter: 'Rockeeter',
    tank: 'Tank',
    bombard: 'Bombard',
    // Tribal unique units
    banana_slinger: 'Banana Slinger',
    neon_geck: 'Neon Geck',
    deadgod: 'DeadGod',
    stuckers: 'Stuckers',
  }
  return names[unitType] || unitType
}
