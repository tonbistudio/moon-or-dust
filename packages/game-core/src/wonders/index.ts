// Wonder system - exclusive buildings with powerful effects

import type {
  GameState,
  Wonder,
  WonderId,
  TribeId,
  SettlementId,
  Settlement,
  BuildingCategory,
} from '../types'

// =============================================================================
// Wonder Effect Types
// =============================================================================

export type WonderEffectType =
  | 'research_speed'
  | 'settlement_gold' // +% gold income in the settlement where wonder is built
  | 'trade_gold'
  | 'kill_gold'
  | 'culture_per_turn'
  | 'floor_price_per_tech'
  | 'combat_strength'
  | 'unit_healing'
  | 'production_speed'
  | 'forest_production'

export interface WonderEffect {
  readonly type: WonderEffectType
  readonly value: number
}

export interface WonderDefinition {
  readonly id: WonderId
  readonly name: string
  readonly reference: string
  readonly category: BuildingCategory
  readonly era: 1 | 2 | 3
  readonly productionCost: number
  readonly floorPriceBonus: number
  readonly effect: WonderEffect
  readonly description: string
  readonly techPrereq?: string // Tech required to build
  readonly culturePrereq?: string // Culture required to build
}

// =============================================================================
// Wonder Definitions (10 Solana-themed Wonders)
// =============================================================================

export const WONDER_DEFINITIONS: Record<string, WonderDefinition> = {
  // ===========================================
  // ERA 1 WONDERS (Cost: 80-120, Floor Price: +25)
  // ===========================================
  candy_machine: {
    id: 'candy_machine' as WonderId,
    name: 'Candy Machine',
    reference: 'Metaplex',
    category: 'tech',
    era: 1,
    productionCost: 120,
    floorPriceBonus: 25,
    effect: { type: 'research_speed', value: 10 },
    description: '+10% research speed',
    techPrereq: 'smart_contracts',
  },
  degen_ape_emporium: {
    id: 'degen_ape_emporium' as WonderId,
    name: 'Degen Ape Emporium',
    reference: 'Degen Apes',
    category: 'vibes',
    era: 1,
    productionCost: 120,
    floorPriceBonus: 25,
    effect: { type: 'culture_per_turn', value: 3 },
    description: '+3 Culture/turn',
    culturePrereq: 'diamond_hands',
  },
  turtles_hideout: {
    id: 'turtles_hideout' as WonderId,
    name: 'Turtles Hideout',
    reference: 'Turtles',
    category: 'military',
    era: 1,
    productionCost: 80,
    floorPriceBonus: 25,
    effect: { type: 'unit_healing', value: 3 },
    description: 'All units heal +3 HP/turn',
    culturePrereq: 'memeing',
  },

  // ===========================================
  // ERA 2 WONDERS (Cost: 150-200, Floor Price: +50)
  // ===========================================
  magic_eden: {
    id: 'magic_eden' as WonderId,
    name: 'Magic Eden',
    reference: 'Magic Eden',
    category: 'economy',
    era: 2,
    productionCost: 180,
    floorPriceBonus: 50,
    effect: { type: 'trade_gold', value: 3 },
    description: '+3 Gold/turn from all trade routes',
    techPrereq: 'currency',
  },
  taiyo_robotics_factory: {
    id: 'taiyo_robotics_factory' as WonderId,
    name: 'Taiyo Robotics Factory',
    reference: 'Taiyo Robotics',
    category: 'production',
    era: 2,
    productionCost: 200,
    floorPriceBonus: 50,
    effect: { type: 'production_speed', value: 20 },
    description: '+20% production speed',
    techPrereq: 'staking',
  },
  boogle_graveyard: {
    id: 'boogle_graveyard' as WonderId,
    name: 'Boogle Graveyard',
    reference: 'Boogles',
    category: 'economy',
    era: 2,
    productionCost: 160,
    floorPriceBonus: 50,
    effect: { type: 'kill_gold', value: 10 },
    description: '+10 Gold per enemy unit killed',
    culturePrereq: 'alpha_daos',
  },
  alpha_art_gallery: {
    id: 'alpha_art_gallery' as WonderId,
    name: 'Alpha Art Gallery',
    reference: 'Alpha Art',
    category: 'vibes',
    era: 2,
    productionCost: 180,
    floorPriceBonus: 50,
    effect: { type: 'floor_price_per_tech', value: 2 },
    description: '+2 Floor Price per tech owned',
    culturePrereq: 'fudding',
  },

  // ===========================================
  // ERA 3 WONDERS (Cost: 250-350, Floor Price: +75)
  // ===========================================
  mindfolk_lumberyard: {
    id: 'mindfolk_lumberyard' as WonderId,
    name: 'Mindfolk Lumberyard',
    reference: 'Mindfolk',
    category: 'production',
    era: 3,
    productionCost: 280,
    floorPriceBonus: 75,
    effect: { type: 'forest_production', value: 3 },
    description: '+3 Production from forest tiles',
    techPrereq: 'ponzinomics',
  },
  the_portal: {
    id: 'the_portal' as WonderId,
    name: 'The Portal',
    reference: 'Portal NFTs',
    category: 'economy',
    era: 3,
    productionCost: 300,
    floorPriceBonus: 75,
    effect: { type: 'settlement_gold', value: 50 },
    description: '+50% gold income in this settlement',
    culturePrereq: 'hard_shilling',
  },
  balloonsville_lair: {
    id: 'balloonsville_lair' as WonderId,
    name: 'Balloonsville Lair',
    reference: 'Balloonsville',
    category: 'military',
    era: 3,
    productionCost: 320,
    floorPriceBonus: 75,
    effect: { type: 'combat_strength', value: 2 },
    description: '+2 combat strength for all units',
    culturePrereq: 'rugging',
  },
}

export const ALL_WONDERS: WonderDefinition[] = Object.values(WONDER_DEFINITIONS)

export const WONDER_MAP: Map<WonderId, WonderDefinition> = new Map(
  ALL_WONDERS.map((w) => [w.id, w])
)

// =============================================================================
// Wonder Queries
// =============================================================================

/**
 * Gets a wonder definition by ID
 */
export function getWonderDefinition(id: WonderId): WonderDefinition | undefined {
  return WONDER_MAP.get(id)
}

/**
 * Gets a wonder from game state by ID
 */
export function getWonder(state: GameState, wonderId: WonderId): Wonder | undefined {
  return state.wonders.find((w) => w.id === wonderId)
}

/**
 * Checks if a wonder has been built
 */
export function isWonderBuilt(state: GameState, wonderId: WonderId): boolean {
  const wonder = getWonder(state, wonderId)
  return wonder?.builtBy !== undefined
}

/**
 * Gets all available wonders (not yet built)
 */
export function getAvailableWonders(state: GameState): WonderDefinition[] {
  return ALL_WONDERS.filter((def) => !isWonderBuilt(state, def.id))
}

/**
 * Gets all wonders built by a tribe
 */
export function getWondersBuiltBy(state: GameState, tribeId: TribeId): Wonder[] {
  return state.wonders.filter((w) => w.builtBy === tribeId)
}

/**
 * Gets wonders by category
 */
export function getWondersByCategory(category: BuildingCategory): WonderDefinition[] {
  return ALL_WONDERS.filter((w) => w.category === category)
}

/**
 * Counts wonders built by a tribe
 */
export function countWondersBuilt(state: GameState, tribeId: TribeId): number {
  return getWondersBuiltBy(state, tribeId).length
}

// =============================================================================
// Wonder Construction
// =============================================================================

/**
 * Checks if a settlement can start building a wonder
 */
export function canBuildWonder(
  state: GameState,
  settlementId: SettlementId,
  wonderId: WonderId
): { canBuild: boolean; reason?: string } {
  const settlement = state.settlements.get(settlementId)
  if (!settlement) {
    return { canBuild: false, reason: 'Settlement not found' }
  }

  const wonderDef = getWonderDefinition(wonderId)
  if (!wonderDef) {
    return { canBuild: false, reason: 'Wonder not found' }
  }

  // Check if already built by anyone
  if (isWonderBuilt(state, wonderId)) {
    return { canBuild: false, reason: 'Wonder already built by another tribe' }
  }

  // Check if settlement is already building this wonder
  const currentlyBuilding = settlement.productionQueue.find(
    (item) => item.type === 'wonder' && item.id === wonderId
  )
  if (currentlyBuilding) {
    return { canBuild: false, reason: 'Already building this wonder' }
  }

  // Check if another settlement of this tribe is building it
  for (const s of state.settlements.values()) {
    if (s.owner === settlement.owner && s.id !== settlementId) {
      const building = s.productionQueue.find(
        (item) => item.type === 'wonder' && item.id === wonderId
      )
      if (building) {
        return { canBuild: false, reason: 'Another settlement is already building this wonder' }
      }
    }
  }

  return { canBuild: true }
}

/**
 * Starts building a wonder in a settlement
 */
export function startWonderConstruction(
  state: GameState,
  settlementId: SettlementId,
  wonderId: WonderId
): GameState | null {
  const result = canBuildWonder(state, settlementId, wonderId)
  if (!result.canBuild) return null

  const settlement = state.settlements.get(settlementId)!
  const wonderDef = getWonderDefinition(wonderId)!

  // Add to production queue
  const updatedSettlement: Settlement = {
    ...settlement,
    productionQueue: [
      ...settlement.productionQueue,
      {
        type: 'wonder',
        id: wonderId,
        progress: 0,
        cost: wonderDef.productionCost,
      },
    ],
  }

  const newSettlements = new Map(state.settlements)
  newSettlements.set(settlementId, updatedSettlement)

  return { ...state, settlements: newSettlements }
}

/**
 * Completes a wonder construction
 * Called when production completes for a wonder
 */
export function completeWonder(
  state: GameState,
  settlementId: SettlementId,
  wonderId: WonderId
): GameState | null {
  const settlement = state.settlements.get(settlementId)
  if (!settlement) return null

  const wonderDef = getWonderDefinition(wonderId)
  if (!wonderDef) return null

  // Check if someone else built it first (race condition)
  if (isWonderBuilt(state, wonderId)) {
    // Refund production as gold
    return refundWonderProduction(state, settlementId, wonderId)
  }

  // Mark wonder as built
  const newWonders = state.wonders.map((w) =>
    w.id === wonderId
      ? { ...w, builtBy: settlement.owner, location: settlementId }
      : w
  )

  // If wonder wasn't in the list yet, add it
  const wonderExists = state.wonders.some((w) => w.id === wonderId)
  if (!wonderExists) {
    newWonders.push({
      id: wonderId,
      name: wonderDef.name,
      reference: wonderDef.reference,
      category: wonderDef.category,
      productionCost: wonderDef.productionCost,
      floorPriceBonus: wonderDef.floorPriceBonus,
      builtBy: settlement.owner,
      location: settlementId,
    })
  }

  // Remove from production queue
  const updatedSettlement: Settlement = {
    ...settlement,
    productionQueue: settlement.productionQueue.filter(
      (item) => !(item.type === 'wonder' && item.id === wonderId)
    ),
  }

  const newSettlements = new Map(state.settlements)
  newSettlements.set(settlementId, updatedSettlement)

  let newState: GameState = {
    ...state,
    settlements: newSettlements,
    wonders: newWonders,
  }

  // Apply one-time effects (like reveal map)
  newState = applyWonderCompletionEffect(newState, settlement.owner, wonderDef)

  return newState
}

/**
 * Refunds wonder production as gold when another player completes it first
 */
function refundWonderProduction(
  state: GameState,
  settlementId: SettlementId,
  wonderId: WonderId
): GameState {
  const settlement = state.settlements.get(settlementId)
  if (!settlement) return state

  // Find the production item
  const productionItem = settlement.productionQueue.find(
    (item) => item.type === 'wonder' && item.id === wonderId
  )
  if (!productionItem) return state

  // Refund progress as gold (50% refund rate)
  const refundAmount = Math.floor(productionItem.progress * 0.5)

  // Add gold to player
  const newPlayers = state.players.map((p) =>
    p.tribeId === settlement.owner
      ? { ...p, treasury: p.treasury + refundAmount }
      : p
  )

  // Remove from production queue
  const updatedSettlement: Settlement = {
    ...settlement,
    productionQueue: settlement.productionQueue.filter(
      (item) => !(item.type === 'wonder' && item.id === wonderId)
    ),
  }

  const newSettlements = new Map(state.settlements)
  newSettlements.set(settlementId, updatedSettlement)

  return {
    ...state,
    settlements: newSettlements,
    players: newPlayers,
  }
}

/**
 * Applies one-time effects when a wonder is completed
 * Currently all wonder effects are ongoing, not one-time
 */
function applyWonderCompletionEffect(
  state: GameState,
  _tribeId: TribeId,
  _wonderDef: WonderDefinition
): GameState {
  // All current wonder effects are ongoing, not one-time
  return state
}

// =============================================================================
// Wonder Effects (Ongoing)
// =============================================================================

/**
 * Gets research speed bonus from wonders
 */
export function getWonderResearchBonus(state: GameState, tribeId: TribeId): number {
  let bonus = 0

  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      const def = getWonderDefinition(wonder.id)
      if (def?.effect.type === 'research_speed') {
        bonus += def.effect.value
      }
    }
  }

  return bonus
}

/**
 * Gets production speed bonus from wonders
 */
export function getWonderProductionBonus(state: GameState, tribeId: TribeId): number {
  let bonus = 0

  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      const def = getWonderDefinition(wonder.id)
      if (def?.effect.type === 'production_speed') {
        bonus += def.effect.value
      }
    }
  }

  return bonus
}

/**
 * Gets trade route gold bonus from wonders
 */
export function getWonderTradeBonus(state: GameState, tribeId: TribeId): number {
  let bonus = 0

  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      const def = getWonderDefinition(wonder.id)
      if (def?.effect.type === 'trade_gold') {
        bonus += def.effect.value
      }
    }
  }

  return bonus
}

/**
 * Gets gold bonus per kill from wonders
 */
export function getWonderKillGoldBonus(state: GameState, tribeId: TribeId): number {
  let bonus = 0

  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      const def = getWonderDefinition(wonder.id)
      if (def?.effect.type === 'kill_gold') {
        bonus += def.effect.value
      }
    }
  }

  return bonus
}

/**
 * Gets culture per turn bonus from wonders
 */
export function getWonderCultureBonus(state: GameState, tribeId: TribeId): number {
  let bonus = 0

  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      const def = getWonderDefinition(wonder.id)
      if (def?.effect.type === 'culture_per_turn') {
        bonus += def.effect.value
      }
    }
  }

  return bonus
}

/**
 * Gets combat strength bonus from wonders
 */
export function getWonderCombatBonus(state: GameState, tribeId: TribeId): number {
  let bonus = 0

  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      const def = getWonderDefinition(wonder.id)
      if (def?.effect.type === 'combat_strength') {
        bonus += def.effect.value
      }
    }
  }

  return bonus
}

/**
 * Gets unit healing bonus from wonders
 */
export function getWonderHealingBonus(state: GameState, tribeId: TribeId): number {
  let bonus = 0

  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      const def = getWonderDefinition(wonder.id)
      if (def?.effect.type === 'unit_healing') {
        bonus += def.effect.value
      }
    }
  }

  return bonus
}

/**
 * Gets floor price bonus from wonders (including per-tech bonus)
 */
export function getWonderFloorPriceBonus(state: GameState, tribeId: TribeId): number {
  let bonus = 0
  const player = state.players.find((p) => p.tribeId === tribeId)
  const techCount = player?.researchedTechs.length || 0

  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      // Base floor price bonus from owning the wonder
      bonus += wonder.floorPriceBonus

      // Check for per-tech bonus (Alpha Art Gallery)
      const def = getWonderDefinition(wonder.id)
      if (def?.effect.type === 'floor_price_per_tech') {
        bonus += def.effect.value * techCount
      }
    }
  }

  return bonus
}

/**
 * Gets forest production bonus from wonders
 */
export function getWonderForestBonus(state: GameState, tribeId: TribeId): number {
  let bonus = 0

  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      const def = getWonderDefinition(wonder.id)
      if (def?.effect.type === 'forest_production') {
        bonus += def.effect.value
      }
    }
  }

  return bonus
}

// =============================================================================
// Wonder Progress Queries
// =============================================================================

/**
 * Gets wonder construction progress for a settlement
 */
export function getWonderProgress(
  settlement: Settlement,
  wonderId: WonderId
): { progress: number; cost: number; percent: number } | null {
  const item = settlement.productionQueue.find(
    (i) => i.type === 'wonder' && i.id === wonderId
  )

  if (!item) return null

  return {
    progress: item.progress,
    cost: item.cost,
    percent: Math.floor((item.progress / item.cost) * 100),
  }
}

/**
 * Gets all wonders currently being built across all settlements
 */
export function getWondersInProgress(state: GameState): Array<{
  wonderId: WonderId
  settlementId: SettlementId
  tribeId: TribeId
  progress: number
  cost: number
}> {
  const inProgress: Array<{
    wonderId: WonderId
    settlementId: SettlementId
    tribeId: TribeId
    progress: number
    cost: number
  }> = []

  for (const settlement of state.settlements.values()) {
    for (const item of settlement.productionQueue) {
      if (item.type === 'wonder') {
        inProgress.push({
          wonderId: item.id as WonderId,
          settlementId: settlement.id,
          tribeId: settlement.owner,
          progress: item.progress,
          cost: item.cost,
        })
      }
    }
  }

  return inProgress
}

/**
 * Checks if any tribe is building a specific wonder
 */
export function isWonderInProgress(state: GameState, wonderId: WonderId): boolean {
  for (const settlement of state.settlements.values()) {
    for (const item of settlement.productionQueue) {
      if (item.type === 'wonder' && item.id === wonderId) {
        return true
      }
    }
  }
  return false
}

// =============================================================================
// Initialize Wonders
// =============================================================================

/**
 * Creates initial wonder state for a new game
 */
export function createInitialWonders(): Wonder[] {
  return ALL_WONDERS.map((def) => ({
    id: def.id,
    name: def.name,
    reference: def.reference,
    category: def.category,
    productionCost: def.productionCost,
    floorPriceBonus: def.floorPriceBonus,
    // builtBy and location are undefined until built
  }))
}
