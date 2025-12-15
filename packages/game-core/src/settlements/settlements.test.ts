import { describe, it, expect, beforeEach } from 'vitest'
import {
  createSettlement,
  resetSettlementNames,
  getPopulationThreshold,
  getSettlementLevel,
  hasReachedNewLevel,
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
    expect(settlement.population).toBe(1)
    expect(settlement.level).toBe(1)
    expect(settlement.populationProgress).toBe(0)
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

describe('Population & Levels', () => {
  it('calculates population threshold', () => {
    expect(getPopulationThreshold(1)).toBe(13) // 10 + 1*3
    expect(getPopulationThreshold(5)).toBe(25) // 10 + 5*3
    expect(getPopulationThreshold(10)).toBe(40) // 10 + 10*3
  })

  it('determines settlement level from population', () => {
    // Thresholds: 0, 15, 30, 50, 75
    expect(getSettlementLevel(1)).toBe(1)
    expect(getSettlementLevel(14)).toBe(1)
    expect(getSettlementLevel(15)).toBe(2)
    expect(getSettlementLevel(30)).toBe(3)
    expect(getSettlementLevel(50)).toBe(4)
    expect(getSettlementLevel(75)).toBe(5)
  })

  it('detects when new level is reached', () => {
    // Settlement with pop 14 (level 1), will reach level 2 at pop 15
    const settlement: Settlement = {
      ...createSettlement({
        owner: 'tribe_1' as TribeId,
        position: { q: 5, r: 5 },
      }),
      population: 14,
    }

    expect(hasReachedNewLevel(settlement, 14)).toBe(false)
    expect(hasReachedNewLevel(settlement, 15)).toBe(true) // Level 1 -> Level 2
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
      barbarianCamps: mapResult.barbarianCamps,
    }
  })

  it('gets settlement tiles in range', () => {
    const settlement = createSettlement({
      owner: state.players[0]!.tribeId,
      position: { q: 7, r: 7 },
    })

    const tiles = getSettlementTiles(state, settlement)

    // Range 2 from center = 19 tiles (center + 6 at distance 1 + 12 at distance 2)
    expect(tiles.length).toBe(19)
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
      barbarianCamps: mapResult.barbarianCamps,
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
      barbarianCamps: mapResult.barbarianCamps,
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
      population: 5,
    }
    const newState = updateSettlement(state, updatedSettlement)

    expect(newState.settlements.get(settlement.id)?.population).toBe(5)
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

describe('Population Growth', () => {
  beforeEach(() => {
    resetSettlementNames()
  })

  it('adds growth to progress', () => {
    const settlement = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
    })

    const { settlement: updated, reachedMilestone } = processSettlementGrowth(settlement, 5)

    expect(updated.populationProgress).toBe(5)
    expect(updated.population).toBe(1)
    expect(reachedMilestone).toBe(false)
  })

  it('increases population when threshold reached', () => {
    const settlement = createSettlement({
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
    })

    // Threshold for pop 1 is 13 (10 + 1*3)
    const { settlement: updated, reachedMilestone } = processSettlementGrowth(settlement, 15)

    expect(updated.population).toBe(2)
    expect(updated.populationProgress).toBe(2) // 15 - 13 = 2
    expect(updated.populationThreshold).toBe(16) // 10 + 2*3
    expect(reachedMilestone).toBe(false) // Didn't reach new level
  })

  it('triggers milestone when reaching new level', () => {
    // Create settlement with population 14 (about to reach level 2 at pop 15)
    const settlement: Settlement = {
      ...createSettlement({
        owner: 'tribe_1' as TribeId,
        position: { q: 5, r: 5 },
      }),
      population: 14,
      level: 1,
      populationThreshold: getPopulationThreshold(14),
    }

    // Need enough growth to reach next population (threshold for pop 14 is 52)
    const { settlement: updated, reachedMilestone } = processSettlementGrowth(settlement, 60)

    expect(updated.population).toBe(15)
    expect(updated.level).toBe(2)
    expect(reachedMilestone).toBe(true)
  })
})
