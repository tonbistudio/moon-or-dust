import { describe, it, expect, beforeEach } from 'vitest'
import {
  createTradeRoute,
  cancelTradeRoute,
  processTradeRouteFormation,
  getTradeRouteCapacity,
  hasTradeUnlocked,
  getPlayerTradeRoutes,
  getActiveTradeRoutes,
  calculateTradeRouteIncome,
  calculateTradeRouteGold,
  pillageSettlementTradeRoutes,
  canCreateTradeRoute,
  getTradeRouteSummary,
  resetTradeRouteIds,
  getAvailableProduction,
} from './index'
import { createInitialState, resetIdCounter, type GameConfig } from '../state'
import type { GameState, TribeId, Settlement, SettlementId, TechId, Player } from '../types'
import { createSettlement, addSettlement } from '../settlements'
import { canBuildWonder } from '../wonders'

describe('Trade Route System', () => {
  let state: GameState
  let humanTribeId: TribeId
  let aiTribeId: TribeId

  const config: GameConfig = {
    seed: 12345,
    humanTribe: 'monkes',
    aiTribes: ['geckos'],
  }

  beforeEach(() => {
    resetIdCounter()
    resetTradeRouteIds()
    state = createInitialState(config)
    humanTribeId = state.players[0]!.tribeId
    aiTribeId = state.players[1]!.tribeId

    // Add settlements for testing
    const humanSettlement = createSettlement({
      owner: humanTribeId,
      position: { q: 5, r: 5 },
      isCapital: true,
    })
    state = addSettlement(state, humanSettlement)

    const aiSettlement = createSettlement({
      owner: aiTribeId,
      position: { q: 10, r: 10 },
      isCapital: true,
    })
    state = addSettlement(state, aiSettlement)
  })

  describe('hasTradeUnlocked', () => {
    it('returns false when Smart Contracts not researched', () => {
      expect(hasTradeUnlocked(state, humanTribeId)).toBe(false)
    })

    it('returns true when Smart Contracts is researched', () => {
      // Add smart_contracts to researched techs
      state = addTechToPlayer(state, humanTribeId, 'smart_contracts' as TechId)
      expect(hasTradeUnlocked(state, humanTribeId)).toBe(true)
    })
  })

  describe('getTradeRouteCapacity', () => {
    it('returns 0 when no trade techs researched', () => {
      expect(getTradeRouteCapacity(state, humanTribeId)).toBe(0)
    })

    it('returns 1 when Smart Contracts researched', () => {
      state = addTechToPlayer(state, humanTribeId, 'smart_contracts' as TechId)
      expect(getTradeRouteCapacity(state, humanTribeId)).toBe(1)
    })

    it('returns 2 when Smart Contracts + Currency researched', () => {
      state = addTechToPlayer(state, humanTribeId, 'smart_contracts' as TechId)
      state = addTechToPlayer(state, humanTribeId, 'currency' as TechId)
      expect(getTradeRouteCapacity(state, humanTribeId)).toBe(2)
    })

    it('returns 3 when Smart Contracts + Currency + Lending researched', () => {
      state = addTechToPlayer(state, humanTribeId, 'smart_contracts' as TechId)
      state = addTechToPlayer(state, humanTribeId, 'currency' as TechId)
      state = addTechToPlayer(state, humanTribeId, 'lending' as TechId)
      expect(getTradeRouteCapacity(state, humanTribeId)).toBe(3)
    })
  })

  describe('createTradeRoute', () => {
    beforeEach(() => {
      // Unlock trade
      state = addTechToPlayer(state, humanTribeId, 'smart_contracts' as TechId)
    })

    it('returns null when trade not unlocked', () => {
      const noTradeState = createInitialState(config)
      const settlement1 = createSettlement({
        owner: noTradeState.players[0]!.tribeId,
        position: { q: 5, r: 5 },
        isCapital: true,
      })
      const withSettlement = addSettlement(noTradeState, settlement1)
      const settlement2 = createSettlement({
        owner: noTradeState.players[0]!.tribeId,
        position: { q: 7, r: 7 },
        isCapital: false,
      })
      const withBothSettlements = addSettlement(withSettlement, settlement2)

      const result = createTradeRoute(
        withBothSettlements,
        settlement1.id,
        settlement2.id
      )
      expect(result).toBeNull()
    })

    it('creates internal trade route between own settlements', () => {
      // Add second settlement for same player
      const settlement2 = createSettlement({
        owner: humanTribeId,
        position: { q: 7, r: 7 },
        isCapital: false,
      })
      state = addSettlement(state, settlement2)

      const origin = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId && s.isCapital
      )!

      const result = createTradeRoute(state, origin.id, settlement2.id)

      expect(result).not.toBeNull()
      expect(result!.route.ownerTribe).toBe(humanTribeId)
      expect(result!.route.targetTribe).toBe(humanTribeId)
      expect(result!.route.active).toBe(false)
      expect(result!.route.turnsUntilActive).toBe(2)
    })

    it('creates external trade route with neutral tribe', () => {
      const humanSettlement = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId
      )!
      const aiSettlement = Array.from(state.settlements.values()).find(
        (s) => s.owner === aiTribeId
      )!

      // Make AI settlement visible
      state = makeSettlementVisible(state, humanTribeId, aiSettlement)

      const result = createTradeRoute(state, humanSettlement.id, aiSettlement.id)

      expect(result).not.toBeNull()
      expect(result!.route.ownerTribe).toBe(humanTribeId)
      expect(result!.route.targetTribe).toBe(aiTribeId)
    })

    it('returns null when at war with target', () => {
      const humanSettlement = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId
      )!
      const aiSettlement = Array.from(state.settlements.values()).find(
        (s) => s.owner === aiTribeId
      )!

      // Set to war
      state = setDiplomaticStance(state, humanTribeId, aiTribeId, 'war')
      state = makeSettlementVisible(state, humanTribeId, aiSettlement)

      const result = createTradeRoute(state, humanSettlement.id, aiSettlement.id)

      expect(result).toBeNull()
    })

    it('returns null when destination not visible', () => {
      const humanSettlement = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId
      )!
      const aiSettlement = Array.from(state.settlements.values()).find(
        (s) => s.owner === aiTribeId
      )!

      // Don't make visible
      const result = createTradeRoute(state, humanSettlement.id, aiSettlement.id)

      expect(result).toBeNull()
    })

    it('returns null when capacity is full', () => {
      // Create first route (fills capacity of 1)
      const settlement2 = createSettlement({
        owner: humanTribeId,
        position: { q: 7, r: 7 },
        isCapital: false,
      })
      state = addSettlement(state, settlement2)

      const origin = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId && s.isCapital
      )!

      const result1 = createTradeRoute(state, origin.id, settlement2.id)
      expect(result1).not.toBeNull()

      state = result1!.state

      // Try to create second route
      const settlement3 = createSettlement({
        owner: humanTribeId,
        position: { q: 8, r: 8 },
        isCapital: false,
      })
      state = addSettlement(state, settlement3)

      const result2 = createTradeRoute(state, origin.id, settlement3.id)
      expect(result2).toBeNull()
    })
  })

  describe('processTradeRouteFormation', () => {
    beforeEach(() => {
      state = addTechToPlayer(state, humanTribeId, 'smart_contracts' as TechId)

      const settlement2 = createSettlement({
        owner: humanTribeId,
        position: { q: 7, r: 7 },
        isCapital: false,
      })
      state = addSettlement(state, settlement2)
    })

    it('decrements turnsUntilActive each turn', () => {
      const origin = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId && s.isCapital
      )!
      const dest = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId && !s.isCapital
      )!

      const result = createTradeRoute(state, origin.id, dest.id)
      state = result!.state

      expect(state.tradeRoutes[0]!.turnsUntilActive).toBe(2)

      state = processTradeRouteFormation(state, humanTribeId)
      expect(state.tradeRoutes[0]!.turnsUntilActive).toBe(1)
    })

    it('activates route when turnsUntilActive reaches 0', () => {
      const origin = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId && s.isCapital
      )!
      const dest = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId && !s.isCapital
      )!

      const result = createTradeRoute(state, origin.id, dest.id)
      state = result!.state

      // Process twice to activate
      state = processTradeRouteFormation(state, humanTribeId)
      state = processTradeRouteFormation(state, humanTribeId)

      expect(state.tradeRoutes[0]!.active).toBe(true)
      expect(state.tradeRoutes[0]!.turnsUntilActive).toBe(0)
    })
  })

  describe('calculateTradeRouteIncome', () => {
    it('returns 0 when no active routes', () => {
      expect(calculateTradeRouteIncome(state, humanTribeId)).toBe(0)
    })

    it('returns income only from active routes', () => {
      state = addTechToPlayer(state, humanTribeId, 'smart_contracts' as TechId)

      const settlement2 = createSettlement({
        owner: humanTribeId,
        position: { q: 7, r: 7 },
        isCapital: false,
      })
      state = addSettlement(state, settlement2)

      const origin = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId && s.isCapital
      )!

      const result = createTradeRoute(state, origin.id, settlement2.id)
      state = result!.state

      // Route is forming, not active
      expect(calculateTradeRouteIncome(state, humanTribeId)).toBe(0)

      // Activate route
      state = processTradeRouteFormation(state, humanTribeId)
      state = processTradeRouteFormation(state, humanTribeId)

      // Now should have income
      expect(calculateTradeRouteIncome(state, humanTribeId)).toBeGreaterThan(0)
    })
  })

  describe('pillageSettlementTradeRoutes', () => {
    beforeEach(() => {
      state = addTechToPlayer(state, humanTribeId, 'smart_contracts' as TechId)

      const settlement2 = createSettlement({
        owner: humanTribeId,
        position: { q: 7, r: 7 },
        isCapital: false,
      })
      state = addSettlement(state, settlement2)

      const origin = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId && s.isCapital
      )!

      const result = createTradeRoute(state, origin.id, settlement2.id)
      state = result!.state

      // Activate route
      state = processTradeRouteFormation(state, humanTribeId)
      state = processTradeRouteFormation(state, humanTribeId)
    })

    it('breaks trade routes connected to settlement', () => {
      const origin = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId && s.isCapital
      )!

      expect(state.tradeRoutes[0]!.active).toBe(true)

      const result = pillageSettlementTradeRoutes(state, origin.id, aiTribeId)

      expect(result.routesBroken).toBe(1)
      expect(result.state.tradeRoutes[0]!.active).toBe(false)
    })

    it('gives gold to pillager', () => {
      const origin = Array.from(state.settlements.values()).find(
        (s) => s.owner === humanTribeId && s.isCapital
      )!

      const goldBefore = state.players.find((p) => p.tribeId === aiTribeId)!.treasury
      const routeGold = state.tradeRoutes[0]!.goldPerTurn

      const result = pillageSettlementTradeRoutes(state, origin.id, aiTribeId)

      const goldAfter = result.state.players.find((p) => p.tribeId === aiTribeId)!.treasury
      expect(goldAfter).toBe(goldBefore + routeGold)
    })
  })

  describe('getTradeRouteSummary', () => {
    it('returns correct summary', () => {
      const summary = getTradeRouteSummary(state, humanTribeId)

      expect(summary.unlocked).toBe(false)
      expect(summary.capacity).toBe(0)
      expect(summary.active).toBe(0)
      expect(summary.forming).toBe(0)
      expect(summary.income).toBe(0)
    })

    it('updates summary when trade is unlocked', () => {
      state = addTechToPlayer(state, humanTribeId, 'smart_contracts' as TechId)

      const summary = getTradeRouteSummary(state, humanTribeId)

      expect(summary.unlocked).toBe(true)
      expect(summary.capacity).toBe(1)
    })
  })
})

// Helper functions for testing
function addTechToPlayer(state: GameState, tribeId: TribeId, techId: TechId): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  const updatedPlayer: Player = {
    ...player,
    researchedTechs: [...player.researchedTechs, techId],
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

function makeSettlementVisible(
  state: GameState,
  tribeId: TribeId,
  settlement: Settlement
): GameState {
  const currentFog = state.fog.get(tribeId) ?? new Set<string>()
  const newFog = new Set(currentFog)
  newFog.add(`${settlement.position.q},${settlement.position.r}`)

  const fogMap = new Map(state.fog)
  fogMap.set(tribeId, newFog)

  return { ...state, fog: fogMap }
}

function setDiplomaticStance(
  state: GameState,
  tribe1: TribeId,
  tribe2: TribeId,
  stance: 'war' | 'hostile' | 'neutral' | 'friendly' | 'allied'
): GameState {
  const key = [tribe1, tribe2].sort().join('-')
  const newRelations = new Map(state.diplomacy.relations)
  newRelations.set(key, {
    stance,
    turnsAtCurrentStance: 0,
    reputation: 0,
  })

  return {
    ...state,
    diplomacy: {
      ...state.diplomacy,
      relations: newRelations,
    },
  }
}

describe('Wonder Prerequisites', () => {
  let state: GameState
  let humanTribeId: TribeId

  const config: GameConfig = {
    seed: 12345,
    humanTribe: 'monkes',
    aiTribes: ['geckos'],
  }

  beforeEach(() => {
    resetIdCounter()
    resetTradeRouteIds()
    state = createInitialState(config)
    humanTribeId = state.players[0]!.tribeId

    const humanSettlement = createSettlement({
      owner: humanTribeId,
      position: { q: 5, r: 5 },
      isCapital: true,
    })
    state = addSettlement(state, humanSettlement)
  })

  it('should not allow building wonders without tech prereqs', () => {
    const settlement = Array.from(state.settlements.values()).find(
      (s) => s.owner === humanTribeId
    )!

    // Candy Machine requires smart_contracts tech
    const result = canBuildWonder(state, settlement.id, 'candy_machine' as any)
    expect(result.canBuild).toBe(false)
    expect(result.reason).toContain('smart_contracts')
  })

  it('should not allow building wonders without culture prereqs', () => {
    const settlement = Array.from(state.settlements.values()).find(
      (s) => s.owner === humanTribeId
    )!

    // Degen Ape Emporium requires diamond_hands culture
    const result = canBuildWonder(state, settlement.id, 'degen_ape_emporium' as any)
    expect(result.canBuild).toBe(false)
    expect(result.reason).toContain('diamond_hands')
  })

  it('should allow building wonder when tech prereq is met', () => {
    const settlement = Array.from(state.settlements.values()).find(
      (s) => s.owner === humanTribeId
    )!

    // Add smart_contracts tech
    state = addTechToPlayer(state, humanTribeId, 'smart_contracts' as TechId)

    const result = canBuildWonder(state, settlement.id, 'candy_machine' as any)
    expect(result.canBuild).toBe(true)
  })

  it('should filter wonders in getAvailableProduction based on prereqs', () => {
    const settlement = Array.from(state.settlements.values()).find(
      (s) => s.owner === humanTribeId
    )!

    // Without any techs/cultures, no wonders should be available
    const available = getAvailableProduction(state, settlement.id)
    const wonders = available.filter((item) => item.type === 'wonder')
    expect(wonders.length).toBe(0)
  })
})
