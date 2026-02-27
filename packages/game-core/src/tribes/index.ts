// Tribes system - tribe definitions and bonuses

import type {
  Tribe,
  TribeName,
  TribeId,
  TribeBonuses,
  GameState,
  Player,
} from '../types'

// =============================================================================
// Tribe Definitions
// =============================================================================

export const TRIBE_DEFINITIONS: Record<TribeName, Tribe> = {
  monkes: {
    id: 'monkes' as TribeId,
    name: 'monkes',
    displayName: 'Monkes',
    primaryStrength: 'vibes',
    secondaryStrength: 'economy',
    uniqueUnitType: 'banana_slinger',
    uniqueBuildingId: 'degen_mints_cabana' as never,
    color: '#FFD700', // Gold
    bonuses: {
      vibesYieldPercent: 0.05, // +5% Vibes yield
      extraTradeRouteCapacity: 1, // +1 max trade route
    },
  },
  geckos: {
    id: 'geckos' as TribeId,
    name: 'geckos',
    displayName: 'Geckos',
    primaryStrength: 'tech',
    secondaryStrength: 'military',
    uniqueUnitType: 'neon_geck',
    uniqueBuildingId: 'the_garage' as never,
    color: '#00FF88', // Neon green
    bonuses: {
      alphaYieldPercent: 0.05, // +5% Alpha yield
      rangedUnitProductionPercent: 0.10, // +10% production on ranged units
    },
  },
  degods: {
    id: 'degods' as TribeId,
    name: 'degods',
    displayName: 'DeGods',
    primaryStrength: 'military',
    secondaryStrength: 'economy',
    uniqueUnitType: 'deadgod',
    uniqueBuildingId: 'eternal_bridge' as never,
    color: '#8B0000', // Dark red
    bonuses: {
      meleeUnitProductionPercent: 0.10, // +10% production on melee units
      goldFromGoldBuildingsPercent: 0.10, // +10% gold from gold-yield buildings
    },
  },
  cets: {
    id: 'cets' as TribeId,
    name: 'cets',
    displayName: 'Cets',
    primaryStrength: 'vibes',
    secondaryStrength: 'production',
    uniqueUnitType: 'stuckers',
    uniqueBuildingId: 'creckhouse' as never,
    color: '#4169E1', // Royal blue
    bonuses: {
      vibesFromCultureBuildingsPercent: 0.10, // +10% Vibes from culture buildings
      productionFromProductionBuildingsPercent: 0.10, // +10% production from production buildings
    },
  },
  // Coming soon tribes (no bonuses yet)
  gregs: {
    id: 'gregs' as TribeId,
    name: 'gregs',
    displayName: 'Foxes',
    primaryStrength: 'economy',
    secondaryStrength: 'tech',
    uniqueUnitType: 'warrior', // Placeholder
    uniqueBuildingId: 'library' as never, // Placeholder
    color: '#FF8C00', // Dark orange
    bonuses: {},
  },
  dragonz: {
    id: 'dragonz' as TribeId,
    name: 'dragonz',
    displayName: 'Dragonz',
    primaryStrength: 'military',
    secondaryStrength: 'vibes',
    uniqueUnitType: 'warrior', // Placeholder
    uniqueBuildingId: 'barracks' as never, // Placeholder
    color: '#FF4500', // Orange red
    bonuses: {},
  },
}

export const ALL_TRIBES: Tribe[] = Object.values(TRIBE_DEFINITIONS)

export const PLAYABLE_TRIBES: Tribe[] = ALL_TRIBES.filter(
  (t) => t.name === 'monkes' || t.name === 'geckos' || t.name === 'degods' || t.name === 'cets'
)

export const TRIBE_MAP: Map<TribeName, Tribe> = new Map(
  ALL_TRIBES.map((t) => [t.name, t])
)

// =============================================================================
// Tribe Queries
// =============================================================================

/**
 * Gets a tribe by name
 */
export function getTribe(name: TribeName): Tribe | undefined {
  return TRIBE_MAP.get(name)
}

/**
 * Gets a tribe by ID
 */
export function getTribeById(id: TribeId): Tribe | undefined {
  return ALL_TRIBES.find((t) => t.id === id)
}

/**
 * Gets the tribe for a player
 */
export function getPlayerTribe(_state: GameState, player: Player): Tribe | undefined {
  return getTribe(player.tribeName)
}

/**
 * Gets the tribe definition for a runtime TribeId by looking up the player's tribeName.
 * Use this instead of getTribeById() when working with settlement.owner or unit.owner,
 * since runtime TribeIds (e.g. "tribe_1") don't match definition IDs (e.g. "monkes").
 */
export function getTribeForPlayer(state: GameState, tribeId: TribeId): Tribe | undefined {
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (!player) return undefined
  return getTribe(player.tribeName)
}

/**
 * Gets tribe bonuses for a player
 */
export function getPlayerTribeBonuses(state: GameState, tribeId: TribeId): TribeBonuses {
  const tribe = getTribeForPlayer(state, tribeId)
  return tribe?.bonuses ?? {}
}

// =============================================================================
// Bonus Application Helpers
// =============================================================================

/**
 * Applies percentage bonus to a value
 * @param base The base value
 * @param bonusPercent The bonus as a decimal (0.05 = 5%)
 * @returns The value with bonus applied
 */
export function applyPercentBonus(base: number, bonusPercent: number | undefined): number {
  if (!bonusPercent) return base
  return Math.floor(base * (1 + bonusPercent))
}

/**
 * Checks if a unit type is melee
 */
export function isMeleeUnit(unitType: string): boolean {
  const meleeUnits = ['warrior', 'swordsman', 'bot_fighter', 'deadgod', 'stuckers']
  return meleeUnits.includes(unitType)
}

/**
 * Checks if a unit type is ranged
 */
export function isRangedUnit(unitType: string): boolean {
  const rangedUnits = ['archer', 'sniper', 'rockeeter', 'banana_slinger', 'neon_geck']
  return rangedUnits.includes(unitType)
}

/**
 * Gets production bonus for a unit type based on tribe bonuses
 */
export function getUnitProductionBonus(unitType: string, bonuses: TribeBonuses): number {
  if (isMeleeUnit(unitType) && bonuses.meleeUnitProductionPercent) {
    return bonuses.meleeUnitProductionPercent
  }
  if (isRangedUnit(unitType) && bonuses.rangedUnitProductionPercent) {
    return bonuses.rangedUnitProductionPercent
  }
  return 0
}
