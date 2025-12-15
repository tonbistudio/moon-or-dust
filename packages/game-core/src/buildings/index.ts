// Building definitions, construction, and adjacency bonuses

import type {
  BuildingId,
  BuildingCategory,
  Yields,
  AdjacencyBonus,
  Settlement,
  GameState,
  Tile,
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

  // Economy
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
    prerequisiteTech: 'pottery',
  },

  marketplace: {
    id: 'marketplace' as BuildingId,
    name: 'Marketplace',
    category: 'economy',
    productionCost: 60,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, gold: 3 },
    adjacencyBonus: {
      yield: 'gold',
      amount: 1,
      condition: { type: 'resource', category: 'luxury' },
    },
    prerequisiteTech: 'currency',
  },

  // Tech/Science
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
    prerequisiteTech: 'writing',
  },

  // Culture
  monument: {
    id: 'monument' as BuildingId,
    name: 'Monument',
    category: 'vibes',
    productionCost: 30,
    maintenanceCost: 0,
    baseYields: { ...ZERO_YIELDS, vibes: 2 },
    prerequisiteTech: 'masonry',
  },

  // Military
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

  // Production
  workshop: {
    id: 'workshop' as BuildingId,
    name: 'Workshop',
    category: 'production',
    productionCost: 70,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, production: 2 },
    adjacencyBonus: {
      yield: 'production',
      amount: 1,
      condition: { type: 'improvement', improvement: 'mine' },
    },
  },

  // ==========================================================================
  // Era 2 Buildings
  // ==========================================================================

  bank: {
    id: 'bank' as BuildingId,
    name: 'Bank',
    category: 'economy',
    productionCost: 100,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, gold: 5 },
    prerequisiteTech: 'banking',
  },

  university: {
    id: 'university' as BuildingId,
    name: 'University',
    category: 'tech',
    productionCost: 120,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, alpha: 4 },
    prerequisiteTech: 'printing',
  },

  arena: {
    id: 'arena' as BuildingId,
    name: 'Arena',
    category: 'vibes',
    productionCost: 80,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, vibes: 2, gold: 1 },
    prerequisiteTech: 'construction',
  },

  aqueduct: {
    id: 'aqueduct' as BuildingId,
    name: 'Aqueduct',
    category: 'production',
    productionCost: 90,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, growth: 3 },
    prerequisiteTech: 'engineering',
  },

  armory: {
    id: 'armory' as BuildingId,
    name: 'Armory',
    category: 'military',
    productionCost: 100,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, production: 2 },
    // Grants additional XP
    prerequisiteTech: 'military_tactics',
  },

  // ==========================================================================
  // Era 3 Buildings
  // ==========================================================================

  stock_exchange: {
    id: 'stock_exchange' as BuildingId,
    name: 'Stock Exchange',
    category: 'economy',
    productionCost: 150,
    maintenanceCost: 3,
    baseYields: { ...ZERO_YIELDS, gold: 8 },
    prerequisiteTech: 'economics',
  },

  foundry: {
    id: 'foundry' as BuildingId,
    name: 'Foundry',
    category: 'production',
    productionCost: 140,
    maintenanceCost: 2,
    baseYields: { ...ZERO_YIELDS, production: 4 },
    prerequisiteTech: 'metal_casting',
  },

  // ==========================================================================
  // Unique Tribal Buildings
  // ==========================================================================

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
      condition: { type: 'terrain', terrain: 'jungle' },
    },
    isUnique: true, // Monkes
  },

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
      condition: { type: 'terrain', terrain: 'water' },
    },
    isUnique: true, // Geckos
  },

  eternal_bridge: {
    id: 'eternal_bridge' as BuildingId,
    name: 'Eternal Bridge',
    category: 'economy',
    productionCost: 80,
    maintenanceCost: 1,
    baseYields: { ...ZERO_YIELDS, gold: 2, production: 1 },
    adjacencyBonus: {
      yield: 'gold',
      amount: 1,
      condition: { type: 'building' }, // Any adjacent building
    },
    isUnique: true, // DeGods
  },

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
  _settlement: Settlement,
  condition: AdjacencyBonus['condition'],
  state: GameState
): boolean {
  switch (condition.type) {
    case 'terrain':
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
 */
export function calculateBuildingYields(
  state: GameState,
  settlement: Settlement
): Yields {
  let yields: Yields = {
    gold: 0,
    alpha: 0,
    vibes: 0,
    production: 0,
    growth: 0,
  }

  for (const buildingId of settlement.buildings) {
    const building = BUILDING_DEFINITIONS[buildingId]
    if (!building) continue

    // Add base yields
    yields = addYields(yields, building.baseYields)

    // Add adjacency bonus
    const adjacencyBonus = calculateAdjacencyBonus(state, settlement, building)
    if (adjacencyBonus > 0 && building.adjacencyBonus) {
      const yieldKey = building.adjacencyBonus.yield
      yields = {
        ...yields,
        [yieldKey]: yields[yieldKey] + adjacencyBonus,
      }
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
