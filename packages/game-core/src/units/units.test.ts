import { describe, it, expect, beforeEach } from 'vitest'
import {
  createUnit,
  UNIT_DEFINITIONS,
  RARITY_BONUSES,
  rollRarity,
  getUnitsAt,
  getStackInfo,
  canStackUnit,
  hasEnemyUnits,
  getReachableHexes,
  findPath,
  getPathCost,
  moveUnit,
  resetUnitMovement,
  addUnit,
  removeUnit,
  getPlayerUnits,
  MAX_MILITARY_STACK,
  MAX_CIVILIAN_STACK,
} from './index'
import type { Unit, TribeId, GameState, UnitRarity } from '../types'
import { createInitialState, createRng } from '../state'
import { generateMap } from '../map'
import { hexKey } from '../hex'

describe('Unit Definitions', () => {
  it('defines all unit types', () => {
    expect(UNIT_DEFINITIONS.scout).toBeDefined()
    expect(UNIT_DEFINITIONS.warrior).toBeDefined()
    expect(UNIT_DEFINITIONS.ranged).toBeDefined()
    expect(UNIT_DEFINITIONS.settler).toBeDefined()
    expect(UNIT_DEFINITIONS.builder).toBeDefined()
    expect(UNIT_DEFINITIONS.great_person).toBeDefined()
  })

  it('marks civilian units correctly', () => {
    expect(UNIT_DEFINITIONS.settler.isCivilian).toBe(true)
    expect(UNIT_DEFINITIONS.builder.isCivilian).toBe(true)
    expect(UNIT_DEFINITIONS.great_person.isCivilian).toBe(true)
    expect(UNIT_DEFINITIONS.scout.isCivilian).toBe(false)
    expect(UNIT_DEFINITIONS.warrior.isCivilian).toBe(false)
    expect(UNIT_DEFINITIONS.ranged.isCivilian).toBe(false)
  })

  it('gives scouts highest movement', () => {
    expect(UNIT_DEFINITIONS.scout.baseMovement).toBeGreaterThan(
      UNIT_DEFINITIONS.warrior.baseMovement
    )
  })

  it('gives warriors highest combat strength', () => {
    expect(UNIT_DEFINITIONS.warrior.baseCombatStrength).toBeGreaterThan(
      UNIT_DEFINITIONS.scout.baseCombatStrength
    )
  })

  it('gives builders 3 build charges', () => {
    expect(UNIT_DEFINITIONS.builder.buildCharges).toBe(3)
  })
})

describe('Rarity System', () => {
  it('defines bonuses for all rarities', () => {
    const rarities: UnitRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
    for (const rarity of rarities) {
      expect(RARITY_BONUSES[rarity]).toBeDefined()
    }
  })

  it('gives increasing combat bonuses by rarity', () => {
    expect(RARITY_BONUSES.common.combat).toBe(0)
    expect(RARITY_BONUSES.uncommon.combat).toBeGreaterThan(RARITY_BONUSES.common.combat)
    expect(RARITY_BONUSES.rare.combat).toBeGreaterThan(RARITY_BONUSES.uncommon.combat)
    expect(RARITY_BONUSES.epic.combat).toBeGreaterThan(RARITY_BONUSES.rare.combat)
    expect(RARITY_BONUSES.legendary.combat).toBeGreaterThan(RARITY_BONUSES.epic.combat)
  })

  it('rolls common rarity most frequently', () => {
    const rng = createRng(12345)
    const results: Record<UnitRarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    }

    for (let i = 0; i < 1000; i++) {
      results[rollRarity(rng)]++
    }

    expect(results.common).toBeGreaterThan(results.uncommon)
    expect(results.uncommon).toBeGreaterThan(results.rare)
    expect(results.rare).toBeGreaterThan(results.epic)
    expect(results.epic).toBeGreaterThan(results.legendary)
  })
})

describe('Unit Creation', () => {
  it('creates a unit with base stats', () => {
    const unit = createUnit({
      type: 'warrior',
      owner: 'tribe_1' as TribeId,
      position: { q: 0, r: 0 },
      rarity: 'common',
    })

    expect(unit.type).toBe('warrior')
    expect(unit.owner).toBe('tribe_1')
    expect(unit.position).toEqual({ q: 0, r: 0 })
    expect(unit.rarity).toBe('common')
    expect(unit.health).toBe(unit.maxHealth)
    expect(unit.movementRemaining).toBe(unit.maxMovement)
    expect(unit.experience).toBe(0)
    expect(unit.level).toBe(1)
    expect(unit.promotions).toEqual([])
    expect(unit.hasActed).toBe(false)
  })

  it('applies rarity bonuses to combat stats', () => {
    const common = createUnit({
      type: 'warrior',
      owner: 'tribe_1' as TribeId,
      position: { q: 0, r: 0 },
      rarity: 'common',
    })

    const legendary = createUnit({
      type: 'warrior',
      owner: 'tribe_1' as TribeId,
      position: { q: 0, r: 0 },
      rarity: 'legendary',
    })

    expect(legendary.combatStrength).toBeGreaterThan(common.combatStrength)
  })

  it('applies rarity bonuses to movement', () => {
    const common = createUnit({
      type: 'warrior',
      owner: 'tribe_1' as TribeId,
      position: { q: 0, r: 0 },
      rarity: 'common',
    })

    const legendary = createUnit({
      type: 'warrior',
      owner: 'tribe_1' as TribeId,
      position: { q: 0, r: 0 },
      rarity: 'legendary',
    })

    expect(legendary.maxMovement).toBeGreaterThan(common.maxMovement)
  })

  it('rolls rarity when rng is provided', () => {
    const rng = createRng(12345)
    const unit = createUnit({
      type: 'warrior',
      owner: 'tribe_1' as TribeId,
      position: { q: 0, r: 0 },
      rng,
    })

    expect(unit.rarity).toBeDefined()
  })
})

describe('Unit Stacking', () => {
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
      barbarianCamps: mapResult.barbarianCamps,
    }
  })

  it('limits military units to MAX_MILITARY_STACK per hex', () => {
    const tribeId = state.players[0]!.tribeId
    const position = { q: 5, r: 5 }

    // Add first warrior
    const warrior1 = createUnit({
      type: 'warrior',
      owner: tribeId,
      position,
      rarity: 'common',
    })
    state = addUnit(state, warrior1)

    // Add second warrior
    const warrior2 = createUnit({
      type: 'warrior',
      owner: tribeId,
      position,
      rarity: 'common',
    })
    state = addUnit(state, warrior2)

    // Third warrior should not be able to stack
    const warrior3 = createUnit({
      type: 'warrior',
      owner: tribeId,
      position: { q: 0, r: 0 },
      rarity: 'common',
    })

    expect(canStackUnit(state, position, warrior3)).toBe(false)
    expect(MAX_MILITARY_STACK).toBe(2)
  })

  it('limits civilian units to MAX_CIVILIAN_STACK per hex', () => {
    const tribeId = state.players[0]!.tribeId
    const position = { q: 5, r: 5 }

    // Add first settler
    const settler1 = createUnit({
      type: 'settler',
      owner: tribeId,
      position,
      rarity: 'common',
    })
    state = addUnit(state, settler1)

    // Second settler should not be able to stack
    const settler2 = createUnit({
      type: 'settler',
      owner: tribeId,
      position: { q: 0, r: 0 },
      rarity: 'common',
    })

    expect(canStackUnit(state, position, settler2)).toBe(false)
    expect(MAX_CIVILIAN_STACK).toBe(1)
  })

  it('allows mixed military and civilian stacking', () => {
    const tribeId = state.players[0]!.tribeId
    const position = { q: 5, r: 5 }

    // Add military units
    const warrior1 = createUnit({ type: 'warrior', owner: tribeId, position, rarity: 'common' })
    const warrior2 = createUnit({ type: 'warrior', owner: tribeId, position, rarity: 'common' })
    state = addUnit(state, warrior1)
    state = addUnit(state, warrior2)

    // Should still be able to add civilian
    const settler = createUnit({
      type: 'settler',
      owner: tribeId,
      position: { q: 0, r: 0 },
      rarity: 'common',
    })

    expect(canStackUnit(state, position, settler)).toBe(true)
  })

  it('detects enemy units at position', () => {
    const tribeId = state.players[0]!.tribeId
    const enemyTribeId = state.players[1]!.tribeId
    const position = { q: 5, r: 5 }

    const enemyUnit = createUnit({
      type: 'warrior',
      owner: enemyTribeId,
      position,
      rarity: 'common',
    })
    state = addUnit(state, enemyUnit)

    expect(hasEnemyUnits(state, position, tribeId)).toBe(true)
    expect(hasEnemyUnits(state, position, enemyTribeId)).toBe(false)
  })

  it('gets stack info correctly', () => {
    const tribeId = state.players[0]!.tribeId
    const position = { q: 5, r: 5 }

    const warrior = createUnit({ type: 'warrior', owner: tribeId, position, rarity: 'common' })
    const settler = createUnit({ type: 'settler', owner: tribeId, position, rarity: 'common' })
    state = addUnit(state, warrior)
    state = addUnit(state, settler)

    const stack = getStackInfo(state, position)

    expect(stack.military.length).toBe(1)
    expect(stack.civilian.length).toBe(1)
    expect(stack.total).toBe(2)
  })
})

describe('Unit Movement', () => {
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
      barbarianCamps: mapResult.barbarianCamps,
    }
  })

  it('finds reachable hexes based on movement', () => {
    const tribeId = state.players[0]!.tribeId
    const unit = createUnit({
      type: 'scout',
      owner: tribeId,
      position: { q: 7, r: 7 },
      rarity: 'common',
    })
    state = addUnit(state, unit)

    const reachable = getReachableHexes(state, unit)

    expect(reachable.size).toBeGreaterThan(0)
    // Starting position should not be in reachable
    expect(reachable.has(hexKey(unit.position))).toBe(false)
  })

  it('finds path to target', () => {
    const tribeId = state.players[0]!.tribeId
    // Create scout with lots of movement
    const unit = createUnit({
      type: 'scout',
      owner: tribeId,
      position: { q: 5, r: 5 },
      rarity: 'common',
    })
    state = addUnit(state, unit)

    const target = { q: 6, r: 5 }
    const path = findPath(state, unit, target)

    if (path) {
      expect(path[0]).toEqual(unit.position)
      expect(path[path.length - 1]).toEqual(target)
    }
  })

  it('calculates path cost', () => {
    const tribeId = state.players[0]!.tribeId
    const unit = createUnit({
      type: 'scout',
      owner: tribeId,
      position: { q: 5, r: 5 },
      rarity: 'common',
    })
    state = addUnit(state, unit)

    const path = [{ q: 5, r: 5 }, { q: 6, r: 5 }]
    const cost = getPathCost(state, unit, path)

    expect(cost).toBeGreaterThan(0)
  })

  it('moves unit along path', () => {
    const unit = createUnit({
      type: 'scout',
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
      rarity: 'common',
    })

    const path = [{ q: 5, r: 5 }, { q: 6, r: 5 }]
    const movedUnit = moveUnit(unit, path, 1)

    expect(movedUnit.position).toEqual({ q: 6, r: 5 })
    expect(movedUnit.movementRemaining).toBe(unit.movementRemaining - 1)
    expect(movedUnit.hasActed).toBe(true)
  })

  it('resets unit movement at turn start', () => {
    const unit = createUnit({
      type: 'scout',
      owner: 'tribe_1' as TribeId,
      position: { q: 5, r: 5 },
      rarity: 'common',
    })

    const movedUnit = { ...unit, movementRemaining: 0, hasActed: true }
    const units = new Map([['unit_1' as never, movedUnit]])
    const resetUnits = resetUnitMovement(units)

    const resetUnit = resetUnits.get('unit_1' as never)!
    expect(resetUnit.movementRemaining).toBe(unit.maxMovement)
    expect(resetUnit.hasActed).toBe(false)
  })
})

describe('Unit State Management', () => {
  let state: GameState

  beforeEach(() => {
    state = createInitialState({
      seed: 12345,
      humanTribe: 'monkes',
      aiTribes: ['geckos'],
    })
  })

  it('adds unit to state', () => {
    const unit = createUnit({
      type: 'warrior',
      owner: state.players[0]!.tribeId,
      position: { q: 5, r: 5 },
      rarity: 'common',
    })

    const newState = addUnit(state, unit)

    expect(newState.units.has(unit.id)).toBe(true)
    expect(newState.units.get(unit.id)).toEqual(unit)
  })

  it('removes unit from state', () => {
    const unit = createUnit({
      type: 'warrior',
      owner: state.players[0]!.tribeId,
      position: { q: 5, r: 5 },
      rarity: 'common',
    })

    let newState = addUnit(state, unit)
    expect(newState.units.has(unit.id)).toBe(true)

    newState = removeUnit(newState, unit.id)
    expect(newState.units.has(unit.id)).toBe(false)
  })

  it('gets player units', () => {
    const tribeId = state.players[0]!.tribeId
    const enemyTribeId = state.players[1]!.tribeId

    const ownUnit = createUnit({
      type: 'warrior',
      owner: tribeId,
      position: { q: 5, r: 5 },
      rarity: 'common',
    })
    const enemyUnit = createUnit({
      type: 'warrior',
      owner: enemyTribeId,
      position: { q: 6, r: 5 },
      rarity: 'common',
    })

    state = addUnit(state, ownUnit)
    state = addUnit(state, enemyUnit)

    const playerUnits = getPlayerUnits(state, tribeId)

    expect(playerUnits.length).toBe(1)
    expect(playerUnits[0]!.id).toBe(ownUnit.id)
  })

  it('gets units at position', () => {
    const tribeId = state.players[0]!.tribeId
    const position = { q: 5, r: 5 }

    const unit1 = createUnit({ type: 'warrior', owner: tribeId, position, rarity: 'common' })
    const unit2 = createUnit({ type: 'settler', owner: tribeId, position, rarity: 'common' })
    const unit3 = createUnit({
      type: 'warrior',
      owner: tribeId,
      position: { q: 6, r: 5 },
      rarity: 'common',
    })

    state = addUnit(state, unit1)
    state = addUnit(state, unit2)
    state = addUnit(state, unit3)

    const units = getUnitsAt(state, position)

    expect(units.length).toBe(2)
    expect(units.map((u) => u.id)).toContain(unit1.id)
    expect(units.map((u) => u.id)).toContain(unit2.id)
  })
})
