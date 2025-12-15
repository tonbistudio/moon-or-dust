import { describe, it, expect } from 'vitest'
import {
  generateMap,
  getTileYields,
  getMovementCost,
  isPassable,
  TERRAIN,
  RESOURCES,
  FEATURE_YIELDS,
} from './index'
import { hexKey, hexDistance } from '../hex'
import type { Tile, TerrainType } from '../types'

describe('terrain definitions', () => {
  it('defines all terrain types', () => {
    const terrainTypes: TerrainType[] = [
      'grassland',
      'plains',
      'forest',
      'hills',
      'mountain',
      'water',
      'desert',
      'jungle',
      'marsh',
    ]

    for (const type of terrainTypes) {
      expect(TERRAIN[type]).toBeDefined()
      expect(TERRAIN[type].type).toBe(type)
    }
  })

  it('mountain and water are impassable', () => {
    expect(TERRAIN.mountain.passable).toBe(false)
    expect(TERRAIN.water.passable).toBe(false)
  })

  it('other terrain is passable', () => {
    expect(TERRAIN.grassland.passable).toBe(true)
    expect(TERRAIN.plains.passable).toBe(true)
    expect(TERRAIN.forest.passable).toBe(true)
    expect(TERRAIN.hills.passable).toBe(true)
    expect(TERRAIN.desert.passable).toBe(true)
    expect(TERRAIN.jungle.passable).toBe(true)
    expect(TERRAIN.marsh.passable).toBe(true)
  })

  it('forest and hills have defense bonus', () => {
    expect(TERRAIN.forest.defenseBonus).toBeGreaterThan(0)
    expect(TERRAIN.hills.defenseBonus).toBeGreaterThan(0)
  })

  it('difficult terrain has higher movement cost', () => {
    expect(TERRAIN.forest.movementCost).toBeGreaterThan(TERRAIN.grassland.movementCost)
    expect(TERRAIN.hills.movementCost).toBeGreaterThan(TERRAIN.plains.movementCost)
  })
})

describe('resource definitions', () => {
  it('defines strategic resources', () => {
    expect(RESOURCES.iron.category).toBe('strategic')
    expect(RESOURCES.horses.category).toBe('strategic')
  })

  it('defines luxury resources', () => {
    expect(RESOURCES.gems.category).toBe('luxury')
    expect(RESOURCES.marble.category).toBe('luxury')
    expect(RESOURCES.whitelists.category).toBe('luxury')
    expect(RESOURCES.rpcs.category).toBe('luxury')
  })

  it('defines bonus resources', () => {
    expect(RESOURCES.wheat.category).toBe('bonus')
    expect(RESOURCES.cattle.category).toBe('bonus')
  })

  it('resources have valid terrain restrictions', () => {
    for (const resource of Object.values(RESOURCES)) {
      expect(resource.validTerrain.length).toBeGreaterThan(0)
      for (const terrain of resource.validTerrain) {
        expect(TERRAIN[terrain]).toBeDefined()
      }
    }
  })
})

describe('feature yields', () => {
  it('river provides gold and growth', () => {
    expect(FEATURE_YIELDS.river.gold).toBeGreaterThan(0)
    expect(FEATURE_YIELDS.river.growth).toBeGreaterThan(0)
  })

  it('oasis provides growth', () => {
    expect(FEATURE_YIELDS.oasis.growth).toBeGreaterThan(0)
  })
})

describe('getTileYields', () => {
  it('returns base terrain yields for basic tile', () => {
    const tile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'grassland',
      feature: 'none',
      resource: undefined,
      owner: undefined,
      improvement: undefined,
    }

    const yields = getTileYields(tile)
    expect(yields.growth).toBe(2) // grassland base
    expect(yields.production).toBe(0)
  })

  it('adds feature yields', () => {
    const tile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'plains',
      feature: 'river',
      resource: undefined,
      owner: undefined,
      improvement: undefined,
    }

    const yields = getTileYields(tile)
    expect(yields.gold).toBe(1) // river bonus
    expect(yields.growth).toBe(2) // plains (1) + river (1)
  })

  it('adds resource yields when improved', () => {
    const tile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'hills',
      feature: 'none',
      resource: {
        type: 'gems',
        category: 'luxury',
        revealed: true,
        improved: true,
      },
      owner: undefined,
      improvement: 'mine',
    }

    const yields = getTileYields(tile)
    expect(yields.gold).toBe(3) // gems bonus
    expect(yields.production).toBe(2) // hills base
  })

  it('does not add resource yields when not improved', () => {
    const tile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'hills',
      feature: 'none',
      resource: {
        type: 'gems',
        category: 'luxury',
        revealed: true,
        improved: false,
      },
      owner: undefined,
      improvement: undefined,
    }

    const yields = getTileYields(tile)
    expect(yields.gold).toBe(0) // no bonus since not improved
  })
})

describe('getMovementCost', () => {
  it('returns terrain movement cost', () => {
    const grasslandTile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'grassland',
      feature: 'none',
      resource: undefined,
      owner: undefined,
      improvement: undefined,
    }

    const forestTile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'forest',
      feature: 'none',
      resource: undefined,
      owner: undefined,
      improvement: undefined,
    }

    expect(getMovementCost(grasslandTile)).toBe(1)
    expect(getMovementCost(forestTile)).toBe(2)
  })
})

describe('isPassable', () => {
  it('returns false for impassable terrain', () => {
    const mountainTile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'mountain',
      feature: 'none',
      resource: undefined,
      owner: undefined,
      improvement: undefined,
    }

    expect(isPassable(mountainTile)).toBe(false)
  })

  it('returns true for passable terrain', () => {
    const plainsTile: Tile = {
      coord: { q: 0, r: 0 },
      terrain: 'plains',
      feature: 'none',
      resource: undefined,
      owner: undefined,
      improvement: undefined,
    }

    expect(isPassable(plainsTile)).toBe(true)
  })
})

describe('generateMap', () => {
  it('generates map with correct dimensions', () => {
    const { map } = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 2,
    })

    expect(map.width).toBe(15)
    expect(map.height).toBe(15)
  })

  it('generates tiles for entire map', () => {
    const { map } = generateMap({
      width: 10,
      height: 10,
      seed: 12345,
      playerCount: 2,
    })

    expect(map.tiles.size).toBe(100)
  })

  it('is deterministic with same seed', () => {
    const result1 = generateMap({
      width: 15,
      height: 15,
      seed: 42,
      playerCount: 2,
    })

    const result2 = generateMap({
      width: 15,
      height: 15,
      seed: 42,
      playerCount: 2,
    })

    expect(result1.startPositions).toEqual(result2.startPositions)
    expect(result1.lootboxes.length).toBe(result2.lootboxes.length)
  })

  it('generates different maps with different seeds', () => {
    const result1 = generateMap({
      width: 15,
      height: 15,
      seed: 1,
      playerCount: 2,
    })

    const result2 = generateMap({
      width: 15,
      height: 15,
      seed: 2,
      playerCount: 2,
    })

    // Start positions should be different (very likely)
    const sameStarts = result1.startPositions.every((p1, i) => {
      const p2 = result2.startPositions[i]
      return p2 && p1.q === p2.q && p1.r === p2.r
    })
    expect(sameStarts).toBe(false)
  })

  it('places correct number of starting positions', () => {
    const result2 = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 2,
    })
    expect(result2.startPositions).toHaveLength(2)

    const result4 = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 4,
    })
    expect(result4.startPositions).toHaveLength(4)
  })

  it('starting positions are on passable terrain', () => {
    const { map, startPositions } = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 3,
    })

    for (const pos of startPositions) {
      const tile = map.tiles.get(hexKey(pos))
      expect(tile).toBeDefined()
      expect(isPassable(tile!)).toBe(true)
    }
  })

  it('starting positions are spread apart', () => {
    const { startPositions } = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 2,
    })

    const distance = hexDistance(startPositions[0]!, startPositions[1]!)
    expect(distance).toBeGreaterThan(3)
  })

  it('places lootboxes', () => {
    const { lootboxes } = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 2,
    })

    expect(lootboxes.length).toBeGreaterThanOrEqual(4)
    expect(lootboxes.length).toBeLessThanOrEqual(6)
  })

  it('lootboxes are away from starting positions', () => {
    const { startPositions, lootboxes } = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 2,
    })

    for (const lootbox of lootboxes) {
      for (const start of startPositions) {
        expect(hexDistance(lootbox.position, start)).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('places barbarian camps', () => {
    const { barbarianCamps } = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 2,
    })

    expect(barbarianCamps.length).toBeGreaterThanOrEqual(3)
    expect(barbarianCamps.length).toBeLessThanOrEqual(5)
  })

  it('barbarian camps are away from starting positions', () => {
    const { startPositions, barbarianCamps } = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 2,
    })

    for (const camp of barbarianCamps) {
      for (const start of startPositions) {
        expect(hexDistance(camp.position, start)).toBeGreaterThanOrEqual(5)
      }
    }
  })

  it('places resources on map', () => {
    const { map } = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 2,
    })

    let resourceCount = 0
    for (const tile of map.tiles.values()) {
      if (tile.resource) {
        resourceCount++
      }
    }

    expect(resourceCount).toBeGreaterThan(0)
  })

  it('has water on map edges', () => {
    const { map } = generateMap({
      width: 15,
      height: 15,
      seed: 12345,
      playerCount: 2,
    })

    // Check corners
    expect(map.tiles.get(hexKey({ q: 0, r: 0 }))?.terrain).toBe('water')
    expect(map.tiles.get(hexKey({ q: 14, r: 0 }))?.terrain).toBe('water')
    expect(map.tiles.get(hexKey({ q: 0, r: 14 }))?.terrain).toBe('water')
    expect(map.tiles.get(hexKey({ q: 14, r: 14 }))?.terrain).toBe('water')
  })
})
