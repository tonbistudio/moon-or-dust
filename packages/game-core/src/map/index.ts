// Map generation and terrain utilities

import type {
  HexMap,
  Tile,
  TerrainType,
  TerrainFeature,
  ResourceType,
  ResourceCategory,
  Yields,
  HexCoord,
  Lootbox,
  LootboxId,
  BarbarianCamp,
  CampId,
} from '../types'
import { hex, hexKey, hexDistance, hexRange } from '../hex'
import { createRng } from '../state'

// =============================================================================
// Terrain Definitions
// =============================================================================

export interface TerrainDefinition {
  readonly type: TerrainType
  readonly movementCost: number
  readonly defenseBonus: number
  readonly baseYields: Yields
  readonly passable: boolean
}

export const TERRAIN: Record<TerrainType, TerrainDefinition> = {
  grassland: {
    type: 'grassland',
    movementCost: 1,
    defenseBonus: 0,
    baseYields: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 2 },
    passable: true,
  },
  plains: {
    type: 'plains',
    movementCost: 1,
    defenseBonus: 0,
    baseYields: { gold: 0, alpha: 0, vibes: 0, production: 1, growth: 1 },
    passable: true,
  },
  forest: {
    type: 'forest',
    movementCost: 2,
    defenseBonus: 25,
    baseYields: { gold: 0, alpha: 0, vibes: 0, production: 1, growth: 0 },
    passable: true,
  },
  hills: {
    type: 'hills',
    movementCost: 2,
    defenseBonus: 25,
    baseYields: { gold: 0, alpha: 0, vibes: 0, production: 2, growth: 0 },
    passable: true,
  },
  mountain: {
    type: 'mountain',
    movementCost: Infinity,
    defenseBonus: 0,
    baseYields: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 0 },
    passable: false,
  },
  water: {
    type: 'water',
    movementCost: Infinity,
    defenseBonus: 0,
    baseYields: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 0 },
    passable: false,
  },
  desert: {
    type: 'desert',
    movementCost: 1,
    defenseBonus: 0,
    baseYields: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 0 },
    passable: true,
  },
  jungle: {
    type: 'jungle',
    movementCost: 2,
    defenseBonus: 25,
    baseYields: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 1 },
    passable: true,
  },
  marsh: {
    type: 'marsh',
    movementCost: 2,
    defenseBonus: 0,
    baseYields: { gold: 0, alpha: 0, vibes: 0, production: -1, growth: 0 },
    passable: true,
  },
}

// =============================================================================
// Feature Yield Modifiers
// =============================================================================

export const FEATURE_YIELDS: Record<TerrainFeature, Yields> = {
  none: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 0 },
  river: { gold: 1, alpha: 0, vibes: 0, production: 0, growth: 1 },
  oasis: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 3 },
}

// =============================================================================
// Resource Definitions
// =============================================================================

export interface ResourceDefinition {
  readonly type: ResourceType
  readonly category: ResourceCategory
  readonly yields: Yields
  readonly validTerrain: readonly TerrainType[]
  readonly revealedByTech?: string
}

export const RESOURCES: Record<ResourceType, ResourceDefinition> = {
  // Strategic
  iron: {
    type: 'iron',
    category: 'strategic',
    yields: { gold: 0, alpha: 0, vibes: 0, production: 1, growth: 0 },
    validTerrain: ['hills', 'plains'],
    revealedByTech: 'iron_working',
  },
  horses: {
    type: 'horses',
    category: 'strategic',
    yields: { gold: 1, alpha: 0, vibes: 0, production: 1, growth: 0 },
    validTerrain: ['grassland', 'plains'],
    revealedByTech: 'animal_husbandry',
  },
  // Luxury
  gems: {
    type: 'gems',
    category: 'luxury',
    yields: { gold: 3, alpha: 0, vibes: 0, production: 0, growth: 0 },
    validTerrain: ['hills', 'jungle'],
  },
  marble: {
    type: 'marble',
    category: 'luxury',
    yields: { gold: 0, alpha: 0, vibes: 2, production: 0, growth: 0 },
    validTerrain: ['hills', 'plains'],
  },
  whitelists: {
    type: 'whitelists',
    category: 'luxury',
    yields: { gold: 1, alpha: 0, vibes: 0, production: 0, growth: 2 },
    validTerrain: ['grassland', 'plains', 'forest'],
  },
  rpcs: {
    type: 'rpcs',
    category: 'luxury',
    yields: { gold: 0, alpha: 3, vibes: 0, production: 0, growth: 0 },
    validTerrain: ['hills', 'plains', 'desert'],
  },
  // Bonus
  wheat: {
    type: 'wheat',
    category: 'bonus',
    yields: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 1 },
    validTerrain: ['grassland', 'plains'],
  },
  cattle: {
    type: 'cattle',
    category: 'bonus',
    yields: { gold: 0, alpha: 0, vibes: 0, production: 1, growth: 1 },
    validTerrain: ['grassland', 'plains'],
  },
}

// =============================================================================
// Yield Calculation
// =============================================================================

export function getTileYields(tile: Tile): Yields {
  const terrain = TERRAIN[tile.terrain]
  const feature = FEATURE_YIELDS[tile.feature]

  let yields: Yields = {
    gold: terrain.baseYields.gold + feature.gold,
    alpha: terrain.baseYields.alpha + feature.alpha,
    vibes: terrain.baseYields.vibes + feature.vibes,
    production: terrain.baseYields.production + feature.production,
    growth: terrain.baseYields.growth + feature.growth,
  }

  // Add resource yields if improved
  if (tile.resource?.improved) {
    const resourceDef = RESOURCES[tile.resource.type]
    yields = {
      gold: yields.gold + resourceDef.yields.gold,
      alpha: yields.alpha + resourceDef.yields.alpha,
      vibes: yields.vibes + resourceDef.yields.vibes,
      production: yields.production + resourceDef.yields.production,
      growth: yields.growth + resourceDef.yields.growth,
    }
  }

  return yields
}

export function getMovementCost(tile: Tile): number {
  return TERRAIN[tile.terrain].movementCost
}

export function isPassable(tile: Tile): boolean {
  return TERRAIN[tile.terrain].passable
}

// =============================================================================
// Map Generation
// =============================================================================

export interface MapGenerationConfig {
  readonly width: number
  readonly height: number
  readonly seed: number
  readonly playerCount: number
}

/**
 * Generates a hex map with terrain, resources, and features
 */
export function generateMap(config: MapGenerationConfig): {
  map: HexMap
  startPositions: HexCoord[]
  lootboxes: Lootbox[]
  barbarianCamps: BarbarianCamp[]
} {
  const { width, height, seed, playerCount } = config
  const rng = createRng(seed)
  const tiles = new Map<string, Tile>()

  // Generate biome seeds for clustered terrain
  const biomeSeeds = generateBiomeSeeds(width, height, rng)

  // Generate base terrain using biome clustering
  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      const coord = hex(q, r)
      const terrain = generateTerrain(q, r, width, height, rng, biomeSeeds)
      const feature = generateFeature(terrain, rng)

      const tile: Tile = {
        coord,
        terrain,
        feature,
      }
      tiles.set(hexKey(coord), tile)
    }
  }

  // Place starting positions for players (spread evenly)
  const startPositions = placeStartPositions(width, height, playerCount, tiles, rng)

  // Clear area around start positions for fairness
  for (const start of startPositions) {
    clearStartingArea(start, tiles)
  }

  // Place resources
  placeResources(tiles, startPositions, rng)

  // Place lootboxes (4-6, edge/corner biased, away from starts)
  const lootboxes = placeLootboxes(width, height, startPositions, rng)

  // Place barbarian camps (3-5, in fog, away from starts)
  const barbarianCamps = placeBarbarianCamps(width, height, startPositions, tiles, rng)

  return {
    map: { width, height, tiles },
    startPositions,
    lootboxes,
    barbarianCamps,
  }
}

// Biome seed for terrain clustering
interface BiomeSeed {
  q: number
  r: number
  terrain: TerrainType
  radius: number
}

function generateBiomeSeeds(
  width: number,
  height: number,
  rng: () => number
): BiomeSeed[] {
  const seeds: BiomeSeed[] = []

  // Number of biome seeds based on map size
  const numSeeds = Math.floor((width * height) / 40) + 4

  // Biome types with weights (excludes water/mountain which are placed specially)
  const biomeTypes: { terrain: TerrainType; weight: number }[] = [
    { terrain: 'grassland', weight: 25 },
    { terrain: 'plains', weight: 25 },
    { terrain: 'forest', weight: 15 },
    { terrain: 'hills', weight: 10 },
    { terrain: 'desert', weight: 10 },
    { terrain: 'jungle', weight: 10 },
    { terrain: 'marsh', weight: 5 },
  ]

  const totalWeight = biomeTypes.reduce((sum, b) => sum + b.weight, 0)

  for (let i = 0; i < numSeeds; i++) {
    // Random position (avoiding edges)
    const q = 2 + Math.floor(rng() * (width - 4))
    const r = 2 + Math.floor(rng() * (height - 4))

    // Weighted random terrain selection
    let roll = rng() * totalWeight
    let terrain: TerrainType = 'grassland'
    for (const biome of biomeTypes) {
      roll -= biome.weight
      if (roll <= 0) {
        terrain = biome.terrain
        break
      }
    }

    // Variable radius for organic shapes
    const radius = 3 + Math.floor(rng() * 4)

    seeds.push({ q, r, terrain, radius })
  }

  return seeds
}

function getTerrainFromBiomes(
  q: number,
  r: number,
  seeds: BiomeSeed[],
  rng: () => number
): TerrainType {
  // Find nearest biome seed
  let nearestSeed: BiomeSeed | null = null
  let nearestDist = Infinity

  for (const seed of seeds) {
    // Use hex distance approximation
    const dq = Math.abs(q - seed.q)
    const dr = Math.abs(r - seed.r)
    const dist = Math.max(dq, dr, Math.abs(dq - dr))

    // Weight by seed radius
    const weightedDist = dist / seed.radius

    if (weightedDist < nearestDist) {
      nearestDist = weightedDist
      nearestSeed = seed
    }
  }

  if (!nearestSeed) return 'grassland'

  // At biome edges, chance to blend with adjacent terrain types
  if (nearestDist > 0.7 && rng() < 0.3) {
    // Pick a related terrain for natural transitions
    return getTransitionTerrain(nearestSeed.terrain, rng)
  }

  // Small chance of variation within biome
  if (rng() < 0.15) {
    return getVariationTerrain(nearestSeed.terrain, rng)
  }

  return nearestSeed.terrain
}

function getTransitionTerrain(base: TerrainType, rng: () => number): TerrainType {
  // Natural terrain transitions
  const transitions: Record<TerrainType, TerrainType[]> = {
    grassland: ['plains', 'forest'],
    plains: ['grassland', 'hills', 'desert'],
    forest: ['grassland', 'jungle', 'hills'],
    hills: ['plains', 'mountain', 'forest'],
    mountain: ['hills'],
    desert: ['plains', 'hills'],
    jungle: ['forest', 'marsh'],
    marsh: ['jungle', 'grassland'],
    water: ['marsh'],
  }

  const options = transitions[base]
  return options[Math.floor(rng() * options.length)] ?? base
}

function getVariationTerrain(base: TerrainType, rng: () => number): TerrainType {
  // Minor variations within a biome
  const variations: Record<TerrainType, TerrainType[]> = {
    grassland: ['plains', 'grassland'],
    plains: ['grassland', 'plains'],
    forest: ['forest', 'jungle'],
    hills: ['hills', 'plains'],
    mountain: ['hills', 'mountain'],
    desert: ['desert', 'plains'],
    jungle: ['jungle', 'forest'],
    marsh: ['marsh', 'jungle'],
    water: ['water'],
  }

  const options = variations[base]
  return options[Math.floor(rng() * options.length)] ?? base
}

// Cache biome seeds per generation
let cachedBiomeSeeds: BiomeSeed[] = []

function generateTerrain(
  q: number,
  r: number,
  width: number,
  height: number,
  rng: () => number,
  biomeSeeds?: BiomeSeed[]
): TerrainType {
  // Edge of map is water
  if (q === 0 || q === width - 1 || r === 0 || r === height - 1) {
    return 'water'
  }

  // Near edge has chance of water
  if (q === 1 || q === width - 2 || r === 1 || r === height - 2) {
    if (rng() < 0.3) return 'water'
  }

  // Use biome seeds for clustered terrain
  const seeds = biomeSeeds ?? cachedBiomeSeeds
  if (seeds.length > 0) {
    const terrain = getTerrainFromBiomes(q, r, seeds, rng)

    // Scatter some mountains in hilly areas
    if (terrain === 'hills' && rng() < 0.15) {
      return 'mountain'
    }

    return terrain
  }

  // Fallback to random (shouldn't happen)
  const roll = rng()
  if (roll < 0.25) return 'grassland'
  if (roll < 0.45) return 'plains'
  if (roll < 0.55) return 'forest'
  if (roll < 0.65) return 'hills'
  if (roll < 0.70) return 'mountain'
  if (roll < 0.80) return 'desert'
  if (roll < 0.90) return 'jungle'
  return 'marsh'
}

function generateFeature(terrain: TerrainType, rng: () => number): TerrainFeature {
  // Rivers on passable land terrain
  if (terrain !== 'water' && terrain !== 'mountain' && rng() < 0.1) {
    return 'river'
  }

  // Oasis only in desert
  if (terrain === 'desert' && rng() < 0.15) {
    return 'oasis'
  }

  return 'none'
}

function placeStartPositions(
  width: number,
  height: number,
  playerCount: number,
  tiles: Map<string, Tile>,
  rng: () => number
): HexCoord[] {
  const positions: HexCoord[] = []
  const minDistance = Math.floor(Math.min(width, height) / (playerCount + 1))

  // Divide map into regions and place one start per region
  const regions = getRegions(width, height, playerCount)

  for (const region of regions) {
    let bestPos: HexCoord | null = null
    let bestScore = -Infinity

    // Try random positions in region
    for (let attempt = 0; attempt < 20; attempt++) {
      const q = region.minQ + Math.floor(rng() * (region.maxQ - region.minQ))
      const r = region.minR + Math.floor(rng() * (region.maxR - region.minR))
      const coord = hex(q, r)
      const tile = tiles.get(hexKey(coord))

      if (!tile || !isPassable(tile)) continue

      // Score based on terrain quality and distance from other starts
      let score = scoreTerrain(tile.terrain)

      for (const existing of positions) {
        const dist = hexDistance(coord, existing)
        if (dist < minDistance) {
          score -= 100 // Penalty for being too close
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestPos = coord
      }
    }

    if (bestPos) {
      positions.push(bestPos)
    }
  }

  return positions
}

function getRegions(
  width: number,
  height: number,
  count: number
): Array<{ minQ: number; maxQ: number; minR: number; maxR: number }> {
  const regions: Array<{ minQ: number; maxQ: number; minR: number; maxR: number }> = []

  if (count <= 2) {
    // Split horizontally
    const midQ = Math.floor(width / 2)
    regions.push({ minQ: 2, maxQ: midQ - 1, minR: 2, maxR: height - 3 })
    regions.push({ minQ: midQ + 1, maxQ: width - 3, minR: 2, maxR: height - 3 })
  } else {
    // 2x2 grid for 3-4 players
    const midQ = Math.floor(width / 2)
    const midR = Math.floor(height / 2)
    regions.push({ minQ: 2, maxQ: midQ - 1, minR: 2, maxR: midR - 1 })
    regions.push({ minQ: midQ + 1, maxQ: width - 3, minR: 2, maxR: midR - 1 })
    regions.push({ minQ: 2, maxQ: midQ - 1, minR: midR + 1, maxR: height - 3 })
    regions.push({ minQ: midQ + 1, maxQ: width - 3, minR: midR + 1, maxR: height - 3 })
  }

  return regions.slice(0, count)
}

function scoreTerrain(terrain: TerrainType): number {
  switch (terrain) {
    case 'grassland':
      return 10
    case 'plains':
      return 8
    case 'forest':
      return 5
    case 'hills':
      return 6
    case 'jungle':
      return 4
    default:
      return 0
  }
}

function clearStartingArea(start: HexCoord, tiles: Map<string, Tile>): void {
  // Make tiles within 2 hexes more hospitable
  const nearby = hexRange(start, 2)

  for (const coord of nearby) {
    const key = hexKey(coord)
    const tile = tiles.get(key)
    if (!tile) continue

    // Convert impassable to passable
    if (tile.terrain === 'mountain') {
      tiles.set(key, { ...tile, terrain: 'hills' })
    } else if (tile.terrain === 'water') {
      tiles.set(key, { ...tile, terrain: 'grassland' })
    } else if (tile.terrain === 'marsh') {
      tiles.set(key, { ...tile, terrain: 'plains' })
    }
  }

  // Ensure start tile is good
  const startTile = tiles.get(hexKey(start))
  if (startTile && startTile.terrain !== 'grassland' && startTile.terrain !== 'plains') {
    tiles.set(hexKey(start), { ...startTile, terrain: 'grassland' })
  }
}

function placeResources(
  tiles: Map<string, Tile>,
  startPositions: HexCoord[],
  rng: () => number
): void {
  const resourceTypes = Object.keys(RESOURCES) as ResourceType[]

  // Ensure each start position has at least one good resource nearby
  for (const start of startPositions) {
    const nearby = hexRange(start, 3)
    let placedNearby = 0

    for (const coord of nearby) {
      if (placedNearby >= 2) break

      const key = hexKey(coord)
      const tile = tiles.get(key)
      if (!tile || tile.resource || !isPassable(tile)) continue

      // Try to place a resource
      for (const resourceType of resourceTypes) {
        const def = RESOURCES[resourceType]
        if (def.validTerrain.includes(tile.terrain) && rng() < 0.3) {
          tiles.set(key, {
            ...tile,
            resource: {
              type: resourceType,
              category: def.category,
              revealed: def.category !== 'strategic', // Strategic starts hidden
              improved: false,
            },
          })
          placedNearby++
          break
        }
      }
    }
  }

  // Scatter additional resources across the map
  for (const [key, tile] of tiles) {
    if (tile.resource || !isPassable(tile)) continue

    for (const resourceType of resourceTypes) {
      const def = RESOURCES[resourceType]
      if (def.validTerrain.includes(tile.terrain) && rng() < 0.08) {
        tiles.set(key, {
          ...tile,
          resource: {
            type: resourceType,
            category: def.category,
            revealed: def.category !== 'strategic',
            improved: false,
          },
        })
        break
      }
    }
  }
}

function placeLootboxes(
  width: number,
  height: number,
  startPositions: HexCoord[],
  rng: () => number
): Lootbox[] {
  const lootboxes: Lootbox[] = []
  const count = 4 + Math.floor(rng() * 3) // 4-6 lootboxes
  const minDistFromStart = 4

  // Prefer edge/corner positions
  const candidates: HexCoord[] = []

  for (let q = 2; q < width - 2; q++) {
    for (let r = 2; r < height - 2; r++) {
      const coord = hex(q, r)

      // Check distance from starts
      const tooClose = startPositions.some((s) => hexDistance(coord, s) < minDistFromStart)
      if (tooClose) continue

      // Prefer edges
      const edgeScore =
        (q < 4 ? 1 : 0) + (q > width - 5 ? 1 : 0) + (r < 4 ? 1 : 0) + (r > height - 5 ? 1 : 0)

      // Add multiple times based on edge score for weighted selection
      for (let i = 0; i <= edgeScore; i++) {
        candidates.push(coord)
      }
    }
  }

  // Select random positions from candidates
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const index = Math.floor(rng() * candidates.length)
    const coord = candidates[index]!

    // Remove this and nearby positions from candidates
    for (let j = candidates.length - 1; j >= 0; j--) {
      if (hexDistance(candidates[j]!, coord) < 3) {
        candidates.splice(j, 1)
      }
    }

    lootboxes.push({
      id: `lootbox_${i + 1}` as LootboxId,
      position: coord,
      claimed: false,
    })
  }

  return lootboxes
}

function placeBarbarianCamps(
  width: number,
  height: number,
  startPositions: HexCoord[],
  tiles: Map<string, Tile>,
  rng: () => number
): BarbarianCamp[] {
  const camps: BarbarianCamp[] = []
  const count = 3 + Math.floor(rng() * 3) // 3-5 camps
  const minDistFromStart = 5

  const candidates: HexCoord[] = []

  for (let q = 2; q < width - 2; q++) {
    for (let r = 2; r < height - 2; r++) {
      const coord = hex(q, r)
      const tile = tiles.get(hexKey(coord))

      if (!tile || !isPassable(tile)) continue

      const tooClose = startPositions.some((s) => hexDistance(coord, s) < minDistFromStart)
      if (tooClose) continue

      candidates.push(coord)
    }
  }

  for (let i = 0; i < count && candidates.length > 0; i++) {
    const index = Math.floor(rng() * candidates.length)
    const coord = candidates[index]!

    // Remove nearby positions
    for (let j = candidates.length - 1; j >= 0; j--) {
      if (hexDistance(candidates[j]!, coord) < 4) {
        candidates.splice(j, 1)
      }
    }

    camps.push({
      id: `camp_${i + 1}` as CampId,
      position: coord,
      spawnCooldown: 3,
      unitsSpawned: [],
      destroyed: false,
    })
  }

  return camps
}
