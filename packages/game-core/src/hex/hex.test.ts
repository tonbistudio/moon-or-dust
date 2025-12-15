import { describe, it, expect } from 'vitest'
import {
  hex,
  hexKey,
  parseHexKey,
  hexEquals,
  axialToCube,
  cubeToAxial,
  hexNeighbors,
  hexNeighbor,
  hexDistance,
  hexLine,
  hexRange,
  hexRing,
  hexPathfind,
  hexReachable,
  hexToPixel,
  pixelToHex,
  hexRound,
  type HexDirection,
} from './index'

describe('hex coordinates', () => {
  it('creates hex coordinates', () => {
    const coord = hex(3, -2)
    expect(coord.q).toBe(3)
    expect(coord.r).toBe(-2)
  })

  it('creates and parses hex keys', () => {
    const coord = hex(5, -3)
    const key = hexKey(coord)
    expect(key).toBe('5,-3')
    expect(parseHexKey(key)).toEqual(coord)
  })

  it('checks equality', () => {
    expect(hexEquals(hex(1, 2), hex(1, 2))).toBe(true)
    expect(hexEquals(hex(1, 2), hex(1, 3))).toBe(false)
    expect(hexEquals(hex(1, 2), hex(2, 2))).toBe(false)
  })
})

describe('cube coordinate conversion', () => {
  it('converts axial to cube', () => {
    const cube = axialToCube(hex(3, -2))
    expect(cube.q).toBe(3)
    expect(cube.r).toBe(-2)
    expect(cube.s).toBe(-1) // s = -q - r = -3 - (-2) = -1
  })

  it('converts cube to axial', () => {
    const axial = cubeToAxial({ q: 3, r: -2, s: -1 })
    expect(axial.q).toBe(3)
    expect(axial.r).toBe(-2)
  })

  it('roundtrips correctly', () => {
    const original = hex(7, -4)
    const cube = axialToCube(original)
    const back = cubeToAxial(cube)
    expect(hexEquals(original, back)).toBe(true)
  })
})

describe('hex neighbors', () => {
  it('returns 6 neighbors', () => {
    const neighbors = hexNeighbors(hex(0, 0))
    expect(neighbors).toHaveLength(6)
  })

  it('returns correct neighbors for origin', () => {
    const neighbors = hexNeighbors(hex(0, 0))
    const keys = neighbors.map(hexKey).sort()
    expect(keys).toEqual(['-1,0', '-1,1', '0,-1', '0,1', '1,-1', '1,0'])
  })

  it('returns correct neighbor in each direction', () => {
    const center = hex(2, 3)
    expect(hexNeighbor(center, 0 as HexDirection)).toEqual(hex(3, 3)) // East
    expect(hexNeighbor(center, 1 as HexDirection)).toEqual(hex(3, 2)) // Northeast
    expect(hexNeighbor(center, 2 as HexDirection)).toEqual(hex(2, 2)) // Northwest
    expect(hexNeighbor(center, 3 as HexDirection)).toEqual(hex(1, 3)) // West
    expect(hexNeighbor(center, 4 as HexDirection)).toEqual(hex(1, 4)) // Southwest
    expect(hexNeighbor(center, 5 as HexDirection)).toEqual(hex(2, 4)) // Southeast
  })
})

describe('hex distance', () => {
  it('returns 0 for same hex', () => {
    expect(hexDistance(hex(3, 4), hex(3, 4))).toBe(0)
  })

  it('returns 1 for adjacent hexes', () => {
    const center = hex(0, 0)
    for (const neighbor of hexNeighbors(center)) {
      expect(hexDistance(center, neighbor)).toBe(1)
    }
  })

  it('calculates correct distance', () => {
    expect(hexDistance(hex(0, 0), hex(3, 0))).toBe(3)
    expect(hexDistance(hex(0, 0), hex(0, 3))).toBe(3)
    expect(hexDistance(hex(0, 0), hex(3, -3))).toBe(3)
    expect(hexDistance(hex(1, 2), hex(4, -1))).toBe(3) // cube: (1,2,-3) to (4,-1,-3)
    expect(hexDistance(hex(0, 0), hex(5, -2))).toBe(5) // cube: (0,0,0) to (5,-2,-3)
  })
})

describe('hex line', () => {
  it('returns single hex for same start and end', () => {
    const line = hexLine(hex(2, 3), hex(2, 3))
    expect(line).toHaveLength(1)
    expect(line[0]).toEqual(hex(2, 3))
  })

  it('includes start and end', () => {
    const start = hex(0, 0)
    const end = hex(3, 0)
    const line = hexLine(start, end)
    expect(line[0]).toEqual(start)
    expect(line[line.length - 1]).toEqual(end)
  })

  it('returns correct number of hexes', () => {
    const line = hexLine(hex(0, 0), hex(5, 0))
    expect(line).toHaveLength(6) // 0 to 5 inclusive
  })

  it('all hexes are adjacent', () => {
    const line = hexLine(hex(0, 0), hex(3, -3))
    for (let i = 1; i < line.length; i++) {
      expect(hexDistance(line[i - 1]!, line[i]!)).toBe(1)
    }
  })
})

describe('hex range', () => {
  it('returns only center for radius 0', () => {
    const range = hexRange(hex(2, 3), 0)
    expect(range).toHaveLength(1)
    expect(range[0]).toEqual(hex(2, 3))
  })

  it('returns 7 hexes for radius 1', () => {
    const range = hexRange(hex(0, 0), 1)
    expect(range).toHaveLength(7) // center + 6 neighbors
  })

  it('returns 19 hexes for radius 2', () => {
    const range = hexRange(hex(0, 0), 2)
    expect(range).toHaveLength(19) // 1 + 6 + 12
  })

  it('all hexes are within radius', () => {
    const center = hex(5, 5)
    const radius = 3
    const range = hexRange(center, radius)
    for (const coord of range) {
      expect(hexDistance(center, coord)).toBeLessThanOrEqual(radius)
    }
  })
})

describe('hex ring', () => {
  it('returns center for radius 0', () => {
    const ring = hexRing(hex(2, 3), 0)
    expect(ring).toHaveLength(1)
    expect(ring[0]).toEqual(hex(2, 3))
  })

  it('returns 6 hexes for radius 1', () => {
    const ring = hexRing(hex(0, 0), 1)
    expect(ring).toHaveLength(6)
  })

  it('returns 12 hexes for radius 2', () => {
    const ring = hexRing(hex(0, 0), 2)
    expect(ring).toHaveLength(12)
  })

  it('all hexes are exactly at radius distance', () => {
    const center = hex(5, 5)
    const radius = 3
    const ring = hexRing(center, radius)
    for (const coord of ring) {
      expect(hexDistance(center, coord)).toBe(radius)
    }
  })
})

describe('hex pathfinding', () => {
  const simpleCost = (): number => 1
  const simpleOptions = { cost: simpleCost }

  it('returns single hex path for same start and goal', () => {
    const path = hexPathfind(hex(2, 3), hex(2, 3), simpleOptions)
    expect(path).toHaveLength(1)
    expect(path![0]).toEqual(hex(2, 3))
  })

  it('finds path to adjacent hex', () => {
    const path = hexPathfind(hex(0, 0), hex(1, 0), simpleOptions)
    expect(path).toHaveLength(2)
    expect(path![0]).toEqual(hex(0, 0))
    expect(path![1]).toEqual(hex(1, 0))
  })

  it('finds shortest path', () => {
    const path = hexPathfind(hex(0, 0), hex(3, 0), simpleOptions)
    expect(path).toHaveLength(4) // distance is 3, so 4 hexes in path
  })

  it('avoids impassable terrain', () => {
    const costWithWall = (coord: { q: number; r: number }): number => {
      if (coord.q === 1 && coord.r === 0) return Infinity
      return 1
    }
    const path = hexPathfind(hex(0, 0), hex(2, 0), { cost: costWithWall })
    expect(path).not.toBeNull()
    expect(path!.find((c) => c.q === 1 && c.r === 0)).toBeUndefined()
  })

  it('returns null when no path exists', () => {
    const surrounded = (coord: { q: number; r: number }): number => {
      if (coord.q !== 0 || coord.r !== 0) return Infinity
      return 1
    }
    const path = hexPathfind(hex(0, 0), hex(5, 5), { cost: surrounded })
    expect(path).toBeNull()
  })

  it('respects maxCost', () => {
    const path = hexPathfind(hex(0, 0), hex(5, 0), { cost: simpleCost, maxCost: 3 })
    expect(path).toBeNull()
  })

  it('respects bounds', () => {
    const isInBounds = (coord: { q: number; r: number }): boolean => {
      return coord.q >= 0 && coord.q < 10 && coord.r >= 0 && coord.r < 10
    }
    const path = hexPathfind(hex(0, 0), hex(-1, 0), { cost: simpleCost, isInBounds })
    expect(path).toBeNull()
  })
})

describe('hex reachable', () => {
  const simpleCost = (): number => 1

  it('includes start hex', () => {
    const reachable = hexReachable(hex(0, 0), 0, { cost: simpleCost })
    expect(reachable.has(hexKey(hex(0, 0)))).toBe(true)
    expect(reachable.size).toBe(1)
  })

  it('finds all hexes within movement', () => {
    const reachable = hexReachable(hex(0, 0), 2, { cost: simpleCost })
    // With 2 movement, can reach center + 6 neighbors + 12 at distance 2 = 19
    expect(reachable.size).toBe(19)
  })

  it('tracks remaining movement correctly', () => {
    const reachable = hexReachable(hex(0, 0), 2, { cost: simpleCost })
    expect(reachable.get(hexKey(hex(0, 0)))).toBe(2) // start with full movement
    expect(reachable.get(hexKey(hex(1, 0)))).toBe(1) // 1 remaining after 1 move
    expect(reachable.get(hexKey(hex(2, 0)))).toBe(0) // 0 remaining after 2 moves
  })

  it('handles variable terrain costs', () => {
    const terrainCost = (coord: { q: number; r: number }): number => {
      if (coord.q === 1 && coord.r === 0) return 2 // difficult terrain
      return 1
    }
    const reachable = hexReachable(hex(0, 0), 2, { cost: terrainCost })
    // Can't go through (1,0) and continue with only 2 movement
    expect(reachable.get(hexKey(hex(2, 0)))).toBeUndefined()
  })
})

describe('pixel conversions', () => {
  const layout = { size: 32, origin: { x: 0, y: 0 } }

  it('converts origin hex to origin pixel', () => {
    const pixel = hexToPixel(hex(0, 0), layout)
    expect(pixel.x).toBeCloseTo(0)
    expect(pixel.y).toBeCloseTo(0)
  })

  it('roundtrips pixel to hex', () => {
    const original = hex(3, -2)
    const pixel = hexToPixel(original, layout)
    const back = pixelToHex(pixel, layout)
    expect(hexEquals(original, back)).toBe(true)
  })

  it('handles layout origin offset', () => {
    const offsetLayout = { size: 32, origin: { x: 100, y: 100 } }
    const pixel = hexToPixel(hex(0, 0), offsetLayout)
    expect(pixel.x).toBeCloseTo(100)
    expect(pixel.y).toBeCloseTo(100)
  })
})

describe('hex rounding', () => {
  it('rounds to nearest hex', () => {
    const r1 = hexRound({ q: 0.1, r: 0.1 })
    expect(r1.q).toBe(0)
    expect(r1.r).toBe(0)

    const r2 = hexRound({ q: 0.9, r: 0.1 })
    expect(r2.q).toBe(1)
    expect(r2.r).toBe(0)

    const r3 = hexRound({ q: 0.3, r: 0.6 })
    expect(r3.q).toBe(0)
    expect(r3.r).toBe(1)
  })

  it('maintains valid cube coordinates (q + r + s = 0)', () => {
    const testCases = [
      { q: 0.6, r: -0.4 },
      { q: -0.6, r: 0.4 },
      { q: 1.2, r: -0.8 },
      { q: 2.3, r: 1.7 },
    ]
    for (const input of testCases) {
      const result = hexRound(input)
      const s = -result.q - result.r
      expect(result.q + result.r + s).toBe(0)
    }
  })
})
