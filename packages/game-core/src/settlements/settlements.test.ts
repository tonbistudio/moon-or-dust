import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSettlement,
  resetSettlementNames,
  getGrowthThreshold,
  getLevelProgress,
  calculateTileYields,
  getSettlementTiles,
  calculateSettlementYields,
  calculatePlayerYields,
  addYields,
  multiplyYields,
  canFoundSettlement,
  addSettlement,
  updateSettlement,
  getPlayerSettlements,
  processSettlementGrowth,
} from './index'
import type { GameState, TribeId, Tile, Yields, Settlement } from '../types'
import { createInitialState } from '../state'
import { generateMap } from '../map'
import { hexKey } from '../hex'

describe('Settlement Creation', () => {
  beforeEach(() => {
    resetSettlementNames()
  })

  it('creates a settlement with default values', () => {
    const settlement = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
    })

    expect(settlement.owner).toBe('tribe_1')
    expect(settlement.position).toEqual({ q: 5, r: 5 })
    expect(settlement.level).toBe(1)
    expect(settlement.growthProgress).toBe(0)
    expect(settlement.growthThreshold).toBe(11) // 10 + 1²
    expect(settlement.buildings).toEqual([])
    expect(settlement.productionQueue).toEqual([])
    expect(settlement.currentProduction).toBe(0)
    expect(settlement.milestonesChosen).toEqual([])
    expect(settlement.isCapital).toBe(false)
  })

  it('creates a capital settlement', () => {
    const settlement = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
      isCapital: true,
    })

    expect(settlement.isCapital).toBe(true)
  })

  it('assigns unique names', () => {
    const settlement1 = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
    })
    const settlement2 = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 7, r: 7 },
    })

    expect(settlement1.name).not.toBe(settlement2.name)
  })

  it('uses custom name when provided', () => {
    const settlement = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
      name: 'Custom City',
    })

    expect(settlement.name).toBe('Custom City')
  })
})

describe('Growth & Levels', () => {
  it('calculates growth threshold with quadratic curve', () => {
    // Formula: 10 + level² (gets steeper as level increases)
    expect(getGrowthThreshold(1)).toBe(11) // 10 + 1
    expect(getGrowthThreshold(2)).toBe(14) // 10 + 4
    expect(getGrowthThreshold(5)).toBe(35) // 10 + 25
    expect(getGrowthThreshold(10)).toBe(110) // 10 + 100
  })

  it('calculates level progress', () => {
    const settlement = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
    })

    const progress = getLevelProgress(settlement)
    expect(progress.progress).toBe(0)
    expect(progress.current).toBe(0)
    expect(progress.threshold).toBe(11) // Level 1 threshold: 10 + 1²
  })

  it('calculates level progress with partial growth', () => {
    const settlement: Settlement = {
      ...createSettlement({
        owner: 'tribe_1' as TribeId,
        position: { q: 5, r: 5 },
      }),
      growthProgress: 5, // ~45% of 11
    }

    const progress = getLevelProgress(settlement)
    expect(progress.progress).toBe(45) // Math.floor(5/11 * 100)
    expect(progress.current).toBe(5)
    expect(progress.threshold).toBe(11)
  })
})

describe('Tile Yield Calculation', () => {
  it('calculates grassland yields', () => {
    const tile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'grassland',
    }

    const yields = calculateTileYields(tile)

    expect(yields.growth).toBe(2)
    expect(yields.production).toBe(0)
  })

  it('calculates plains yields', () => {
    const tile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'plains',
    }

    const yields = calculateTileYields(tile)

    expect(yields.growth).toBe(1)
    expect(yields.production).toBe(1)
  })

  it('adds feature yields', () => {
    const riverTile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'grassland',
      feature: 'river',
    }

    const yields = calculateTileYields(riverTile)

    expect(yields.gold).toBe(1) // River adds +1 gold
    expect(yields.growth).toBe(3) // Grassland 2 + River 1
  })

  it('adds resource yields when improved', () => {
    const improvedTile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'hills',
      resource: {
        type: 'iron' as never,
        revealed: true,
        improved: true,
      },
    }

    const yields = calculateTileYields(improvedTile)

    expect(yields.production).toBe(3) // Hills 2 + Iron 1
  })

  it('does not add resource yields when not improved', () => {
    const unimprovedTile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'hills',
      resource: {
        type: 'iron' as never,
        revealed: true,
        improved: false,
      },
    }

    const yields = calculateTileYields(unimprovedTile)

    expect(yields.production).toBe(2) // Just hills
  })
})

describe('Settlement Yield Calculation', () => {
  let state: GameState

  beforeEach(() => {
    resetSettlementNames()
    state = createInitialState({
      seed: 12345,
      humanTribe: 'monkes',
      aiTribes: ['geckos'],
    })
    const mapResult = generateMap({
      width: state.map.width,
      height: state.map.height,
      seed: state.seed,
      playerCount: state.players.length,
    })
    state = {
      ...state,
      map: mapResult.map,
      lootboxes: mapResult.lootboxes,
    }
  })

  it('gets settlement tiles in range (owned tiles only)', () => {
    const settlement = createSettlement({
      owner: state.players[0]!.tribeId,
      position: { q: 7, r: 7 },
    })
    // Add settlement to claim surrounding tiles
    state = addSettlement(state, settlement)

    const tiles = getSettlementTiles(state, settlement)

    // Level 1 settlement has radius 1 = 7 tiles (center + 6 adjacent)
    // Only owned tiles are returned
    expect(tiles.length).toBe(7)
  })

  it('calculates settlement yields with base production and gold', () => {
    const settlement = createSettlement({
      owner: state.players[0]!.tribeId,
      position: { q: 7, r: 7 },
    })
    state = addSettlement(state, settlement)

    const yields = calculateSettlementYields(state, settlement)

    // Base: +2 production, +2 gold
    expect(yields.production).toBeGreaterThanOrEqual(2)
    expect(yields.gold).toBeGreaterThanOrEqual(2)
  })

  it('calculates player yields from all settlements', () => {
    const tribeId = state.players[0]!.tribeId

    const settlement1 = createSettlement({
      owner: tribeId,
      position: { q: 3, r: 3 },
    })
    const settlement2 = createSettlement({
      owner: tribeId,
      position: { q: 10, r: 10 },
    })

    state = addSettlement(state, settlement1)
    state = addSettlement(state, settlement2)

    const yields = calculatePlayerYields(state, tribeId)

    // Should have yields from both settlements
    expect(yields.production).toBeGreaterThanOrEqual(4) // At least base from both
    expect(yields.gold).toBeGreaterThanOrEqual(4)
  })
})

describe('Yield Helpers', () => {
  it('adds yields correctly', () => {
    const a: Yields = { gold: 1, alpha: 2, vibes: 3, production: 4, growth: 5 }
    const b: Yields = { gold: 5, alpha: 4, vibes: 3, production: 2, growth: 1 }

    const result = addYields(a, b)

    expect(result.gold).toBe(6)
    expect(result.alpha).toBe(6)
    expect(result.vibes).toBe(6)
    expect(result.production).toBe(6)
    expect(result.growth).toBe(6)
  })

  it('multiplies yields correctly', () => {
    const yields: Yields = { gold: 10, alpha: 20, vibes: 30, production: 40, growth: 50 }

    const result = multiplyYields(yields, 0.5)

    expect(result.gold).toBe(5)
    expect(result.alpha).toBe(10)
    expect(result.vibes).toBe(15)
    expect(result.production).toBe(20)
    expect(result.growth).toBe(25)
  })

  it('floors multiplied yields', () => {
    const yields: Yields = { gold: 3, alpha: 3, vibes: 3, production: 3, growth: 3 }

    const result = multiplyYields(yields, 0.5)

    expect(result.gold).toBe(1) // floor(1.5) = 1
  })
})

describe('Settlement Validation', () => {
  let state: GameState

  beforeEach(() => {
    resetSettlementNames()
    state = createInitialState({
      seed: 12345,
      humanTribe: 'monkes',
      aiTribes: ['geckos'],
    })
    const mapResult = generateMap({
      width: state.map.width,
      height: state.map.height,
      seed: state.seed,
      playerCount: state.players.length,
    })
    state = {
      ...state,
      map: mapResult.map,
      lootboxes: mapResult.lootboxes,
    }
  })

  it('allows founding on valid terrain', () => {
    // Find a grassland or plains tile
    let validCoord = { q: 7, r: 7 }
    for (const [key, tile] of state.map.tiles) {
      if (tile.terrain === 'grassland' || tile.terrain === 'plains') {
        validCoord = tile.coord
        break
      }
    }

    expect(canFoundSettlement(state, validCoord)).toBe(true)
  })

  it('prevents founding on water', () => {
    // Find a water tile
    for (const [key, tile] of state.map.tiles) {
      if (tile.terrain === 'water') {
        expect(canFoundSettlement(state, tile.coord)).toBe(false)
        return
      }
    }
  })

  it('prevents founding on mountain', () => {
    // Find a mountain tile
    for (const [key, tile] of state.map.tiles) {
      if (tile.terrain === 'mountain') {
        expect(canFoundSettlement(state, tile.coord)).toBe(false)
        return
      }
    }
  })

  it('prevents founding too close to existing settlement', () => {
    const settlement = createSettlement({
      owner: state.players[0]!.tribeId,
      position: { q: 7, r: 7 },
    })
    state = addSettlement(state, settlement)

    // Adjacent tiles should be invalid
    expect(canFoundSettlement(state, { q: 8, r: 7 })).toBe(false)
    expect(canFoundSettlement(state, { q: 7, r: 8 })).toBe(false)
  })
})

describe('Settlement State Management', () => {
  let state: GameState

  beforeEach(() => {
    resetSettlementNames()
    state = createInitialState({
      seed: 12345,
      humanTribe: 'monkes',
      aiTribes: ['geckos'],
    })
    const mapResult = generateMap({
      width: state.map.width,
      height: state.map.height,
      seed: state.seed,
      playerCount: state.players.length,
    })
    state = {
      ...state,
      map: mapResult.map,
      lootboxes: mapResult.lootboxes,
    }
  })

  it('adds settlement and claims tiles', () => {
    // Find a valid tile that isn't already owned
    let validCoord = { q: 7, r: 7 }
    for (const [key, tile] of state.map.tiles) {
      if (!tile.owner && tile.terrain !== 'water' && tile.terrain !== 'mountain') {
        validCoord = tile.coord
        break
      }
    }

    const settlement = createSettlement({
      owner: state.players[0]!.tribeId,
      position: validCoord,
    })

    const newState = addSettlement(state, settlement)

    expect(newState.settlements.has(settlement.id)).toBe(true)

    // Check that center tile is claimed
    const centerTile = newState.map.tiles.get(hexKey(validCoord))
    expect(centerTile?.owner).toBe(settlement.owner)
  })

  it('updates settlement', () => {
    const settlement = createSettlement({
      owner: state.players[0]!.tribeId,
      position: { q: 7, r: 7 },
    })
    state = addSettlement(state, settlement)

    const updatedSettlement: Settlement = {
      ...settlement,
      level: 3,
    }
    const newState = updateSettlement(state, updatedSettlement)

    expect(newState.settlements.get(settlement.id)?.level).toBe(3)
  })

  it('gets player settlements', () => {
    const tribeId = state.players[0]!.tribeId
    const enemyTribeId = state.players[1]!.tribeId

    const ownSettlement = createSettlement({
      owner: tribeId,
      position: { q: 3, r: 3 },
    })
    const enemySettlement = createSettlement({
      owner: enemyTribeId,
      position: { q: 10, r: 10 },
    })

    state = addSettlement(state, ownSettlement)
    state = addSettlement(state, enemySettlement)

    const playerSettlements = getPlayerSettlements(state, tribeId)

    expect(playerSettlements.length).toBe(1)
    expect(playerSettlements[0]!.id).toBe(ownSettlement.id)
  })
})

describe('Settlement Growth', () => {
  beforeEach(() => {
    resetSettlementNames()
  })

  it('adds growth to progress', () => {
    const settlement = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
    })

    const { settlement: updated, reachedMilestone } = processSettlementGrowth(settlement, 5)

    expect(updated.growthProgress).toBe(5)
    expect(updated.level).toBe(1)
    expect(reachedMilestone).toBe(false)
  })

  it('increases level when threshold reached', () => {
    const settlement = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
    })

    // Threshold for level 1 is 11 (10 + 1²)
    const { settlement: updated, reachedMilestone } = processSettlementGrowth(settlement, 15)

    expect(updated.level).toBe(2)
    expect(updated.growthProgress).toBe(4) // 15 - 11 = 4
    expect(updated.growthThreshold).toBe(14) // 10 + 2²
    expect(reachedMilestone).toBe(true) // Reached new level
  })

  it('increases max health on level up', () => {
    const settlement = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
    })

    // Level up from 1 to 2 (needs 11 growth)
    const { settlement: updated, reachedMilestone } = processSettlementGrowth(settlement, 11)

    expect(updated.level).toBe(2)
    expect(reachedMilestone).toBe(true)
    expect(updated.maxHealth).toBe(35) // 30 + 5 for level 2
  })
})
