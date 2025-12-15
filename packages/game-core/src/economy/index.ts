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
} from '../types'
import { calculateSettlementYields, getPlayerSettlements } from '../settlements'
import {
  calculateBuildingYields,
  calculatePlayerBuildingMaintenance,
  getAvailableBuildings,
  BUILDING_DEFINITIONS,
  type BuildingDefinition,
} from '../buildings'
import { areAllied, getStance, ALLIED_TRADE_BONUS } from '../diplomacy'
import { UNIT_DEFINITIONS, type UnitDefinition } from '../units'
import {
  getAvailableWonders,
  canBuildWonder,
  WONDER_DEFINITIONS,
  type WonderDefinition,
} from '../wonders'
import { TECH_DEFINITIONS } from '../tech'

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
  const settlements = getPlayerSettlements(state, tribeId)

  let grossGold = 0
  const breakdown: GoldBreakdown = {
    settlements: 0,
    tradeRoutes: 0,
    buildingMaintenance: 0,
    unitMaintenance: 0,
  }

  // Gold from settlements
  for (const settlement of settlements) {
    const yields = calculateSettlementYields(state, settlement)
    const buildingYields = calculateBuildingYields(state, settlement)
    breakdown.settlements += yields.gold + buildingYields.gold
  }
  grossGold += breakdown.settlements

  // Gold from trade routes
  const tradeGold = calculateTradeRouteIncome(state, tribeId)
  breakdown.tradeRoutes = tradeGold
  grossGold += tradeGold

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

let tradeRouteIdCounter = 1

function generateTradeRouteId(): TradeRouteId {
  return `trade_${tradeRouteIdCounter++}` as TradeRouteId
}

export function resetTradeRouteIds(): void {
  tradeRouteIdCounter = 1
}

/**
 * Creates a new trade route between two settlements
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

  // Check if origin can send a trade route
  const existingRoutes = getTradeRoutesFrom(state, originId)
  const maxRoutes = getMaxTradeRoutes(state, origin.owner)
  if (existingRoutes.length >= maxRoutes) {
    return null
  }

  // Check diplomatic relations for external routes
  const isInternal = origin.owner === destination.owner
  if (!isInternal) {
    // External routes require Neutral or better relations
    const stance = getStance(state, origin.owner, destination.owner)
    if (stance === 'war' || stance === 'hostile') {
      return null // Cannot trade with enemies
    }
  }

  // Calculate gold per turn
  const goldPerTurn = calculateTradeRouteGold(state, origin, destination)

  const route: TradeRoute = {
    id: generateTradeRouteId(),
    origin: originId,
    destination: destinationId,
    targetTribe: destination.owner,
    goldPerTurn,
    active: true,
  }

  return {
    state: {
      ...state,
      tradeRoutes: [...state.tradeRoutes, route],
    },
    route,
  }
}

/**
 * Calculates gold per turn for a trade route
 */
export function calculateTradeRouteGold(
  state: GameState,
  origin: Settlement,
  destination: Settlement
): number {
  const isInternal = origin.owner === destination.owner

  // Base gold
  let gold = isInternal ? 3 : 4

  // Bonus for buildings at destination
  gold += Math.min(destination.buildings.length, 3)

  // Bonus for luxury resources (if external)
  if (!isInternal) {
    // Count unique luxury resources at destination
    // Simplified: +1 per luxury
    const luxuryCount = countLuxuryResources(state, destination)
    gold += luxuryCount

    // Alliance bonus (+10% gold if allied)
    if (areAllied(state, origin.owner, destination.owner)) {
      gold = Math.ceil(gold * (1 + ALLIED_TRADE_BONUS / 100))
    }
  }

  return gold
}

function countLuxuryResources(_state: GameState, _settlement: Settlement): number {
  // Count tiles with luxury resources around settlement
  // Simplified implementation - would iterate through settlement tiles
  return 0
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
 * Gets all trade routes for a player
 */
export function getPlayerTradeRoutes(state: GameState, tribeId: TribeId): TradeRoute[] {
  return state.tradeRoutes.filter((r) => {
    const origin = state.settlements.get(r.origin)
    return origin && origin.owner === tribeId && r.active
  })
}

/**
 * Calculates total trade route income for a player
 */
export function calculateTradeRouteIncome(state: GameState, tribeId: TribeId): number {
  const routes = getPlayerTradeRoutes(state, tribeId)
  return routes.reduce((sum, r) => sum + r.goldPerTurn, 0)
}

/**
 * Gets maximum trade routes a player can have
 */
export function getMaxTradeRoutes(state: GameState, tribeId: TribeId): number {
  // Base: 1 trade route per settlement
  const settlements = getPlayerSettlements(state, tribeId)
  let max = settlements.length

  // Could add bonuses from techs/civics here

  return max
}

/**
 * Cancels a trade route
 */
export function cancelTradeRoute(state: GameState, routeId: TradeRouteId): GameState {
  const newRoutes = state.tradeRoutes.map((r) =>
    r.id === routeId ? { ...r, active: false } : r
  )

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
    if (!route.active) return route

    const origin = state.settlements.get(route.origin)
    const dest = state.settlements.get(route.destination)

    if (!origin || !dest) return route

    // Cancel if route goes between the two warring tribes
    const isAffected =
      (origin.owner === tribe1 && dest.owner === tribe2) ||
      (origin.owner === tribe2 && dest.owner === tribe1)

    if (isAffected) {
      return { ...route, active: false }
    }

    return route
  })

  return {
    ...state,
    tradeRoutes: newRoutes,
  }
}

/**
 * Pillages a trade route (enemy action)
 * Returns gold to the pillaging player
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
  const origin = state.settlements.get(route.origin)
  if (origin && origin.owner === pillagerTribeId) {
    return null
  }

  // Gold gained = 3 turns of route value
  const goldGained = route.goldPerTurn * 3

  // Deactivate the route
  const newRoutes = state.tradeRoutes.map((r) =>
    r.id === routeId ? { ...r, active: false } : r
  )

  // Grant gold to pillager
  const newPlayers = state.players.map((p) =>
    p.tribeId === pillagerTribeId
      ? { ...p, treasury: p.treasury + goldGained }
      : p
  )

  return {
    state: {
      ...state,
      tradeRoutes: newRoutes,
      players: newPlayers,
    },
    goldGained,
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
  const baseYields = calculateSettlementYields(state, settlement)
  const buildingYields = calculateBuildingYields(state, settlement)
  const totalProduction = baseYields.production + buildingYields.production

  const completed: ProductionItem[] = []
  let currentItem = settlement.productionQueue[0]!
  let overflow = settlement.currentProduction + totalProduction

  // Process items until we run out of production
  const newQueue: ProductionItem[] = []
  let itemIndex = 0

  while (overflow > 0 && itemIndex < settlement.productionQueue.length) {
    currentItem = settlement.productionQueue[itemIndex]!
    const remaining = currentItem.cost - currentItem.progress

    if (overflow >= remaining) {
      // Item completed
      completed.push(currentItem)
      overflow -= remaining
      itemIndex++
    } else {
      // Item partially complete
      newQueue.push({
        ...currentItem,
        progress: currentItem.progress + overflow,
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

  const baseYields = calculateSettlementYields(state, settlement)
  const buildingYields = calculateBuildingYields(state, settlement)
  const totalProduction = baseYields.production + buildingYields.production

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

  // Update player treasury
  const newPlayers = state.players.map((p) => {
    if (p.tribeId !== tribeId) return p

    const newTreasury = Math.max(0, p.treasury + goldIncome.net)

    return {
      ...p,
      treasury: newTreasury,
    }
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
  const baseYields = calculateSettlementYields(state, settlement)
  const buildingYields = calculateBuildingYields(state, settlement)
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
