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
        greatPeople: {
          accumulator: {
            combat: 0,
            alpha: 0,
            gold: 0,
            vibes: 0,
            kills: 0,
            captures: 0,
            tradeRoutes: 0,
            wondersBuilt: 0,
            buildingsBuilt: 0,
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
    },
    tradeRoutes: [],
    lootboxes: [],
    wonders: [],
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
