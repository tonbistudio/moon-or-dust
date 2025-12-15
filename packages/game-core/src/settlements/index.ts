// Settlement management - founding, yields, buildings, and population

import type {
  Settlement,
  TribeId,
  HexCoord,
  GameState,
  Tile,
  Yields,
  TribeName,
} from '../types'
import { generateSettlementId } from '../state'
import { hexKey, hexRange } from '../hex'

// =============================================================================
// Settlement Names (Tribe-Specific)
// =============================================================================

// Tribe-specific settlement names - first name is always the capital
const TRIBE_SETTLEMENT_NAMES: Record<TribeName, string[]> = {
  monkes: ['Monkee Dao', 'Skelley Central', 'Sombrero Junction', 'Alien City', 'Nom Town'],
  geckos: ['Enigma City', 'Targari', 'Martu', 'Barda', 'Alura'],
  degods: ['Dust City', 'Y00t Town', 'Killer 3 Central', 'Supernova', 'DeHeaven'],
  cets: ['Peblo City', 'Buddha Town', 'Enlightenment', 'Illuminati', '313 City'],
  // Coming soon tribes - placeholder names
  gregs: ['Greg Town', 'Gregville', 'New Greg', 'Gregopolis', 'Gregland'],
  dragonz: ['Dragon Keep', 'Fire Valley', 'Scale City', 'Wyrm Haven', 'Ember Falls'],
}

// Fallback names if tribe runs out
const FALLBACK_SETTLEMENT_NAMES = [
  'New Haven',
  'Solana Springs',
  'Crypto City',
  'Token Town',
  'Block Heights',
  'Chain Valley',
  'Mint Mesa',
  'Stake Lake',
  'Yield Point',
  'Defi Dale',
]

// Track which name index each tribe is on
const tribeNameIndices = new Map<string, number>()

/**
 * Gets the next settlement name for a tribe
 * First settlement gets the capital name, subsequent get other names
 */
export function getNextSettlementName(tribeId: TribeId, tribeName?: TribeName): string {
  const currentIndex = tribeNameIndices.get(tribeId) ?? 0
  tribeNameIndices.set(tribeId, currentIndex + 1)

  // Get tribe-specific names if tribeName provided
  if (tribeName) {
    const tribeNames = TRIBE_SETTLEMENT_NAMES[tribeName]
    if (tribeNames && currentIndex < tribeNames.length) {
      return tribeNames[currentIndex]!
    }
  }

  // Fallback to generic names
  const fallbackIndex = currentIndex % FALLBACK_SETTLEMENT_NAMES.length
  return FALLBACK_SETTLEMENT_NAMES[fallbackIndex]!
}

/**
 * Gets the capital name for a tribe
 */
export function getCapitalName(tribeName: TribeName): string {
  return TRIBE_SETTLEMENT_NAMES[tribeName]?.[0] ?? 'Capital'
}

export function resetSettlementNames(): void {
  tribeNameIndices.clear()
}

// =============================================================================
// Settlement Creation
// =============================================================================

export interface CreateSettlementOptions {
  owner: TribeId
  position: HexCoord
  tribeName?: TribeName // Used to get tribe-specific settlement names
  name?: string // Override name (optional)
  isCapital?: boolean
}

/**
 * Creates a new settlement
 */
export function createSettlement(options: CreateSettlementOptions): Settlement {
  const { owner, position, tribeName, name, isCapital = false } = options

  // Use provided name, or get tribe-specific name
  const settlementName = name ?? getNextSettlementName(owner, tribeName)

  return {
    id: generateSettlementId(),
    name: settlementName,
    owner,
    position,
    population: 1,
    level: 1,
    populationProgress: 0,
    populationThreshold: getPopulationThreshold(1),
    buildings: [],
    productionQueue: [],
    currentProduction: 0,
    milestonesChosen: [],
    isCapital,
  }
}

// =============================================================================
// Population & Levels
// =============================================================================

/**
 * Population thresholds for settlement levels
 */
const POPULATION_THRESHOLDS = [
  0, // Level 1: 0-2 pop
  15, // Level 2: 3-5 pop
  30, // Level 3: 6-9 pop
  50, // Level 4: 10-14 pop
  75, // Level 5: 15+ pop
]

/**
 * Gets the food needed for next population
 */
export function getPopulationThreshold(population: number): number {
  // Base formula: 10 + (pop * 3)
  return 10 + population * 3
}

/**
 * Gets the settlement level based on population
 */
export function getSettlementLevel(population: number): number {
  for (let i = POPULATION_THRESHOLDS.length - 1; i >= 0; i--) {
    if (population >= POPULATION_THRESHOLDS[i]!) {
      return i + 1
    }
  }
  return 1
}

/**
 * Checks if a settlement reached a new level (triggers milestone choice)
 */
export function hasReachedNewLevel(settlement: Settlement, newPopulation: number): boolean {
  const oldLevel = getSettlementLevel(settlement.population)
  const newLevel = getSettlementLevel(newPopulation)
  return newLevel > oldLevel
}

// =============================================================================
// Tile Yield Calculation
// =============================================================================

export interface TerrainYields {
  base: Yields
  feature?: Yields
  resource?: Yields
}

const BASE_TERRAIN_YIELDS: Record<string, Yields> = {
  grassland: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 2 },
  plains: { gold: 0, alpha: 0, vibes: 0, production: 1, growth: 1 },
  forest: { gold: 0, alpha: 0, vibes: 0, production: 1, growth: 1 },
  hills: { gold: 0, alpha: 0, vibes: 0, production: 2, growth: 0 },
  mountain: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 0 },
  water: { gold: 1, alpha: 0, vibes: 0, production: 0, growth: 1 },
  desert: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 0 },
  jungle: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 1 },
  marsh: { gold: 0, alpha: 0, vibes: 0, production: -1, growth: 1 },
}

const FEATURE_YIELDS: Record<string, Yields> = {
  river: { gold: 1, alpha: 0, vibes: 0, production: 0, growth: 1 },
  oasis: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 3 },
}

const RESOURCE_YIELDS: Record<string, Yields> = {
  iron: { gold: 0, alpha: 0, vibes: 0, production: 1, growth: 0 },
  horses: { gold: 1, alpha: 0, vibes: 0, production: 1, growth: 0 },
  gems: { gold: 3, alpha: 0, vibes: 0, production: 0, growth: 0 },
  marble: { gold: 0, alpha: 0, vibes: 2, production: 0, growth: 0 },
  whitelists: { gold: 1, alpha: 0, vibes: 0, production: 0, growth: 2 },
  rpcs: { gold: 0, alpha: 3, vibes: 0, production: 0, growth: 0 },
  wheat: { gold: 0, alpha: 0, vibes: 0, production: 0, growth: 1 },
  cattle: { gold: 0, alpha: 0, vibes: 0, production: 1, growth: 1 },
}

/**
 * Calculates yields for a single tile (used for settlement calculations)
 */
export function calculateTileYields(tile: Tile): Yields {
  const base = BASE_TERRAIN_YIELDS[tile.terrain] ?? {
    gold: 0,
    alpha: 0,
    vibes: 0,
    production: 0,
    growth: 0,
  }

  let yields = { ...base }

  // Add feature yields
  if (tile.feature) {
    const featureYields = FEATURE_YIELDS[tile.feature]
    if (featureYields) {
      yields = addYields(yields, featureYields)
    }
  }

  // Add resource yields (only if improved)
  if (tile.resource?.revealed && tile.resource.improved) {
    const resourceYields = RESOURCE_YIELDS[tile.resource.type]
    if (resourceYields) {
      yields = addYields(yields, resourceYields)
    }
  }

  return yields
}

// =============================================================================
// Settlement Yield Calculation
// =============================================================================

/**
 * Gets all tiles in a settlement's working range (radius 2)
 */
export function getSettlementTiles(state: GameState, settlement: Settlement): Tile[] {
  const tiles: Tile[] = []
  const range = hexRange(settlement.position, 2)

  for (const coord of range) {
    const tile = state.map.tiles.get(hexKey(coord))
    if (tile) {
      tiles.push(tile)
    }
  }

  return tiles
}

/**
 * Calculates total yields for a settlement from its worked tiles
 * For simplicity, all tiles in range are worked (no citizen assignment)
 */
export function calculateSettlementYields(state: GameState, settlement: Settlement): Yields {
  const tiles = getSettlementTiles(state, settlement)

  // Base settlement yields (center tile gives +2 production, +2 gold)
  let yields: Yields = {
    gold: 2,
    alpha: 0,
    vibes: 0,
    production: 2,
    growth: 0,
  }

  // Add yields from all tiles in range
  for (const tile of tiles) {
    yields = addYields(yields, calculateTileYields(tile))
  }

  // TODO: Add building yields and adjacency bonuses

  return yields
}

// =============================================================================
// Total Player Yields
// =============================================================================

/**
 * Calculates total yields for a player from all their settlements
 */
export function calculatePlayerYields(state: GameState, tribeId: TribeId): Yields {
  let yields: Yields = {
    gold: 0,
    alpha: 0,
    vibes: 0,
    production: 0,
    growth: 0,
  }

  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      yields = addYields(yields, calculateSettlementYields(state, settlement))
    }
  }

  return yields
}

// =============================================================================
// Yield Helpers
// =============================================================================

/**
 * Adds two yield objects together
 */
export function addYields(a: Yields, b: Yields): Yields {
  return {
    gold: a.gold + b.gold,
    alpha: a.alpha + b.alpha,
    vibes: a.vibes + b.vibes,
    production: a.production + b.production,
    growth: a.growth + b.growth,
  }
}

/**
 * Multiplies yields by a factor
 */
export function multiplyYields(yields: Yields, factor: number): Yields {
  return {
    gold: Math.floor(yields.gold * factor),
    alpha: Math.floor(yields.alpha * factor),
    vibes: Math.floor(yields.vibes * factor),
    production: Math.floor(yields.production * factor),
    growth: Math.floor(yields.growth * factor),
  }
}

// =============================================================================
// Settlement Validation
// =============================================================================

/**
 * Checks if a hex is valid for founding a settlement
 */
export function canFoundSettlement(state: GameState, coord: HexCoord): boolean {
  const key = hexKey(coord)
  const tile = state.map.tiles.get(key)

  // Must be on valid tile
  if (!tile) return false

  // Can't found on water or mountains
  if (tile.terrain === 'water' || tile.terrain === 'mountain') return false

  // Can't found too close to another settlement (minimum 3 tiles apart)
  for (const settlement of state.settlements.values()) {
    // Check if within range 2 of existing settlement
    const neighbors = hexRange(settlement.position, 2)
    for (const neighbor of neighbors) {
      if (hexKey(neighbor) === key) {
        return false
      }
    }
  }

  return true
}

// =============================================================================
// Settlement State Helpers
// =============================================================================

/**
 * Adds a settlement to the game state and claims surrounding tiles
 */
export function addSettlement(state: GameState, settlement: Settlement): GameState {
  const newSettlements = new Map(state.settlements)
  newSettlements.set(settlement.id, settlement)

  // Claim tiles in range 1 for the owner
  const newTiles = new Map(state.map.tiles)
  const range = hexRange(settlement.position, 1)

  for (const coord of range) {
    const key = hexKey(coord)
    const tile = newTiles.get(key)
    if (tile && !tile.owner) {
      newTiles.set(key, {
        ...tile,
        owner: settlement.owner,
      })
    }
  }

  return {
    ...state,
    settlements: newSettlements,
    map: {
      ...state.map,
      tiles: newTiles,
    },
  }
}

/**
 * Updates a settlement in the game state
 */
export function updateSettlement(state: GameState, settlement: Settlement): GameState {
  const newSettlements = new Map(state.settlements)
  newSettlements.set(settlement.id, settlement)

  return {
    ...state,
    settlements: newSettlements,
  }
}

/**
 * Gets settlements belonging to a specific tribe
 */
export function getPlayerSettlements(state: GameState, tribeId: TribeId): Settlement[] {
  const settlements: Settlement[] = []

  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      settlements.push(settlement)
    }
  }

  return settlements
}

// =============================================================================
// Population Growth Processing
// =============================================================================

/**
 * Processes growth for a settlement (called at end of turn)
 * Returns updated settlement and whether a milestone was reached
 */
export function processSettlementGrowth(
  settlement: Settlement,
  growth: number
): { settlement: Settlement; reachedMilestone: boolean } {
  const newProgress = settlement.populationProgress + growth

  if (newProgress >= settlement.populationThreshold) {
    // Population increased
    const newPopulation = settlement.population + 1
    const newLevel = getSettlementLevel(newPopulation)
    const reachedMilestone = newLevel > settlement.level

    return {
      settlement: {
        ...settlement,
        population: newPopulation,
        level: newLevel,
        populationProgress: newProgress - settlement.populationThreshold,
        populationThreshold: getPopulationThreshold(newPopulation),
      },
      reachedMilestone,
    }
  }

  return {
    settlement: {
      ...settlement,
      populationProgress: newProgress,
    },
    reachedMilestone: false,
  }
}

// =============================================================================
// Culture Border Expansion
// =============================================================================

/**
 * Culture thresholds for border expansion
 * Each threshold expands borders by one ring
 */
const CULTURE_THRESHOLDS = [
  0, // Initial (radius 1, from founding)
  10, // Expand to radius 2
  30, // Expand to radius 3
  60, // Expand to radius 4
  100, // Expand to radius 5 (max)
]

/**
 * Gets the current border radius for a settlement based on accumulated culture
 */
export function getBorderRadius(cultureAccumulated: number): number {
  let radius = 1
  for (let i = 1; i < CULTURE_THRESHOLDS.length; i++) {
    if (cultureAccumulated >= CULTURE_THRESHOLDS[i]!) {
      radius = i + 1
    } else {
      break
    }
  }
  return Math.min(radius, 5) // Max radius 5
}

/**
 * Gets culture needed for next border expansion
 */
export function getCultureForNextExpansion(currentRadius: number): number | null {
  if (currentRadius >= 5) return null // Already at max
  return CULTURE_THRESHOLDS[currentRadius] ?? null
}

/**
 * Expands settlement borders based on culture accumulation
 * Returns updated state with newly claimed tiles
 */
export function expandBorders(
  state: GameState,
  settlement: Settlement,
  cultureAccumulated: number
): GameState {
  const newRadius = getBorderRadius(cultureAccumulated)
  const tilesInRange = hexRange(settlement.position, newRadius)

  const newTiles = new Map(state.map.tiles)
  let tilesExpanded = 0

  for (const coord of tilesInRange) {
    const key = hexKey(coord)
    const tile = newTiles.get(key)

    // Claim unclaimed tiles (don't steal from other players)
    if (tile && !tile.owner) {
      // Can't claim water or mountains
      if (tile.terrain !== 'water' && tile.terrain !== 'mountain') {
        newTiles.set(key, {
          ...tile,
          owner: settlement.owner,
        })
        tilesExpanded++
      }
    }
  }

  if (tilesExpanded === 0) {
    return state // No changes
  }

  return {
    ...state,
    map: {
      ...state.map,
      tiles: newTiles,
    },
  }
}

/**
 * Processes culture border expansion for all settlements of a player
 */
export function processCultureExpansion(
  state: GameState,
  tribeId: TribeId,
  cultureGained: number
): GameState {
  let newState = state

  // Find player to get accumulated culture
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (!player) return state

  // Estimate accumulated culture (cultureProgress serves as accumulator)
  // In a full implementation, you'd track this separately
  const totalCulture = player.cultureProgress + cultureGained

  // Expand borders for each settlement
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      newState = expandBorders(newState, settlement, totalCulture)
    }
  }

  return newState
}

/**
 * Gets count of tiles owned by a tribe
 */
export function countOwnedTiles(state: GameState, tribeId: TribeId): number {
  let count = 0
  for (const tile of state.map.tiles.values()) {
    if (tile.owner === tribeId) count++
  }
  return count
}
