import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialState,
  createRng,
  getPlayer,
  getCurrentPlayer,
  getNextPlayer,
  isGameOver,
  applyAction,
  calculateFloorPrice,
  resetIdCounter,
  GAME_VERSION,
  MAX_TURNS,
  type GameConfig,
} from './index'
import { createUnit, addUnit } from '../units'
import type { GameState, TribeId } from '../types'

describe('createRng', () => {
  it('produces deterministic values for same seed', () => {
    const rng1 = createRng(12345)
    const rng2 = createRng(12345)

    const values1 = [rng1(), rng1(), rng1()]
    const values2 = [rng2(), rng2(), rng2()]

    expect(values1).toEqual(values2)
  })

  it('produces different values for different seeds', () => {
    const rng1 = createRng(12345)
    const rng2 = createRng(54321)

    expect(rng1()).not.toBe(rng2())
  })

  it('produces values between 0 and 1', () => {
    const rng = createRng(42)
    for (let i = 0; i < 100; i++) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('createInitialState', () => {
  const config: GameConfig = {
    seed: 12345,
    humanTribe: 'monkes',
    aiTribes: ['geckos', 'degods'],
  }

  beforeEach(() => {
    resetIdCounter()
  })

  it('creates state with correct version', () => {
    const state = createInitialState(config)
    expect(state.version).toBe(GAME_VERSION)
  })

  it('creates state with correct seed', () => {
    const state = createInitialState(config)
    expect(state.seed).toBe(12345)
  })

  it('starts at turn 1', () => {
    const state = createInitialState(config)
    expect(state.turn).toBe(1)
  })

  it('sets max turns correctly', () => {
    const state = createInitialState(config)
    expect(state.maxTurns).toBe(MAX_TURNS)
  })

  it('creates correct number of players', () => {
    const state = createInitialState(config)
    expect(state.players).toHaveLength(3) // 1 human + 2 AI
  })

  it('marks human player correctly', () => {
    const state = createInitialState(config)
    const humanPlayers = state.players.filter((p) => p.isHuman)
    expect(humanPlayers).toHaveLength(1)
  })

  it('sets current player to human tribe', () => {
    const state = createInitialState(config)
    const humanPlayer = state.players.find((p) => p.isHuman)
    expect(state.currentPlayer).toBe(humanPlayer?.tribeId)
  })

  it('initializes empty map', () => {
    const state = createInitialState(config)
    expect(state.map.width).toBe(15)
    expect(state.map.height).toBe(15)
    expect(state.map.tiles.size).toBe(0)
  })

  it('initializes empty units', () => {
    const state = createInitialState(config)
    expect(state.units.size).toBe(0)
  })

  it('initializes empty settlements', () => {
    const state = createInitialState(config)
    expect(state.settlements.size).toBe(0)
  })

  it('initializes floor prices for all players', () => {
    const state = createInitialState(config)
    expect(state.floorPrices.size).toBe(3)
  })
})

describe('state queries', () => {
  let state: GameState

  beforeEach(() => {
    resetIdCounter()
    state = createInitialState({
      seed: 1,
      humanTribe: 'monkes',
      aiTribes: ['geckos'],
    })
  })

  it('getPlayer finds player by tribe ID', () => {
    const player = getPlayer(state, state.currentPlayer)
    expect(player).toBeDefined()
    expect(player?.tribeId).toBe(state.currentPlayer)
  })

  it('getPlayer returns undefined for invalid tribe ID', () => {
    const player = getPlayer(state, 'invalid' as TribeId)
    expect(player).toBeUndefined()
  })

  it('getCurrentPlayer returns current player', () => {
    const player = getCurrentPlayer(state)
    expect(player).toBeDefined()
    expect(player?.tribeId).toBe(state.currentPlayer)
  })

  it('getNextPlayer returns next player in order', () => {
    const nextTribe = getNextPlayer(state)
    const currentIndex = state.players.findIndex((p) => p.tribeId === state.currentPlayer)
    const expectedNext = state.players[(currentIndex + 1) % state.players.length]
    expect(nextTribe).toBe(expectedNext?.tribeId)
  })

  it('isGameOver returns false when game is in progress', () => {
    expect(isGameOver(state)).toBe(false)
  })

  it('isGameOver returns true when past max turns', () => {
    const endState = { ...state, turn: MAX_TURNS + 1 }
    expect(isGameOver(endState)).toBe(true)
  })
})

describe('applyAction - END_TURN', () => {
  let state: GameState

  beforeEach(() => {
    resetIdCounter()
    state = createInitialState({
      seed: 1,
      humanTribe: 'monkes',
      aiTribes: ['geckos'],
    })
  })

  it('switches to next player', () => {
    const result = applyAction(state, { type: 'END_TURN' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.state.currentPlayer).not.toBe(state.currentPlayer)
    }
  })

  it('increments turn when cycling back to first player', () => {
    // End turn for all players in round
    let current = state
    for (let i = 0; i < state.players.length; i++) {
      const result = applyAction(current, { type: 'END_TURN' })
      expect(result.success).toBe(true)
      if (result.success) {
        current = result.state
      }
    }
    expect(current.turn).toBe(2)
  })

  it('does not increment turn mid-round', () => {
    const result = applyAction(state, { type: 'END_TURN' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.state.turn).toBe(1)
    }
  })

  it('resets unit movement at end of turn', () => {
    // Create a unit and exhaust its movement
    const unit = createUnit({
      type: 'scout',
      owner: state.currentPlayer,
      position: { q: 0, r: 0 },
    })
    let stateWithUnit = addUnit(state, unit)

    // Exhaust unit movement
    const exhaustedUnit = { ...unit, movementRemaining: 0, hasActed: true }
    stateWithUnit = {
      ...stateWithUnit,
      units: new Map([[unit.id, exhaustedUnit]]),
    }

    // End turn
    const result = applyAction(stateWithUnit, { type: 'END_TURN' })
    expect(result.success).toBe(true)
    if (result.success) {
      const resetUnit = result.state.units.get(unit.id)
      expect(resetUnit?.movementRemaining).toBeGreaterThan(0)
      expect(resetUnit?.hasActed).toBe(false)
    }
  })
})

describe('calculateFloorPrice', () => {
  let state: GameState

  beforeEach(() => {
    resetIdCounter()
    state = createInitialState({
      seed: 1,
      humanTribe: 'monkes',
      aiTribes: [],
    })
  })

  it('returns 0 for player with nothing', () => {
    const score = calculateFloorPrice(state, state.currentPlayer)
    expect(score).toBe(0)
  })

  it('adds points for settlements', () => {
    // Add a settlement
    const settlementState: GameState = {
      ...state,
      settlements: new Map([
        [
          'settlement_1' as never,
          {
            id: 'settlement_1' as never,
            name: 'Test City',
            owner: state.currentPlayer,
            position: { q: 0, r: 0 },
            population: 5,
            level: 1,
            populationProgress: 0,
            populationThreshold: 10,
            buildings: [],
            productionQueue: [],
            currentProduction: 0,
            milestonesChosen: [],
            isCapital: true,
          },
        ],
      ]),
    }

    const score = calculateFloorPrice(settlementState, state.currentPlayer)
    // 10 for settlement + 5 for population = 15
    expect(score).toBe(15)
  })

  it('adds points for gold in treasury', () => {
    const richState: GameState = {
      ...state,
      players: state.players.map((p) =>
        p.tribeId === state.currentPlayer ? { ...p, treasury: 100 } : p
      ),
    }

    const score = calculateFloorPrice(richState, state.currentPlayer)
    // 100 / 10 = 10 points
    expect(score).toBe(10)
  })

  it('adds points for kills', () => {
    const killerState: GameState = {
      ...state,
      players: state.players.map((p) =>
        p.tribeId === state.currentPlayer ? { ...p, killCount: 5 } : p
      ),
    }

    const score = calculateFloorPrice(killerState, state.currentPlayer)
    // 5 kills * 3 = 15 points
    expect(score).toBe(15)
  })
})
