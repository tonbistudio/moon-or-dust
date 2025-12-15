// Tile improvements - farms, mines, pastures, and NFT-themed improvements

import type {
  ImprovementType,
  Tile,
  Yields,
  GameState,
  HexCoord,
  TribeId,
  Unit,
  TerrainType,
  ResourceType,
} from '../types'
import { hexKey } from '../hex'
import { UNIT_DEFINITIONS } from '../units'

// =============================================================================
// Improvement Definitions
// =============================================================================

export interface ImprovementDefinition {
  readonly type: ImprovementType
  readonly name: string
  readonly yields: Yields
  readonly validTerrain: TerrainType[]
  readonly validResources?: ResourceType[]
  readonly builderChargesCost: number
  readonly prerequisiteTech?: string
  readonly removesFeature?: boolean // e.g., farm removes forest
}

const ZERO_YIELDS: Yields = {
  gold: 0,
  alpha: 0,
  vibes: 0,
  production: 0,
  growth: 0,
}

export const IMPROVEMENT_DEFINITIONS: Record<ImprovementType, ImprovementDefinition> = {
  farm: {
    type: 'farm',
    name: 'Farm',
    yields: { ...ZERO_YIELDS, growth: 1 },
    validTerrain: ['grassland', 'plains', 'desert'],
    validResources: ['wheat'],
    builderChargesCost: 1,
    removesFeature: true, // Removes forest/jungle if present
  },

  mine: {
    type: 'mine',
    name: 'Mine',
    yields: { ...ZERO_YIELDS, production: 1 },
    validTerrain: ['hills', 'mountain'],
    validResources: ['iron', 'gems'],
    builderChargesCost: 1,
    prerequisiteTech: 'mining',
  },

  pasture: {
    type: 'pasture',
    name: 'Pasture',
    yields: { ...ZERO_YIELDS, production: 1, growth: 1 },
    validTerrain: ['grassland', 'plains'],
    validResources: ['horses', 'cattle'],
    builderChargesCost: 1,
    prerequisiteTech: 'animal_husbandry',
  },

  quarry: {
    type: 'quarry',
    name: 'Quarry',
    yields: { ...ZERO_YIELDS, production: 1, vibes: 1 },
    validTerrain: ['hills'],
    validResources: ['marble'],
    builderChargesCost: 1,
    prerequisiteTech: 'mining',
  },

  // NFT-themed improvements
  mint: {
    type: 'mint',
    name: 'NFT Mint',
    yields: { ...ZERO_YIELDS, gold: 2, growth: 1 },
    validTerrain: ['grassland', 'plains', 'desert'],
    validResources: ['whitelists'],
    builderChargesCost: 1,
    prerequisiteTech: 'currency',
  },

  server_farm: {
    type: 'server_farm',
    name: 'RPC Server Farm',
    yields: { ...ZERO_YIELDS, alpha: 2, gold: 1 },
    validTerrain: ['plains', 'hills'],
    validResources: ['rpcs'],
    builderChargesCost: 1,
    prerequisiteTech: 'writing',
  },
}

// =============================================================================
// Improvement Validation
// =============================================================================

export interface CanBuildImprovementResult {
  canBuild: boolean
  reason?: string
}

/**
 * Checks if an improvement can be built on a tile
 */
export function canBuildImprovement(
  state: GameState,
  coord: HexCoord,
  improvementType: ImprovementType,
  builderId: TribeId
): CanBuildImprovementResult {
  const tile = state.map.tiles.get(hexKey(coord))

  if (!tile) {
    return { canBuild: false, reason: 'Invalid tile' }
  }

  const improvement = IMPROVEMENT_DEFINITIONS[improvementType]

  // Check if tile already has an improvement
  if (tile.improvement) {
    return { canBuild: false, reason: 'Tile already improved' }
  }

  // Check terrain validity
  if (!improvement.validTerrain.includes(tile.terrain)) {
    return { canBuild: false, reason: `Cannot build ${improvement.name} on ${tile.terrain}` }
  }

  // Check if tile is owned by the builder's tribe
  if (tile.owner !== builderId) {
    return { canBuild: false, reason: 'Tile not owned by your tribe' }
  }

  // Check prerequisite tech
  if (improvement.prerequisiteTech) {
    const player = state.players.find((p) => p.tribeId === builderId)
    if (player && !player.researchedTechs.includes(improvement.prerequisiteTech as never)) {
      return { canBuild: false, reason: `Requires ${improvement.prerequisiteTech}` }
    }
  }

  // Special case: resource-specific improvements
  if (tile.resource?.revealed && improvement.validResources) {
    if (!improvement.validResources.includes(tile.resource.type)) {
      return { canBuild: false, reason: `${improvement.name} not valid for this resource` }
    }
  }

  return { canBuild: true }
}

/**
 * Gets valid improvements for a tile
 */
export function getValidImprovements(
  state: GameState,
  coord: HexCoord,
  builderId: TribeId
): ImprovementType[] {
  const valid: ImprovementType[] = []

  for (const [type] of Object.entries(IMPROVEMENT_DEFINITIONS)) {
    const result = canBuildImprovement(state, coord, type as ImprovementType, builderId)
    if (result.canBuild) {
      valid.push(type as ImprovementType)
    }
  }

  return valid
}

/**
 * Gets the best improvement for a resource on a tile
 */
export function getBestImprovementForResource(
  resourceType: ResourceType
): ImprovementType | null {
  for (const [type, def] of Object.entries(IMPROVEMENT_DEFINITIONS)) {
    if (def.validResources?.includes(resourceType)) {
      return type as ImprovementType
    }
  }
  return null
}

// =============================================================================
// Building Improvements
// =============================================================================

/**
 * Builds an improvement on a tile, consuming builder charges
 * Returns updated state and builder
 */
export function buildImprovement(
  state: GameState,
  builder: Unit,
  coord: HexCoord,
  improvementType: ImprovementType
): { state: GameState; builder: Unit } | null {
  const def = UNIT_DEFINITIONS[builder.type]

  // Verify builder can build
  if (!def || def.buildCharges === 0) {
    return null
  }

  // Check if builder has charges remaining
  // Note: We need to track charges used - for now assume full charges
  const result = canBuildImprovement(state, coord, improvementType, builder.owner)
  if (!result.canBuild) {
    return null
  }

  const tile = state.map.tiles.get(hexKey(coord))
  if (!tile) return null

  const improvement = IMPROVEMENT_DEFINITIONS[improvementType]

  // Update tile with improvement
  const newTiles = new Map(state.map.tiles)
  let updatedTile: Tile = {
    ...tile,
    improvement: improvementType,
  }

  // Mark resource as improved if present
  if (tile.resource?.revealed) {
    updatedTile = {
      ...updatedTile,
      resource: {
        ...tile.resource,
        improved: true,
      },
    }
  }

  // Remove feature if improvement requires it
  if (improvement.removesFeature && tile.feature && tile.feature !== 'none') {
    updatedTile = {
      ...updatedTile,
      feature: 'none',
    }
  }

  newTiles.set(hexKey(coord), updatedTile)

  // Update builder (consume a charge by marking hasActed)
  // In a full implementation, we'd track remaining charges on the unit
  const updatedBuilder: Unit = {
    ...builder,
    hasActed: true,
  }

  return {
    state: {
      ...state,
      map: {
        ...state.map,
        tiles: newTiles,
      },
    },
    builder: updatedBuilder,
  }
}

// =============================================================================
// Improvement Yields
// =============================================================================

/**
 * Calculates yields from an improvement on a tile
 */
export function calculateImprovementYields(tile: Tile): Yields {
  if (!tile.improvement) {
    return { ...ZERO_YIELDS }
  }

  const improvement = IMPROVEMENT_DEFINITIONS[tile.improvement]
  return { ...improvement.yields }
}

/**
 * Checks if a tile has an improvement
 */
export function hasImprovement(state: GameState, coord: HexCoord): boolean {
  const tile = state.map.tiles.get(hexKey(coord))
  return tile?.improvement !== undefined
}

/**
 * Gets the improvement on a tile
 */
export function getImprovement(
  state: GameState,
  coord: HexCoord
): ImprovementType | undefined {
  const tile = state.map.tiles.get(hexKey(coord))
  return tile?.improvement
}

// =============================================================================
// Pillaging Improvements
// =============================================================================

/**
 * Pillages an improvement, removing it and granting gold
 */
export function pillageImprovement(
  state: GameState,
  coord: HexCoord,
  pillagerTribeId: TribeId
): { state: GameState; goldGained: number } | null {
  const tile = state.map.tiles.get(hexKey(coord))

  if (!tile || !tile.improvement) {
    return null
  }

  // Can't pillage own improvements
  if (tile.owner === pillagerTribeId) {
    return null
  }

  const improvement = IMPROVEMENT_DEFINITIONS[tile.improvement]
  const goldGained = improvement.builderChargesCost * 25 // Gold reward for pillaging

  // Remove improvement - omit the improvement property
  const newTiles = new Map(state.map.tiles)
  const { improvement: _, ...tileWithoutImprovement } = tile

  // Build the updated tile, handling resource separately
  let updatedTile: Tile
  if (tile.resource) {
    updatedTile = {
      ...tileWithoutImprovement,
      resource: {
        ...tile.resource,
        improved: false,
      },
    }
  } else {
    updatedTile = tileWithoutImprovement
  }
  newTiles.set(hexKey(coord), updatedTile)

  // Grant gold to pillager
  const newPlayers = state.players.map((p) =>
    p.tribeId === pillagerTribeId
      ? { ...p, treasury: p.treasury + goldGained }
      : p
  )

  return {
    state: {
      ...state,
      map: {
        ...state.map,
        tiles: newTiles,
      },
      players: newPlayers,
    },
    goldGained,
  }
}

// =============================================================================
// Repair Improvements
// =============================================================================

/**
 * Repairs a pillaged improvement (restores it)
 * Requires a builder on the tile
 */
export function repairImprovement(
  state: GameState,
  coord: HexCoord,
  improvementType: ImprovementType,
  builderTribeId: TribeId
): GameState | null {
  const tile = state.map.tiles.get(hexKey(coord))

  if (!tile) return null

  // Must be owned territory
  if (tile.owner !== builderTribeId) {
    return null
  }

  // Must not have existing improvement
  if (tile.improvement) {
    return null
  }

  // Use buildImprovement logic (but with reduced cost in full implementation)
  // For now, just place the improvement
  const newTiles = new Map(state.map.tiles)

  let updatedTile: Tile
  if (tile.resource) {
    updatedTile = {
      ...tile,
      improvement: improvementType,
      resource: {
        ...tile.resource,
        improved: true,
      },
    }
  } else {
    updatedTile = {
      ...tile,
      improvement: improvementType,
    }
  }
  newTiles.set(hexKey(coord), updatedTile)

  return {
    ...state,
    map: {
      ...state.map,
      tiles: newTiles,
    },
  }
}
