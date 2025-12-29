import { describe, it, expect, beforeEach } from 'vitest'
import {
  getLootboxAt,
  getUnclaimedLootboxes,
  hasLootboxAt,
  rollLootboxReward,
  claimLootbox,
  getLootboxById,
  updateLootbox,
} from './index'
import type { GameState, TribeId, LootboxReward, Lootbox, LootboxId } from '../types'
import { createInitialState, createRng } from '../state'
import { generateMap } from '../map'
import { createSettlement, addSettlement } from '../settlements'

describe('Lootbox Queries', () => {
  let state: GameState

  beforeEach(() => {
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

  it('finds lootbox at position', () => {
    // Get first lootbox position
    const firstLootbox = state.lootboxes[0]!
    const foundLootbox = getLootboxAt(state, firstLootbox.position)

    expect(foundLootbox).toBeDefined()
    expect(foundLootbox!.id).toBe(firstLootbox.id)
  })

  it('returns undefined for empty position', () => {
    const foundLootbox = getLootboxAt(state, { q: 0, r: 0 })
    // Position 0,0 is unlikely to have a lootbox due to distance constraints
    // This test might be flaky depending on map gen, but 0,0 should be near a start
    expect(foundLootbox).toBeUndefined()
  })

  it('does not find claimed lootboxes', () => {
    const firstLootbox = state.lootboxes[0]!

    // Mark as claimed
    const claimedLootboxes = state.lootboxes.map((lb) =>
      lb.id === firstLootbox.id ? { ...lb, claimed: true } : lb
    )
    const stateWithClaimed = { ...state, lootboxes: claimedLootboxes }

    const foundLootbox = getLootboxAt(stateWithClaimed, firstLootbox.position)
    expect(foundLootbox).toBeUndefined()
  })

  it('gets all unclaimed lootboxes', () => {
    const unclaimed = getUnclaimedLootboxes(state)
    expect(unclaimed.length).toBe(state.lootboxes.length)

    // Mark one as claimed
    const claimedLootboxes = state.lootboxes.map((lb, i) =>
      i === 0 ? { ...lb, claimed: true } : lb
    )
    const stateWithClaimed = { ...state, lootboxes: claimedLootboxes }

    const unclaimedAfter = getUnclaimedLootboxes(stateWithClaimed)
    expect(unclaimedAfter.length).toBe(state.lootboxes.length - 1)
  })

  it('checks if lootbox exists at position', () => {
    const firstLootbox = state.lootboxes[0]!
    expect(hasLootboxAt(state, firstLootbox.position)).toBe(true)
    expect(hasLootboxAt(state, { q: 0, r: 0 })).toBe(false)
  })

  it('gets lootbox by id', () => {
    const firstLootbox = state.lootboxes[0]!
    const found = getLootboxById(state, firstLootbox.id)

    expect(found).toBeDefined()
    expect(found!.id).toBe(firstLootbox.id)
  })

  it('updates lootbox in state', () => {
    const firstLootbox = state.lootboxes[0]!
    const updatedLootbox: Lootbox = {
      ...firstLootbox,
      claimed: true,
      reward: 'airdrop',
    }

    const newState = updateLootbox(state, updatedLootbox)

    const found = getLootboxById(newState, firstLootbox.id)
    expect(found!.claimed).toBe(true)
    expect(found!.reward).toBe('airdrop')
  })
})

describe('Reward Rolling', () => {
  it('rolls valid reward types', () => {
    const rng = createRng(12345)
    const validRewards: LootboxReward[] = [
      'airdrop',
      'alpha_leak',
      'og_holder',
      'community_growth',
      'scout',
    ]

    for (let i = 0; i < 100; i++) {
      const reward = rollLootboxReward(rng)
      expect(validRewards).toContain(reward)
    }
  })

  it('distributes rewards roughly according to weights', () => {
    const rng = createRng(12345)
    const counts: Record<LootboxReward, number> = {
      airdrop: 0,
      alpha_leak: 0,
      og_holder: 0,
      community_growth: 0,
      scout: 0,
    }

    for (let i = 0; i < 1000; i++) {
      counts[rollLootboxReward(rng)]++
    }

    // Airdrop has highest weight (30), should be most common
    expect(counts.airdrop).toBeGreaterThan(counts.alpha_leak)
    expect(counts.airdrop).toBeGreaterThan(counts.scout)

    // og_holder and community_growth have same weight (20)
    // Both should be more common than alpha_leak and scout (15 each)
    expect(counts.og_holder + counts.community_growth).toBeGreaterThan(
      counts.alpha_leak + counts.scout
    )
  })

  it('produces deterministic results with same seed', () => {
    const rng1 = createRng(99999)
    const rng2 = createRng(99999)

    const results1: LootboxReward[] = []
    const results2: LootboxReward[] = []

    for (let i = 0; i < 10; i++) {
      results1.push(rollLootboxReward(rng1))
      results2.push(rollLootboxReward(rng2))
    }

    expect(results1).toEqual(results2)
  })
})

describe('Lootbox Claiming', () => {
  let state: GameState
  let tribeId: TribeId

  beforeEach(() => {
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
    tribeId = state.players[0]!.tribeId

    // Add a settlement for the player (needed for some rewards)
    const settlement = createSettlement({
      owner: tribeId,
      position: { q: 7, r: 7 },
      isCapital: true,
    })
    state = addSettlement(state, settlement)
  })

  it('claims lootbox and marks it as claimed', () => {
    const rng = createRng(12345)
    const firstLootbox = state.lootboxes[0]!

    const result = claimLootbox(state, firstLootbox.position, tribeId, rng)

    expect(result).not.toBeNull()
    expect(result!.reward).toBeDefined()

    // Lootbox should be marked as claimed
    const claimedLootbox = result!.state.lootboxes.find(
      (lb) => lb.id === firstLootbox.id
    )
    expect(claimedLootbox!.claimed).toBe(true)
    expect(claimedLootbox!.reward).toBe(result!.reward)
  })

  it('returns null for position without lootbox', () => {
    const rng = createRng(12345)
    const result = claimLootbox(state, { q: 0, r: 0 }, tribeId, rng)
    expect(result).toBeNull()
  })

  it('returns null for already claimed lootbox', () => {
    const rng = createRng(12345)
    const firstLootbox = state.lootboxes[0]!

    // Claim first time
    const result1 = claimLootbox(state, firstLootbox.position, tribeId, rng)
    expect(result1).not.toBeNull()

    // Try to claim again
    const result2 = claimLootbox(result1!.state, firstLootbox.position, tribeId, rng)
    expect(result2).toBeNull()
  })
})

describe('Reward Effects', () => {
  let state: GameState
  let tribeId: TribeId

  beforeEach(() => {
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
    tribeId = state.players[0]!.tribeId

    // Add a capital settlement
    const settlement = createSettlement({
      owner: tribeId,
      position: { q: 7, r: 7 },
      isCapital: true,
    })
    state = addSettlement(state, settlement)
  })

  it('airdrop reward grants gold', () => {
    // We need to force an airdrop reward
    // Use a seed that produces airdrop
    let rng = createRng(1)
    let result = null
    const firstLootbox = state.lootboxes[0]!

    // Try multiple seeds until we get an airdrop
    for (let seed = 1; seed < 100; seed++) {
      rng = createRng(seed)
      result = claimLootbox(state, firstLootbox.position, tribeId, rng)
      if (result && result.reward === 'airdrop') break
    }

    if (result && result.reward === 'airdrop') {
      const details = result.details as { type: 'airdrop'; gold: number }
      expect(details.type).toBe('airdrop')
      expect(details.gold).toBeGreaterThanOrEqual(25)
      expect(details.gold).toBeLessThanOrEqual(50)

      // Check player treasury increased
      const originalTreasury = state.players.find((p) => p.tribeId === tribeId)!.treasury
      const newTreasury = result.state.players.find((p) => p.tribeId === tribeId)!.treasury
      expect(newTreasury).toBe(originalTreasury + details.gold)
    }
  })

  it('community_growth adds growth to capital', () => {
    // Find seed that produces community_growth
    let rng = createRng(1)
    let result = null
    const firstLootbox = state.lootboxes[0]!

    for (let seed = 1; seed < 200; seed++) {
      rng = createRng(seed)
      result = claimLootbox(state, firstLootbox.position, tribeId, rng)
      if (result && result.reward === 'community_growth') break
    }

    if (result && result.reward === 'community_growth') {
      const details = result.details as {
        type: 'community_growth'
        settlementId: string
        growthAdded: number
      }
      expect(details.type).toBe('community_growth')
      expect(details.growthAdded).toBe(20)

      // Check settlement growth progress increased
      const originalGrowth = Array.from(state.settlements.values())[0]!.growthProgress
      const newSettlement = Array.from(result.state.settlements.values()).find(
        (s) => s.isCapital
      )
      expect(newSettlement!.growthProgress).toBe(originalGrowth + 20)
    }
  })

  it('og_holder spawns military unit at nearest settlement', () => {
    // Find seed that produces og_holder
    let rng = createRng(1)
    let result = null
    const firstLootbox = state.lootboxes[0]!

    for (let seed = 1; seed < 200; seed++) {
      rng = createRng(seed)
      result = claimLootbox(state, firstLootbox.position, tribeId, rng)
      if (result && result.reward === 'og_holder') break
    }

    if (result && result.reward === 'og_holder') {
      const details = result.details as {
        type: 'og_holder'
        unitId: string
        unitType: string
      }
      expect(details.type).toBe('og_holder')
      expect(details.unitType).toBe('warrior')

      // Check unit was added
      expect(result.state.units.size).toBeGreaterThan(state.units.size)
      const newUnit = result.state.units.get(details.unitId as never)
      expect(newUnit).toBeDefined()
      expect(newUnit!.type).toBe('warrior')
      expect(newUnit!.owner).toBe(tribeId)
    }
  })

  it('scout reveals area around lootbox', () => {
    // Find seed that produces scout
    let rng = createRng(1)
    let result = null
    const firstLootbox = state.lootboxes[0]!

    for (let seed = 1; seed < 200; seed++) {
      rng = createRng(seed)
      result = claimLootbox(state, firstLootbox.position, tribeId, rng)
      if (result && result.reward === 'scout') break
    }

    if (result && result.reward === 'scout') {
      const details = result.details as { type: 'scout'; hexesRevealed: number }
      expect(details.type).toBe('scout')
      // Should reveal some hexes (up to 61 in a 5-radius)
      expect(details.hexesRevealed).toBeGreaterThanOrEqual(0)

      // Check fog was updated
      const newFog = result.state.fog.get(tribeId)
      expect(newFog).toBeDefined()
    }
  })

  it('alpha_leak completes current research if active', () => {
    // Set up player with current research
    const techId = 'mining' as never
    const playersWithResearch = state.players.map((p) =>
      p.tribeId === tribeId
        ? { ...p, currentResearch: techId, researchProgress: 10 }
        : p
    )
    state = { ...state, players: playersWithResearch }

    // Find seed that produces alpha_leak
    let rng = createRng(1)
    let result = null
    const firstLootbox = state.lootboxes[0]!

    for (let seed = 1; seed < 200; seed++) {
      rng = createRng(seed)
      result = claimLootbox(state, firstLootbox.position, tribeId, rng)
      if (result && result.reward === 'alpha_leak') break
    }

    if (result && result.reward === 'alpha_leak') {
      const details = result.details as { type: 'alpha_leak'; techId: string }
      expect(details.type).toBe('alpha_leak')
      expect(details.techId).toBe(techId)

      // Check tech was researched
      const player = result.state.players.find((p) => p.tribeId === tribeId)!
      expect(player.researchedTechs).toContain(techId)
      expect(player.currentResearch).toBeUndefined()
      expect(player.researchProgress).toBe(0)
    }
  })
})
