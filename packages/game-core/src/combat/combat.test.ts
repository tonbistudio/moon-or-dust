import { describe, it, expect } from 'vitest'
import {
  isRiverCrossing,
  calculateCombatStrength,
  getCombatPreview,
} from './index'
import { createUnit } from '../units'
import { hexKey } from '../hex'
import type { GameState, Tile, HexCoord, TribeId } from '../types'

// Helper to create a minimal game state with tiles
function createTestState(tiles: Tile[]): GameState {
  const tileMap = new Map<string, Tile>()
  for (const tile of tiles) {
    tileMap.set(hexKey(tile.coord), tile)
  }

  return {
    version: '1.0.0',
    seed: 12345,
    turn: 1,
    currentPlayer: 'tribe_1' as never,
    players: [
      {
        tribeId: 'tribe_1' as never,
        tribeName: 'monkes',
        isHuman: true,
        treasury: 100,
        researchedTechs: [],
        currentResearch: null,
        researchProgress: 0,
        unlockedCultures: [],
        currentCulture: null,
        cultureProgress: 0,
        policySlots: { military: 1, economy: 1, progress: 0, wildcard: 0 },
        activePolicies: [],
        policyPool: [],
        policies: {
          slots: { military: 1, economy: 1, progress: 0, wildcard: 0 },
          pool: [],
          active: [],
        },
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
      {
        tribeId: 'tribe_2' as never,
        tribeName: 'degods',
        isHuman: false,
        treasury: 100,
        researchedTechs: [],
        currentResearch: null,
        researchProgress: 0,
        unlockedCultures: [],
        currentCulture: null,
        cultureProgress: 0,
        policySlots: { military: 1, economy: 1, progress: 0, wildcard: 0 },
        activePolicies: [],
        policyPool: [],
        policies: {
          slots: { military: 1, economy: 1, progress: 0, wildcard: 0 },
          pool: [],
          active: [],
        },
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
    fog: new Map(),
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

function createTile(coord: HexCoord, terrain: 'grassland' | 'river', isRiver: boolean = false): Tile {
  return {
    coord,
    terrain: terrain === 'river' ? 'grassland' : terrain,
    feature: isRiver ? 'river' : 'none',
    owner: undefined,
  }
}

describe('River Crossing Detection', () => {
  it('detects river crossing when defender is on river and attacker is not', () => {
    const attackerPos: HexCoord = { q: 0, r: 0 }
    const defenderPos: HexCoord = { q: 1, r: 0 }

    const state = createTestState([
      createTile(attackerPos, 'grassland', false),
      createTile(defenderPos, 'grassland', true), // River tile
    ])

    expect(isRiverCrossing(state, attackerPos, defenderPos)).toBe(true)
  })

  it('does not detect crossing when both units are on river tiles', () => {
    const attackerPos: HexCoord = { q: 0, r: 0 }
    const defenderPos: HexCoord = { q: 1, r: 0 }

    const state = createTestState([
      createTile(attackerPos, 'grassland', true), // River tile
      createTile(defenderPos, 'grassland', true), // River tile
    ])

    expect(isRiverCrossing(state, attackerPos, defenderPos)).toBe(false)
  })

  it('does not detect crossing when defender is not on river', () => {
    const attackerPos: HexCoord = { q: 0, r: 0 }
    const defenderPos: HexCoord = { q: 1, r: 0 }

    const state = createTestState([
      createTile(attackerPos, 'grassland', true), // River tile
      createTile(defenderPos, 'grassland', false), // Normal tile
    ])

    expect(isRiverCrossing(state, attackerPos, defenderPos)).toBe(false)
  })

  it('does not detect crossing when neither unit is on river', () => {
    const attackerPos: HexCoord = { q: 0, r: 0 }
    const defenderPos: HexCoord = { q: 1, r: 0 }

    const state = createTestState([
      createTile(attackerPos, 'grassland', false),
      createTile(defenderPos, 'grassland', false),
    ])

    expect(isRiverCrossing(state, attackerPos, defenderPos)).toBe(false)
  })
})

describe('Combat Strength with River Crossing', () => {
  it('applies river crossing penalty to attacker when crossing into river', () => {
    const attackerPos: HexCoord = { q: 0, r: 0 }
    const defenderPos: HexCoord = { q: 1, r: 0 }

    const state = createTestState([
      createTile(attackerPos, 'grassland', false),
      createTile(defenderPos, 'grassland', true),
    ])

    const attacker = createUnit({
      type: 'warrior',
      owner: 'tribe_1' as TribeId,
      position: attackerPos,
      rarity: 'common',
    })

    // Calculate without river crossing (no target position)
    const strengthNoRiver = calculateCombatStrength(state, attacker, false)

    // Calculate with river crossing
    const strengthWithRiver = calculateCombatStrength(state, attacker, false, defenderPos)

    // River crossing should reduce strength by 25%
    expect(strengthWithRiver.riverCrossingPenalty).toBeLessThan(0)
    expect(strengthWithRiver.total).toBeLessThan(strengthNoRiver.total)

    // Penalty should be -25% of base
    const expectedPenalty = Math.floor(attacker.combatStrength * -0.25)
    expect(strengthWithRiver.riverCrossingPenalty).toBe(expectedPenalty)
  })

  it('does not apply river crossing penalty to defender', () => {
    const attackerPos: HexCoord = { q: 0, r: 0 }
    const defenderPos: HexCoord = { q: 1, r: 0 }

    const state = createTestState([
      createTile(attackerPos, 'grassland', false),
      createTile(defenderPos, 'grassland', true),
    ])

    const defender = createUnit({
      type: 'warrior',
      owner: 'tribe_2' as TribeId,
      position: defenderPos,
      rarity: 'common',
    })

    // Defenders never get river crossing penalty
    const defenderStrength = calculateCombatStrength(state, defender, true)
    expect(defenderStrength.riverCrossingPenalty).toBe(0)
  })

  it('does not apply penalty when no target position provided', () => {
    const attackerPos: HexCoord = { q: 0, r: 0 }

    const state = createTestState([
      createTile(attackerPos, 'grassland', false),
    ])

    const attacker = createUnit({
      type: 'warrior',
      owner: 'tribe_1' as TribeId,
      position: attackerPos,
      rarity: 'common',
    })

    const strength = calculateCombatStrength(state, attacker, false)
    expect(strength.riverCrossingPenalty).toBe(0)
  })
})

describe('Combat Preview with River Crossing', () => {
  it('includes river crossing penalty in combat preview', () => {
    const attackerPos: HexCoord = { q: 0, r: 0 }
    const defenderPos: HexCoord = { q: 1, r: 0 }

    const state = createTestState([
      createTile(attackerPos, 'grassland', false),
      createTile(defenderPos, 'grassland', true),
    ])

    const attacker = createUnit({
      type: 'warrior',
      owner: 'tribe_1' as TribeId,
      position: attackerPos,
      rarity: 'common',
    })
    const defender = createUnit({
      type: 'warrior',
      owner: 'tribe_2' as TribeId,
      position: defenderPos,
      rarity: 'common',
    })

    // Add units to state
    const stateWithUnits = {
      ...state,
      units: new Map([
        [attacker.id, attacker],
        [defender.id, defender],
      ]),
    }

    const preview = getCombatPreview(stateWithUnits, attacker, defender)

    // Attacker should have river crossing penalty
    expect(preview.attackerStrength.riverCrossingPenalty).toBeLessThan(0)
    // Defender should not have river crossing penalty
    expect(preview.defenderStrength.riverCrossingPenalty).toBe(0)
  })
})
