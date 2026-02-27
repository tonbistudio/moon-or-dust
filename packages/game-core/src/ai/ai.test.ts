import { describe, it, expect } from 'vitest'
import { generateAIActions } from './index'
import { createUnit } from '../units'
import { hexKey } from '../hex'
import type { GameState, Tile, HexCoord, TribeId } from '../types'

// Helper to create a minimal game state
function createTestState(
  tiles: Tile[],
  currentPlayer: string = 'tribe_1'
): GameState {
  const tileMap = new Map<string, Tile>()
  for (const tile of tiles) {
    tileMap.set(hexKey(tile.coord), tile)
  }

  return {
    version: '1.0.0',
    seed: 12345,
    turn: 1,
    currentPlayer: currentPlayer as never,
    players: [
      {
        tribeId: 'tribe_1' as never,
        tribeName: 'monkes',
        isHuman: false,
        treasury: 100,
        researchedTechs: ['farming', 'mining', 'animal_husbandry'] as never[],
        currentResearch: null,
        researchProgress: 0,
        unlockedCultures: [],
        currentCulture: null,
        cultureProgress: 0,
        policySlots: { military: 1, economy: 1, progress: 0, wildcard: 0 },
        activePolicies: [],
        policyPool: [],
        killCount: 0,
        activeBuffs: [],
        greatPeople: {
          accumulator: {
            alpha: 0,
            gold: 0,
            vibes: 0,
            tradeRoutes: 0,
            wondersBuilt: 0,
          },
          earned: [],
          available: [],
        },
        goldenAge: {
          active: false,
          turnsRemaining: 0,
          triggersUsed: [],
          currentEffects: [],
        },
        completedTechs: [],
        recentTechCompletions: [],
      },
    ],
    map: {
      width: 10,
      height: 10,
      tiles: tileMap,
    },
    units: new Map(),
    settlements: new Map(),
    fog: new Map([['tribe_1' as never, new Set<string>()]]),
    diplomacy: {
      relations: new Map(),
      warWeariness: new Map(),
      reputationModifiers: new Map(),
      peaceRejectionTurns: new Map(),
    },
    tradeRoutes: [],
    lootboxes: [],
    wonders: [],
    pendingPeaceProposals: [],
  }
}

function createTile(
  coord: HexCoord,
  terrain: 'grassland' | 'plains' | 'hills' = 'grassland',
  owner?: string,
  improvement?: string,
  resource?: { type: string; revealed: boolean; improved: boolean }
): Tile {
  const tile: Tile = {
    coord,
    terrain,
    feature: 'none',
    owner: owner as never,
    improvement: improvement as never,
  }
  if (resource) {
    return { ...tile, resource: resource as never }
  }
  return tile
}

describe('Builder AI', () => {
  it('generates BUILD_IMPROVEMENT action when builder is on owned unimproved tile with resource', () => {
    const builderPos: HexCoord = { q: 0, r: 0 }

    const state = createTestState([
      createTile(builderPos, 'grassland', 'tribe_1', undefined, {
        type: 'pig',
        category: 'bonus',
        revealed: true,
        improved: false,
      }), // Owned, unimproved, has pig resource
    ])

    const builder = createUnit({
      type: 'builder',
      owner: 'tribe_1' as TribeId,
      position: builderPos,
      rarity: 'common',
    })

    const stateWithBuilder = {
      ...state,
      units: new Map([[builder.id, builder]]),
    }

    const actions = generateAIActions(stateWithBuilder, 'tribe_1' as TribeId)

    // Should include a BUILD_IMPROVEMENT action
    const buildAction = actions.find(a => a.type === 'BUILD_IMPROVEMENT')
    expect(buildAction).toBeDefined()
    expect(buildAction!.type).toBe('BUILD_IMPROVEMENT')
  })

  it('generates MOVE_UNIT action when builder needs to travel to improvement site', () => {
    const builderPos: HexCoord = { q: 0, r: 0 }
    const targetPos: HexCoord = { q: 2, r: 0 }

    const state = createTestState([
      createTile(builderPos, 'grassland'), // No owner, can't build here
      createTile({ q: 1, r: 0 }, 'grassland'), // Path
      createTile(targetPos, 'grassland', 'tribe_1', undefined, {
        type: 'pig',
        category: 'bonus',
        revealed: true,
        improved: false,
      }), // Owned, has pig resource, needs improvement
    ])

    const builder = createUnit({
      type: 'builder',
      owner: 'tribe_1' as TribeId,
      position: builderPos,
      rarity: 'common',
    })

    const stateWithBuilder = {
      ...state,
      units: new Map([[builder.id, builder]]),
    }

    const actions = generateAIActions(stateWithBuilder, 'tribe_1' as TribeId)

    // Should include a MOVE_UNIT action for the builder
    const moveAction = actions.find(
      a => a.type === 'MOVE_UNIT' && (a as { unitId: string }).unitId === builder.id
    )
    expect(moveAction).toBeDefined()
  })

  it('prioritizes resource tiles for improvement', () => {
    const builderPos: HexCoord = { q: 0, r: 0 }
    const resourcePos: HexCoord = { q: 1, r: 0 }
    const normalPos: HexCoord = { q: 0, r: 1 }

    const state = createTestState([
      createTile(builderPos, 'grassland', 'tribe_1'),
      createTile(resourcePos, 'hills', 'tribe_1', undefined, {
        type: 'iron',
        revealed: true,
        improved: false,
      }),
      createTile(normalPos, 'grassland', 'tribe_1'),
    ])

    const builder = createUnit({
      type: 'builder',
      owner: 'tribe_1' as TribeId,
      position: builderPos,
      rarity: 'common',
    })

    const stateWithBuilder = {
      ...state,
      units: new Map([[builder.id, builder]]),
    }

    const actions = generateAIActions(stateWithBuilder, 'tribe_1' as TribeId)

    // Find any build or move action for the builder
    const builderAction = actions.find(
      a =>
        (a.type === 'BUILD_IMPROVEMENT' && (a as { builderId: string }).builderId === builder.id) ||
        (a.type === 'MOVE_UNIT' && (a as { unitId: string }).unitId === builder.id)
    )

    expect(builderAction).toBeDefined()
  })

  it('does not build on tiles that already have improvements', () => {
    const builderPos: HexCoord = { q: 0, r: 0 }

    const state = createTestState([
      createTile(builderPos, 'grassland', 'tribe_1', 'farm'), // Already improved
    ])

    const builder = createUnit({
      type: 'builder',
      owner: 'tribe_1' as TribeId,
      position: builderPos,
      rarity: 'common',
    })

    const stateWithBuilder = {
      ...state,
      units: new Map([[builder.id, builder]]),
    }

    const actions = generateAIActions(stateWithBuilder, 'tribe_1' as TribeId)

    // Should NOT include a BUILD_IMPROVEMENT action at this location
    const buildAction = actions.find(a => a.type === 'BUILD_IMPROVEMENT')
    expect(buildAction).toBeUndefined()
  })

  it('does not build on unowned tiles', () => {
    const builderPos: HexCoord = { q: 0, r: 0 }

    const state = createTestState([
      createTile(builderPos, 'grassland'), // No owner
    ])

    const builder = createUnit({
      type: 'builder',
      owner: 'tribe_1' as TribeId,
      position: builderPos,
      rarity: 'common',
    })

    const stateWithBuilder = {
      ...state,
      units: new Map([[builder.id, builder]]),
    }

    const actions = generateAIActions(stateWithBuilder, 'tribe_1' as TribeId)

    // Should NOT include a BUILD_IMPROVEMENT action
    const buildAction = actions.find(a => a.type === 'BUILD_IMPROVEMENT')
    expect(buildAction).toBeUndefined()
  })

  it('builder does nothing if no tiles need improvement', () => {
    const builderPos: HexCoord = { q: 0, r: 0 }

    const state = createTestState([
      // Only tile that exists is already improved
      createTile(builderPos, 'grassland', 'tribe_1', 'farm'),
    ])

    const builder = createUnit({
      type: 'builder',
      owner: 'tribe_1' as TribeId,
      position: builderPos,
      rarity: 'common',
    })

    const stateWithBuilder = {
      ...state,
      units: new Map([[builder.id, builder]]),
    }

    const actions = generateAIActions(stateWithBuilder, 'tribe_1' as TribeId)

    // Should not have any builder actions except END_TURN
    const builderActions = actions.filter(
      a =>
        (a.type === 'BUILD_IMPROVEMENT') ||
        (a.type === 'MOVE_UNIT' && (a as { unitId: string }).unitId === builder.id)
    )
    expect(builderActions.length).toBe(0)
  })

  it('chooses appropriate improvement for terrain (sty on grassland with pig)', () => {
    const builderPos: HexCoord = { q: 0, r: 0 }

    const state = createTestState([
      createTile(builderPos, 'grassland', 'tribe_1', undefined, {
        type: 'pig',
        category: 'bonus',
        revealed: true,
        improved: false,
      }),
    ])

    const builder = createUnit({
      type: 'builder',
      owner: 'tribe_1' as TribeId,
      position: builderPos,
      rarity: 'common',
    })

    const stateWithBuilder = {
      ...state,
      units: new Map([[builder.id, builder]]),
    }

    const actions = generateAIActions(stateWithBuilder, 'tribe_1' as TribeId)

    const buildAction = actions.find(a => a.type === 'BUILD_IMPROVEMENT') as
      | { type: 'BUILD_IMPROVEMENT'; improvement: string }
      | undefined

    expect(buildAction).toBeDefined()
    expect(buildAction!.improvement).toBe('sty')
  })

  it('chooses mine improvement for hills terrain with iron', () => {
    const builderPos: HexCoord = { q: 0, r: 0 }

    const state = createTestState([
      createTile(builderPos, 'hills', 'tribe_1', undefined, {
        type: 'iron',
        category: 'strategic',
        revealed: true,
        improved: false,
      }),
    ])

    const builder = createUnit({
      type: 'builder',
      owner: 'tribe_1' as TribeId,
      position: builderPos,
      rarity: 'common',
    })

    const stateWithBuilder = {
      ...state,
      units: new Map([[builder.id, builder]]),
    }

    const actions = generateAIActions(stateWithBuilder, 'tribe_1' as TribeId)

    const buildAction = actions.find(a => a.type === 'BUILD_IMPROVEMENT') as
      | { type: 'BUILD_IMPROVEMENT'; improvement: string }
      | undefined

    expect(buildAction).toBeDefined()
    expect(buildAction!.improvement).toBe('mine')
  })
})

// Helper to create a settlement for testing
function createTestSettlement(
  id: string,
  owner: string,
  position: HexCoord,
  options: {
    buildings?: string[]
    productionQueue?: Array<{ type: 'unit' | 'building' | 'wonder'; id: string; progress: number; cost: number }>
    isCapital?: boolean
  } = {}
) {
  return {
    id: id as never,
    name: 'Test City',
    owner: owner as never,
    position,
    level: 1,
    growthProgress: 0,
    growthThreshold: 10,
    buildings: (options.buildings ?? []) as never[],
    productionQueue: options.productionQueue ?? [],
    currentProduction: 0,
    milestonesChosen: [],
    isCapital: options.isCapital ?? true,
    health: 200,
    maxHealth: 200,
  }
}

describe('AI Building Production', () => {
  it('queues building production for idle settlement', () => {
    const settlementPos: HexCoord = { q: 0, r: 0 }

    const state = createTestState([
      createTile(settlementPos, 'grassland', 'tribe_1'),
    ])

    // Add a settlement with an empty production queue and farming tech for granary
    const settlement = createTestSettlement('settlement_1', 'tribe_1', settlementPos)
    const stateWithSettlement = {
      ...state,
      settlements: new Map([['settlement_1', settlement]]) as never,
    }

    const actions = generateAIActions(stateWithSettlement, 'tribe_1' as TribeId)

    // Should include a START_PRODUCTION action for a building or unit
    const prodAction = actions.find(a => a.type === 'START_PRODUCTION') as
      | { type: 'START_PRODUCTION'; settlementId: string; item: { type: string; id: string } }
      | undefined

    expect(prodAction).toBeDefined()
    expect(prodAction!.settlementId).toBe('settlement_1')
  })

  it('does not queue production for settlement already producing', () => {
    const settlementPos: HexCoord = { q: 0, r: 0 }

    const state = createTestState([
      createTile(settlementPos, 'grassland', 'tribe_1'),
    ])

    // Settlement already has something in queue
    const settlement = createTestSettlement('settlement_1', 'tribe_1', settlementPos, {
      productionQueue: [{ type: 'building', id: 'granary', progress: 10, cost: 40 }],
    })
    const stateWithSettlement = {
      ...state,
      settlements: new Map([['settlement_1', settlement]]) as never,
    }

    const actions = generateAIActions(stateWithSettlement, 'tribe_1' as TribeId)

    // Should NOT include a START_PRODUCTION action (already producing)
    const prodAction = actions.find(a => a.type === 'START_PRODUCTION')
    expect(prodAction).toBeUndefined()
  })
})

describe('AI Unit Production', () => {
  it('queues military unit when settlement has no available buildings', () => {
    const settlementPos: HexCoord = { q: 0, r: 0 }

    // No techs that unlock buildings → falls through to unit production
    const state = createTestState([
      createTile(settlementPos, 'grassland', 'tribe_1'),
    ])

    // Override player to have no techs (so no buildings available, forcing unit production)
    const stateNoTechs = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          researchedTechs: [] as never[],
        },
      ],
    }

    const settlement = createTestSettlement('settlement_1', 'tribe_1', settlementPos)
    const stateWithSettlement = {
      ...stateNoTechs,
      settlements: new Map([['settlement_1', settlement]]) as never,
    }

    const actions = generateAIActions(stateWithSettlement, 'tribe_1' as TribeId)

    const prodAction = actions.find(a => a.type === 'START_PRODUCTION') as
      | { type: 'START_PRODUCTION'; item: { type: string; id: string } }
      | undefined

    expect(prodAction).toBeDefined()
    expect(prodAction!.item.type).toBe('unit')
  })

  it('prioritizes settler when AI has fewer than 3 settlements and no settlers', () => {
    const settlementPos: HexCoord = { q: 0, r: 0 }
    const tiles = [
      createTile(settlementPos, 'grassland', 'tribe_1'),
      createTile({ q: 1, r: 0 }, 'grassland'),
      createTile({ q: 2, r: 0 }, 'grassland'),
    ]

    // No techs → no buildings available, so AI goes straight to unit production
    const state = createTestState(tiles)
    const stateNoTechs = {
      ...state,
      players: [
        {
          ...state.players[0]!,
          researchedTechs: [] as never[],
        },
      ],
    }

    const settlement = createTestSettlement('settlement_1', 'tribe_1', settlementPos)
    const stateWithSettlement = {
      ...stateNoTechs,
      settlements: new Map([['settlement_1', settlement]]) as never,
    }

    const actions = generateAIActions(stateWithSettlement, 'tribe_1' as TribeId)

    const prodAction = actions.find(
      a => a.type === 'START_PRODUCTION' &&
        (a as { item: { id: string } }).item.id === 'settler'
    )

    expect(prodAction).toBeDefined()
  })
})
