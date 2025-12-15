// Hex grid utilities using axial coordinates (q, r) with pointy-top hexes
// Reference: https://www.redblobgames.com/grids/hexagons/

import type { HexCoord, CubeCoord } from '../types'

// =============================================================================
// Coordinate Helpers
// =============================================================================

/**
 * Creates a HexCoord from q, r values
 */
export function hex(q: number, r: number): HexCoord {
  return { q, r }
}

/**
 * Creates a string key for use in Maps/Sets
 */
export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`
}

/**
 * Parses a hex key back to coordinates
 */
export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number)
  if (q === undefined || r === undefined || isNaN(q) || isNaN(r)) {
    throw new Error(`Invalid hex key: ${key}`)
  }
  return { q, r }
}

/**
 * Checks if two hex coordinates are equal
 */
export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r
}

// =============================================================================
// Cube Coordinate Conversions
// =============================================================================

/**
 * Converts axial (q, r) to cube (q, r, s) coordinates
 */
export function axialToCube(coord: HexCoord): CubeCoord {
  return {
    q: coord.q,
    r: coord.r,
    s: -coord.q - coord.r,
  }
}

/**
 * Converts cube (q, r, s) to axial (q, r) coordinates
 */
export function cubeToAxial(coord: CubeCoord): HexCoord {
  return { q: coord.q, r: coord.r }
}

/**
 * Rounds cube coordinates to nearest hex (for pixel-to-hex conversion)
 */
export function cubeRound(coord: { q: number; r: number; s: number }): CubeCoord {
  let q = Math.round(coord.q)
  let r = Math.round(coord.r)
  let s = Math.round(coord.s)

  const qDiff = Math.abs(q - coord.q)
  const rDiff = Math.abs(r - coord.r)
  const sDiff = Math.abs(s - coord.s)

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s
  } else if (rDiff > sDiff) {
    r = -q - s
  } else {
    s = -q - r
  }

  return { q, r, s }
}

/**
 * Rounds axial coordinates to nearest hex
 */
export function hexRound(coord: { q: number; r: number }): HexCoord {
  const cube = cubeRound({ q: coord.q, r: coord.r, s: -coord.q - coord.r })
  return cubeToAxial(cube)
}

// =============================================================================
// Direction Vectors (pointy-top hex)
// =============================================================================

/** Direction vectors for the 6 neighbors of a hex (pointy-top orientation) */
const DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 }, // East
  { q: 1, r: -1 }, // Northeast
  { q: 0, r: -1 }, // Northwest
  { q: -1, r: 0 }, // West
  { q: -1, r: 1 }, // Southwest
  { q: 0, r: 1 }, // Southeast
]

export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5

/**
 * Gets the direction vector for a given direction index
 */
export function hexDirection(direction: HexDirection): HexCoord {
  return DIRECTIONS[direction]!
}

// =============================================================================
// Neighbor Functions
// =============================================================================

/**
 * Gets the neighbor of a hex in the given direction
 */
export function hexNeighbor(coord: HexCoord, direction: HexDirection): HexCoord {
  const dir = DIRECTIONS[direction]!
  return { q: coord.q + dir.q, r: coord.r + dir.r }
}

/**
 * Gets all 6 neighbors of a hex
 */
export function hexNeighbors(coord: HexCoord): HexCoord[] {
  return DIRECTIONS.map((dir) => ({
    q: coord.q + dir.q,
    r: coord.r + dir.r,
  }))
}

// =============================================================================
// Distance Functions
// =============================================================================

/**
 * Calculates the distance between two hexes (in hex steps)
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = axialToCube(a)
  const bc = axialToCube(b)
  return Math.max(Math.abs(ac.q - bc.q), Math.abs(ac.r - bc.r), Math.abs(ac.s - bc.s))
}

// =============================================================================
// Line Drawing
// =============================================================================

/**
 * Linear interpolation for cube coordinates
 */
function cubeLerp(
  a: CubeCoord,
  b: CubeCoord,
  t: number
): { q: number; r: number; s: number } {
  return {
    q: a.q + (b.q - a.q) * t,
    r: a.r + (b.r - a.r) * t,
    s: a.s + (b.s - a.s) * t,
  }
}

/**
 * Returns all hexes in a line from a to b (inclusive)
 */
export function hexLine(a: HexCoord, b: HexCoord): HexCoord[] {
  const n = hexDistance(a, b)
  if (n === 0) return [a]

  const ac = axialToCube(a)
  const bc = axialToCube(b)
  const results: HexCoord[] = []

  for (let i = 0; i <= n; i++) {
    const t = i / n
    const cube = cubeRound(cubeLerp(ac, bc, t))
    results.push(cubeToAxial(cube))
  }

  return results
}

// =============================================================================
// Range Functions
// =============================================================================

/**
 * Returns all hexes within a given radius of center (including center)
 */
export function hexRange(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = []

  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      results.push({ q: center.q + q, r: center.r + r })
    }
  }

  return results
}

/**
 * Returns all hexes exactly at a given distance from center (ring)
 */
export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [center]

  const results: HexCoord[] = []
  let current = { q: center.q + radius, r: center.r }

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push(current)
      current = hexNeighbor(current, ((i + 2) % 6) as HexDirection)
    }
  }

  return results
}

// =============================================================================
// Pathfinding (A*)
// =============================================================================

export interface PathfindingOptions {
  /** Returns the movement cost to enter a hex. Return Infinity for impassable. */
  cost: (coord: HexCoord) => number
  /** Maximum movement points available */
  maxCost?: number
  /** Returns true if the hex is within valid map bounds */
  isInBounds?: (coord: HexCoord) => boolean
}

interface PathNode {
  coord: HexCoord
  g: number // cost from start
  h: number // heuristic to goal
  f: number // g + h
  parent?: PathNode
}

/**
 * Finds the shortest path from start to goal using A* algorithm
 * Returns the path as an array of hex coordinates (including start and goal)
 * Returns null if no path exists
 */
export function hexPathfind(
  start: HexCoord,
  goal: HexCoord,
  options: PathfindingOptions
): HexCoord[] | null {
  const { cost, maxCost = Infinity, isInBounds = () => true } = options

  if (!isInBounds(start) || !isInBounds(goal)) {
    return null
  }

  const startKey = hexKey(start)
  const goalKey = hexKey(goal)

  if (startKey === goalKey) {
    return [start]
  }

  const openSet = new Map<string, PathNode>()
  const closedSet = new Set<string>()

  const startNode: PathNode = {
    coord: start,
    g: 0,
    h: hexDistance(start, goal),
    f: hexDistance(start, goal),
  }
  openSet.set(startKey, startNode)

  while (openSet.size > 0) {
    // Find node with lowest f score
    let current: PathNode | undefined
    let currentKey = ''
    for (const [key, node] of openSet) {
      if (!current || node.f < current.f || (node.f === current.f && node.h < current.h)) {
        current = node
        currentKey = key
      }
    }

    if (!current) break

    // Check if we've reached the goal
    if (currentKey === goalKey) {
      const path: HexCoord[] = []
      let node: PathNode | undefined = current
      while (node) {
        path.unshift(node.coord)
        node = node.parent
      }
      return path
    }

    // Move current from open to closed
    openSet.delete(currentKey)
    closedSet.add(currentKey)

    // Check all neighbors
    for (const neighbor of hexNeighbors(current.coord)) {
      const neighborKey = hexKey(neighbor)

      if (closedSet.has(neighborKey)) continue
      if (!isInBounds(neighbor)) continue

      const moveCost = cost(neighbor)
      if (moveCost === Infinity) continue

      const g = current.g + moveCost
      if (g > maxCost) continue

      const existing = openSet.get(neighborKey)
      if (existing && g >= existing.g) continue

      const h = hexDistance(neighbor, goal)
      const node: PathNode = {
        coord: neighbor,
        g,
        h,
        f: g + h,
        parent: current,
      }
      openSet.set(neighborKey, node)
    }
  }

  return null // No path found
}

/**
 * Returns all hexes reachable from start within the given movement budget
 */
export function hexReachable(
  start: HexCoord,
  movement: number,
  options: Omit<PathfindingOptions, 'maxCost'>
): Map<string, number> {
  const { cost, isInBounds = () => true } = options
  const reachable = new Map<string, number>()
  const frontier: Array<{ coord: HexCoord; remaining: number }> = [
    { coord: start, remaining: movement },
  ]

  reachable.set(hexKey(start), movement)

  while (frontier.length > 0) {
    const current = frontier.shift()!

    for (const neighbor of hexNeighbors(current.coord)) {
      if (!isInBounds(neighbor)) continue

      const moveCost = cost(neighbor)
      if (moveCost === Infinity) continue

      const remaining = current.remaining - moveCost
      if (remaining < 0) continue

      const neighborKey = hexKey(neighbor)
      const existingRemaining = reachable.get(neighborKey)

      if (existingRemaining === undefined || remaining > existingRemaining) {
        reachable.set(neighborKey, remaining)
        frontier.push({ coord: neighbor, remaining })
      }
    }
  }

  return reachable
}

// =============================================================================
// Pixel Conversions (for rendering)
// =============================================================================

export interface HexLayout {
  readonly size: number // distance from center to corner
  readonly origin: { readonly x: number; readonly y: number }
}

/**
 * Converts hex coordinates to pixel position (center of hex)
 * Uses pointy-top orientation
 */
export function hexToPixel(coord: HexCoord, layout: HexLayout): { x: number; y: number } {
  const x = layout.size * (Math.sqrt(3) * coord.q + (Math.sqrt(3) / 2) * coord.r)
  const y = layout.size * ((3 / 2) * coord.r)
  return { x: x + layout.origin.x, y: y + layout.origin.y }
}

/**
 * Converts pixel position to hex coordinates
 */
export function pixelToHex(
  pixel: { x: number; y: number },
  layout: HexLayout
): HexCoord {
  const x = pixel.x - layout.origin.x
  const y = pixel.y - layout.origin.y
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / layout.size
  const r = ((2 / 3) * y) / layout.size
  return hexRound({ q, r })
}

/**
 * Returns the 6 corner positions of a hex in pixel coordinates
 */
export function hexCorners(coord: HexCoord, layout: HexLayout): Array<{ x: number; y: number }> {
  const center = hexToPixel(coord, layout)
  const corners: Array<{ x: number; y: number }> = []

  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30 // pointy-top starts at -30 degrees
    const angleRad = (Math.PI / 180) * angleDeg
    corners.push({
      x: center.x + layout.size * Math.cos(angleRad),
      y: center.y + layout.size * Math.sin(angleRad),
    })
  }

  return corners
}
