// Building definitions, construction, and adjacency bonuses

import type {
  BuildingId,
  BuildingCategory,
  Yields,
  AdjacencyBonus,
  Settlement,
  GameState,
  Tile,
  TribeBonuses,
} from '../types'
import { hexNeighbors, hexKey } from '../hex'

// =============================================================================
// Building Definitions
// =============================================================================

export interface BuildingDefinition {
  readonly id: BuildingId
  readonly name: string
  readonly category: BuildingCategory
  readonly productionCost: number
  readonly maintenanceCost: number
  readonly baseYields: Yields
  readonly adjacencyBonus?: AdjacencyBonus
  readonly prerequisiteTech?: string
  readonly isUnique?: boolean // Tribe-specific building
}

const ZERO_YIELDS: Yields = {
  gold: 0,
  alpha: 0,
  vibes: 0,
  production: 0,
  growth: 0,
}

export const BUILDING_DEFINITIONS: Record<string, BuildingDefinition> = {
  // ==========================================================================
  // Era 1 Buildings
  // ==========================================================================

  // Population
  granary: {
    id: 'granary' as BuildingId,
    name: 'Granary',
    category: 'economy',
    productionCost: 40,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, growth: 2 },
    adjacencyBonus: {
      yield: 'growth',
      amount: 1,
      condition: { type: 'improvement', improvement: 'farm' },
    },
    prerequisiteTech: 'farming',
  },

  // Alpha
  library: {
    id: 'library' as BuildingId,
    name: 'Library',
    category: 'tech',
    productionCost: 50,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, alpha: 2 },
    adjacencyBonus: {
      yield: 'alpha',
      amount: 1,
      condition: { type: 'terrain', terrain: 'mountain' },
    },
    prerequisiteTech: 'coding',
  },

  // Gold
  solanart: {
    id: 'solanart' as BuildingId,
    name: 'Solanart',
    category: 'economy',
    productionCost: 50,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, gold: 3 },
    adjacencyBonus: {
      yield: 'gold',
      amount: 1,
      condition: { type: 'resource', category: 'luxury' },
    },
    prerequisiteTech: 'minting',
  },

  // Vibes
  gallery: {
    id: 'gallery' as BuildingId,
    name: 'Gallery',
    category: 'vibes',
    productionCost: 45,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, vibes: 2 },
    prerequisiteTech: 'pfps',
  },

  // Combat Production
  barracks: {
    id: 'barracks' as BuildingId,
    name: 'Barracks',
    category: 'military',
    productionCost: 50,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, production: 1 },
    // Grants XP to trained units
    prerequisiteTech: 'bronze_working',
  },

  // Defense
  walls: {
    id: 'walls' as BuildingId,
    name: 'Walls',
    category: 'military',
    productionCost: 60,
    maintenanceCost: 1,
    baseYields: ZERO_YIELDS,
    adjacencyBonus: {
      yield: 'production',
      amount: 1,
      condition: { type: 'terrain', terrain: 'hills' },
    },
    prerequisiteTech: 'masonry',
  },

  // ==========================================================================
  // Era 2 Buildings
  // ==========================================================================

  // Population
  server: {
    id: 'server' as BuildingId,
    name: 'Server',
    category: 'economy',
    productionCost: 80,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, growth: 3 },
    prerequisiteTech: 'discord',
  },

  // Alpha
  alpha_hunter_hideout: {
    id: 'alpha_hunter_hideout' as BuildingId,
    name: 'Alpha Hunter Hideout',
    category: 'tech',
    productionCost: 100,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, alpha: 4 },
    prerequisiteTech: 'matrica',
  },

  // Gold
  yield_farm: {
    id: 'yield_farm' as BuildingId,
    name: 'Yield Farm',
    category: 'economy',
    productionCost: 90,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, gold: 5 },
    prerequisiteTech: 'defi',
  },

  // Vibes
  art_upgrader: {
    id: 'art_upgrader' as BuildingId,
    name: 'Art Upgrader',
    category: 'vibes',
    productionCost: 80,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, vibes: 3 },
    prerequisiteTech: 'staking',
  },

  // Production
  bot_farm: {
    id: 'bot_farm' as BuildingId,
    name: 'Bot Farm',
    category: 'production',
    productionCost: 100,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, production: 3 },
    adjacencyBonus: {
      yield: 'production',
      amount: 1,
      condition: { type: 'improvement', improvement: 'mine' },
    },
    prerequisiteTech: 'botting',
  },

  // Combat Production
  arena: {
    id: 'arena' as BuildingId,
    name: 'Arena',
    category: 'military',
    productionCost: 90,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, production: 2 },
    // Grants XP to trained units
    prerequisiteTech: 'onchain_gaming',
  },

  // ==========================================================================
  // Era 3 Buildings
  // ==========================================================================

  // Population
  hype_machine: {
    id: 'hype_machine' as BuildingId,
    name: 'Hype Machine',
    category: 'economy',
    productionCost: 140,
    maintenanceCost: 3,
    baseYields: { ...ZERO_YIELDS, growth: 5 },
    prerequisiteTech: 'ponzinomics',
  },

  // Gold
  dex_labs: {
    id: 'dex_labs' as BuildingId,
    name: 'Dex Labs',
    category: 'economy',
    productionCost: 150,
    maintenanceCost: 3,
    baseYields: { ...ZERO_YIELDS, gold: 8 },
    prerequisiteTech: 'tokenomics',
  },

  // Production
  ledger_foundry: {
    id: 'ledger_foundry' as BuildingId,
    name: 'Ledger Foundry',
    category: 'production',
    productionCost: 160,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, production: 5 },
    prerequisiteTech: 'hardware_wallets',
  },

  // Vibes
  cult_hq: {
    id: 'cult_hq' as BuildingId,
    name: 'Cult HQ',
    category: 'vibes',
    productionCost: 180,
    maintenanceCost: 3,
    baseYields: { ...ZERO_YIELDS, vibes: 6 },
    prerequisiteTech: 'ohm',
  },

  // ==========================================================================
  // Unique Tribal Buildings
  // ==========================================================================

  // Monkes: +2 Gold per adjacent Jungle or Forest
  // Unlocked by: Lending
  degen_mints_cabana: {
    id: 'degen_mints_cabana' as BuildingId,
    name: 'Degen Mints Cabana',
    category: 'economy',
    productionCost: 80,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, gold: 3 },
    adjacencyBonus: {
      yield: 'gold',
      amount: 2,
      condition: { type: 'terrain', terrain: 'forest' }, // Also applies to jungle (handled in logic)
    },
    prerequisiteTech: 'lending',
    isUnique: true, // Monkes
  },

  // Geckos: +2 Alpha per adjacent Coast or Desert
  // Unlocked by: Staking
  the_garage: {
    id: 'the_garage' as BuildingId,
    name: 'The Garage',
    category: 'tech',
    productionCost: 80,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, alpha: 3 },
    adjacencyBonus: {
      yield: 'alpha',
      amount: 2,
      condition: { type: 'terrain', terrain: 'desert' }, // Also applies to coast (handled in logic)
    },
    prerequisiteTech: 'staking',
    isUnique: true, // Geckos
  },

  // DeGods: +20% combat unit production
  // Unlocked by: Matrica
  eternal_bridge: {
    id: 'eternal_bridge' as BuildingId,
    name: 'Eternal Bridge',
    category: 'military',
    productionCost: 100,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, production: 2 },
    // Note: +20% combat unit production handled separately in production logic
    prerequisiteTech: 'matrica',
    isUnique: true, // DeGods
  },

  // Cets: +1 Vibes per adjacent building (any)
  // Unlocked by: Discord
  creckhouse: {
    id: 'creckhouse' as BuildingId,
    name: 'Creckhouse',
    category: 'vibes',
    productionCost: 80,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, vibes: 3 },
    adjacencyBonus: {
      yield: 'vibes',
      amount: 1,
      condition: { type: 'building' }, // Any adjacent building
    },
    prerequisiteTech: 'discord',
    isUnique: true, // Cets
  },
}

// =============================================================================
// Adjacency Bonus Calculation
// =============================================================================

/**
 * Calculates adjacency bonus for a building at a settlement
 */
export function calculateAdjacencyBonus(
  state: GameState,
  settlement: Settlement,
  building: BuildingDefinition
): number {
  if (!building.adjacencyBonus) return 0

  const bonus = building.adjacencyBonus
  let count = 0

  // Get all adjacent hexes to settlement
  const neighbors = hexNeighbors(settlement.position)

  for (const neighbor of neighbors) {
    const tile = state.map.tiles.get(hexKey(neighbor))
    if (!tile) continue

    if (matchesAdjacencyCondition(tile, settlement, bonus.condition, state)) {
      count++
    }
  }

  return count * bonus.amount
}

function matchesAdjacencyCondition(
  tile: Tile,
  settlement: Settlement,
  condition: AdjacencyBonus['condition'],
  state: GameState
): boolean {
  switch (condition.type) {
    case 'terrain':
      // Handle special multi-terrain cases for unique buildings
      // Degen Mints Cabana: forest OR jungle
      if (condition.terrain === 'forest') {
        // Check if this is a Monkes building (degen_mints_cabana)
        if (settlement.buildings.includes('degen_mints_cabana' as never)) {
          return tile.terrain === 'forest' || tile.terrain === 'jungle'
        }
      }
      // The Garage: desert OR coast (water adjacent to land)
      if (condition.terrain === 'desert') {
        // Check if this is a Geckos building (the_garage)
        if (settlement.buildings.includes('the_garage' as never)) {
          return tile.terrain === 'desert' || tile.terrain === 'water'
        }
      }
      return tile.terrain === condition.terrain

    case 'resource':
      return (
        tile.resource !== undefined &&
        tile.resource.revealed &&
        getResourceCategory(tile.resource.type) === condition.category
      )

    case 'improvement':
      return tile.improvement === condition.improvement

    case 'building':
      // Check if there's a settlement with this building adjacent
      // For simplicity, we check if any adjacent tile has a settlement with the building
      for (const s of state.settlements.values()) {
        if (hexKey(s.position) === hexKey(tile.coord)) {
          if (condition.buildingId) {
            return s.buildings.includes(condition.buildingId)
          }
          return s.buildings.length > 0
        }
      }
      return false
  }
}

function getResourceCategory(
  resourceType: string
): 'strategic' | 'luxury' | 'bonus' {
  const strategic = ['iron', 'horses']
  const luxury = ['gems', 'marble', 'whitelists', 'rpcs']
  if (strategic.includes(resourceType)) return 'strategic'
  if (luxury.includes(resourceType)) return 'luxury'
  return 'bonus'
}

// =============================================================================
// Building Yields Calculation
// =============================================================================

/**
 * Calculates total yields from all buildings in a settlement
 * @param tribeBonuses Optional tribe bonuses to apply category-specific modifiers
 */
export function calculateBuildingYields(
  state: GameState,
  settlement: Settlement,
  tribeBonuses?: TribeBonuses
): Yields {
  let yields: Yields = {
    gold: 0,
    alpha: 0,
    vibes: 0,
    production: 0,
    growth: 0,
  }

  // Track yields by category for tribe bonuses
  let goldFromGoldBuildings = 0
  let vibesFromCultureBuildings = 0
  let productionFromProductionBuildings = 0

  for (const buildingId of settlement.buildings) {
    const building = BUILDING_DEFINITIONS[buildingId]
    if (!building) continue

    // Add base yields
    yields = addYields(yields, building.baseYields)

    // Track category-specific yields for tribe bonuses
    if (building.category === 'economy') {
      goldFromGoldBuildings += building.baseYields.gold
    }
    if (building.category === 'vibes') {
      vibesFromCultureBuildings += building.baseYields.vibes
    }
    if (building.category === 'production') {
      productionFromProductionBuildings += building.baseYields.production
    }

    // Add adjacency bonus
    const adjacencyBonus = calculateAdjacencyBonus(state, settlement, building)
    if (adjacencyBonus > 0 && building.adjacencyBonus) {
      const yieldKey = building.adjacencyBonus.yield
      yields = {
        ...yields,
        [yieldKey]: yields[yieldKey] + adjacencyBonus,
      }

      // Also track adjacency yields by category
      if (building.category === 'economy' && yieldKey === 'gold') {
        goldFromGoldBuildings += adjacencyBonus
      }
      if (building.category === 'vibes' && yieldKey === 'vibes') {
        vibesFromCultureBuildings += adjacencyBonus
      }
      if (building.category === 'production' && yieldKey === 'production') {
        productionFromProductionBuildings += adjacencyBonus
      }
    }
  }

  // Apply tribe bonuses to category-specific yields
  if (tribeBonuses) {
    // DeGods: +10% gold from gold-yield buildings
    if (tribeBonuses.goldFromGoldBuildingsPercent && goldFromGoldBuildings > 0) {
      const bonusGold = Math.floor(goldFromGoldBuildings * tribeBonuses.goldFromGoldBuildingsPercent)
      yields = { ...yields, gold: yields.gold + bonusGold }
    }

    // Cets: +10% Vibes from culture buildings
    if (tribeBonuses.vibesFromCultureBuildingsPercent && vibesFromCultureBuildings > 0) {
      const bonusVibes = Math.floor(vibesFromCultureBuildings * tribeBonuses.vibesFromCultureBuildingsPercent)
      yields = { ...yields, vibes: yields.vibes + bonusVibes }
    }

    // Cets: +10% production from production buildings
    if (tribeBonuses.productionFromProductionBuildingsPercent && productionFromProductionBuildings > 0) {
      const bonusProduction = Math.floor(productionFromProductionBuildings * tribeBonuses.productionFromProductionBuildingsPercent)
      yields = { ...yields, production: yields.production + bonusProduction }
    }
  }

  return yields
}

function addYields(a: Yields, b: Yields): Yields {
  return {
    gold: a.gold + b.gold,
    alpha: a.alpha + b.alpha,
    vibes: a.vibes + b.vibes,
    production: a.production + b.production,
    growth: a.growth + b.growth,
  }
}

// =============================================================================
// Building Maintenance
// =============================================================================

/**
 * Calculates total maintenance cost for all buildings in a settlement
 */
export function calculateBuildingMaintenance(settlement: Settlement): number {
  let maintenance = 0

  for (const buildingId of settlement.buildings) {
    const building = BUILDING_DEFINITIONS[buildingId]
    if (building) {
      maintenance += building.maintenanceCost
    }
  }

  return maintenance
}

/**
 * Calculates total maintenance cost for a player's buildings
 */
export function calculatePlayerBuildingMaintenance(
  state: GameState,
  tribeId: string
): number {
  let maintenance = 0

  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      maintenance += calculateBuildingMaintenance(settlement)
    }
  }

  return maintenance
}

// =============================================================================
// Building Construction
// =============================================================================

/**
 * Checks if a building can be constructed in a settlement
 */
export function canConstructBuilding(
  state: GameState,
  settlement: Settlement,
  buildingId: string
): { canBuild: boolean; reason?: string } {
  const building = BUILDING_DEFINITIONS[buildingId]

  if (!building) {
    return { canBuild: false, reason: 'Building does not exist' }
  }

  // Check if already built
  if (settlement.buildings.includes(building.id)) {
    return { canBuild: false, reason: 'Building already exists' }
  }

  // Check prerequisite tech
  if (building.prerequisiteTech) {
    const player = state.players.find((p) => p.tribeId === settlement.owner)
    if (player && !player.researchedTechs.includes(building.prerequisiteTech as never)) {
      return { canBuild: false, reason: `Requires ${building.prerequisiteTech}` }
    }
  }

  // Check if unique building belongs to this tribe
  if (building.isUnique) {
    const tribeBuildingMap: Record<string, string> = {
      degen_mints_cabana: 'monkes',
      the_garage: 'geckos',
      eternal_bridge: 'degods',
      creckhouse: 'cets',
    }
    const requiredTribe = tribeBuildingMap[buildingId]
    if (requiredTribe) {
      const player = state.players.find((p) => p.tribeId === settlement.owner)
      // Check if player's tribe matches (simplified check)
      if (player && !settlement.owner.includes(requiredTribe)) {
        return { canBuild: false, reason: 'Unique building for another tribe' }
      }
    }
  }

  return { canBuild: true }
}

/**
 * Adds a building to a settlement
 */
export function addBuildingToSettlement(
  settlement: Settlement,
  buildingId: BuildingId
): Settlement {
  return {
    ...settlement,
    buildings: [...settlement.buildings, buildingId],
  }
}

// =============================================================================
// Get Available Buildings
// =============================================================================

/**
 * Gets list of buildings that can be constructed in a settlement
 */
export function getAvailableBuildings(
  state: GameState,
  settlement: Settlement
): BuildingDefinition[] {
  const available: BuildingDefinition[] = []

  for (const [id, building] of Object.entries(BUILDING_DEFINITIONS)) {
    const result = canConstructBuilding(state, settlement, id)
    if (result.canBuild) {
      available.push(building)
    }
  }

  return available
}
