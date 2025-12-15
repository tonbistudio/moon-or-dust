// Unit promotion system - Combat, Mobility, and Survival paths

import type { PromotionId, PromotionPath, Unit } from '../types'

// =============================================================================
// Promotion Definitions
// =============================================================================

export interface PromotionDefinition {
  readonly id: PromotionId
  readonly name: string
  readonly path: PromotionPath
  readonly tier: 1 | 2 | 3
  readonly prerequisite?: PromotionId
  readonly effect: PromotionEffect
  readonly description: string
}

export type PromotionEffect =
  | { type: 'attack_bonus'; percent: number }
  | { type: 'defense_bonus'; percent: number }
  | { type: 'movement_bonus'; amount: number }
  | { type: 'ignore_terrain' }
  | { type: 'heal_per_turn'; amount: number }
  | { type: 'low_health_bonus'; percent: number; threshold: number }
  | { type: 'adjacent_heal'; amount: number }
  | { type: 'first_strike' } // Attack before defender
  | { type: 'ranged_bonus'; percent: number }
  | { type: 'anti_cavalry'; percent: number }

// =============================================================================
// Combat Path - Increases attack/defense strength
// =============================================================================

const COMBAT_PATH: PromotionDefinition[] = [
  // Tier 1
  {
    id: 'battlecry_1' as PromotionId,
    name: 'Battlecry I',
    path: 'combat',
    tier: 1,
    effect: { type: 'attack_bonus', percent: 10 },
    description: '+10% combat strength when attacking',
  },
  {
    id: 'defender_1' as PromotionId,
    name: 'Defender I',
    path: 'combat',
    tier: 1,
    effect: { type: 'defense_bonus', percent: 10 },
    description: '+10% combat strength when defending',
  },
  // Tier 2
  {
    id: 'battlecry_2' as PromotionId,
    name: 'Battlecry II',
    path: 'combat',
    tier: 2,
    prerequisite: 'battlecry_1' as PromotionId,
    effect: { type: 'attack_bonus', percent: 20 },
    description: '+20% combat strength when attacking',
  },
  {
    id: 'defender_2' as PromotionId,
    name: 'Defender II',
    path: 'combat',
    tier: 2,
    prerequisite: 'defender_1' as PromotionId,
    effect: { type: 'defense_bonus', percent: 20 },
    description: '+20% combat strength when defending',
  },
  {
    id: 'first_strike' as PromotionId,
    name: 'First Strike',
    path: 'combat',
    tier: 2,
    prerequisite: 'battlecry_1' as PromotionId,
    effect: { type: 'first_strike' },
    description: 'Attack before the defender can retaliate',
  },
  // Tier 3
  {
    id: 'battlecry_3' as PromotionId,
    name: 'Battlecry III',
    path: 'combat',
    tier: 3,
    prerequisite: 'battlecry_2' as PromotionId,
    effect: { type: 'attack_bonus', percent: 30 },
    description: '+30% combat strength when attacking',
  },
  {
    id: 'defender_3' as PromotionId,
    name: 'Defender III',
    path: 'combat',
    tier: 3,
    prerequisite: 'defender_2' as PromotionId,
    effect: { type: 'defense_bonus', percent: 30 },
    description: '+30% combat strength when defending',
  },
]

// =============================================================================
// Mobility Path - Movement and terrain bonuses
// =============================================================================

const MOBILITY_PATH: PromotionDefinition[] = [
  // Tier 1
  {
    id: 'swift_1' as PromotionId,
    name: 'Swift I',
    path: 'mobility',
    tier: 1,
    effect: { type: 'movement_bonus', amount: 1 },
    description: '+1 Movement point',
  },
  // Tier 2
  {
    id: 'swift_2' as PromotionId,
    name: 'Swift II',
    path: 'mobility',
    tier: 2,
    prerequisite: 'swift_1' as PromotionId,
    effect: { type: 'movement_bonus', amount: 2 },
    description: '+2 Movement points',
  },
  {
    id: 'pathfinder' as PromotionId,
    name: 'Pathfinder',
    path: 'mobility',
    tier: 2,
    prerequisite: 'swift_1' as PromotionId,
    effect: { type: 'ignore_terrain' },
    description: 'Ignore terrain movement costs',
  },
  // Tier 3
  {
    id: 'blitz' as PromotionId,
    name: 'Blitz',
    path: 'mobility',
    tier: 3,
    prerequisite: 'swift_2' as PromotionId,
    effect: { type: 'movement_bonus', amount: 3 },
    description: '+3 Movement points, can attack after moving',
  },
]

// =============================================================================
// Survival Path - Healing and endurance
// =============================================================================

const SURVIVAL_PATH: PromotionDefinition[] = [
  // Tier 1
  {
    id: 'regeneration' as PromotionId,
    name: 'Regeneration',
    path: 'survival',
    tier: 1,
    effect: { type: 'heal_per_turn', amount: 5 },
    description: 'Heal +5 HP per turn even when moving',
  },
  // Tier 2
  {
    id: 'last_stand' as PromotionId,
    name: 'Last Stand',
    path: 'survival',
    tier: 2,
    prerequisite: 'regeneration' as PromotionId,
    effect: { type: 'low_health_bonus', percent: 25, threshold: 50 },
    description: '+25% combat strength when below 50% HP',
  },
  {
    id: 'medic' as PromotionId,
    name: 'Medic',
    path: 'survival',
    tier: 2,
    prerequisite: 'regeneration' as PromotionId,
    effect: { type: 'adjacent_heal', amount: 5 },
    description: 'Adjacent friendly units heal +5 HP per turn',
  },
  // Tier 3
  {
    id: 'immortal' as PromotionId,
    name: 'Immortal',
    path: 'survival',
    tier: 3,
    prerequisite: 'last_stand' as PromotionId,
    effect: { type: 'heal_per_turn', amount: 10 },
    description: 'Heal +10 HP per turn, even in combat',
  },
  {
    id: 'field_hospital' as PromotionId,
    name: 'Field Hospital',
    path: 'survival',
    tier: 3,
    prerequisite: 'medic' as PromotionId,
    effect: { type: 'adjacent_heal', amount: 10 },
    description: 'Adjacent friendly units heal +10 HP per turn',
  },
]

// =============================================================================
// Special Promotions (for ranged/cavalry units)
// =============================================================================

const SPECIAL_PROMOTIONS: PromotionDefinition[] = [
  {
    id: 'volley' as PromotionId,
    name: 'Volley',
    path: 'combat',
    tier: 1,
    effect: { type: 'ranged_bonus', percent: 15 },
    description: '+15% ranged combat strength',
  },
  {
    id: 'accuracy' as PromotionId,
    name: 'Accuracy',
    path: 'combat',
    tier: 2,
    prerequisite: 'volley' as PromotionId,
    effect: { type: 'ranged_bonus', percent: 30 },
    description: '+30% ranged combat strength',
  },
  {
    id: 'anti_cavalry' as PromotionId,
    name: 'Anti-Cavalry',
    path: 'combat',
    tier: 1,
    effect: { type: 'anti_cavalry', percent: 50 },
    description: '+50% combat strength vs cavalry units',
  },
]

// =============================================================================
// All Promotions
// =============================================================================

export const ALL_PROMOTIONS: PromotionDefinition[] = [
  ...COMBAT_PATH,
  ...MOBILITY_PATH,
  ...SURVIVAL_PATH,
  ...SPECIAL_PROMOTIONS,
]

export const PROMOTION_MAP: Map<PromotionId, PromotionDefinition> = new Map(
  ALL_PROMOTIONS.map((p) => [p.id, p])
)

// =============================================================================
// Promotion Queries
// =============================================================================

/**
 * Gets a promotion by ID
 */
export function getPromotion(id: PromotionId): PromotionDefinition | undefined {
  return PROMOTION_MAP.get(id)
}

/**
 * Gets all promotions for a path
 */
export function getPromotionsByPath(path: PromotionPath): PromotionDefinition[] {
  return ALL_PROMOTIONS.filter((p) => p.path === path)
}

/**
 * Gets available promotions for a unit
 */
export function getAvailablePromotions(unit: Unit): PromotionDefinition[] {
  const available: PromotionDefinition[] = []

  for (const promotion of ALL_PROMOTIONS) {
    // Skip if already has this promotion
    if (unit.promotions.includes(promotion.id)) continue

    // Check prerequisite
    if (promotion.prerequisite) {
      if (!unit.promotions.includes(promotion.prerequisite)) continue
    }

    // Check tier (can only get tier N if have tier N-1 in same path, or it's tier 1)
    if (promotion.tier === 1) {
      available.push(promotion)
    } else {
      // Check if has any promotion from same path with tier - 1
      const hasPrereqTier = unit.promotions.some((pid) => {
        const p = PROMOTION_MAP.get(pid)
        return p && p.path === promotion.path && p.tier === promotion.tier - 1
      })
      if (hasPrereqTier || promotion.prerequisite) {
        // Prerequisite already checked above
        if (promotion.prerequisite && unit.promotions.includes(promotion.prerequisite)) {
          available.push(promotion)
        }
      }
    }
  }

  return available
}

/**
 * Checks if a unit has a specific promotion
 */
export function hasPromotion(unit: Unit, promotionId: PromotionId): boolean {
  return unit.promotions.includes(promotionId)
}

// =============================================================================
// Promotion Effect Calculation
// =============================================================================

/**
 * Calculates total attack bonus from promotions
 */
export function getPromotionAttackBonus(unit: Unit): number {
  let bonus = 0

  for (const pid of unit.promotions) {
    const promotion = PROMOTION_MAP.get(pid)
    if (promotion?.effect.type === 'attack_bonus') {
      bonus += promotion.effect.percent
    }
  }

  return bonus
}

/**
 * Calculates total defense bonus from promotions
 */
export function getPromotionDefenseBonus(unit: Unit): number {
  let bonus = 0

  for (const pid of unit.promotions) {
    const promotion = PROMOTION_MAP.get(pid)
    if (promotion?.effect.type === 'defense_bonus') {
      bonus += promotion.effect.percent
    }
  }

  return bonus
}

/**
 * Calculates total movement bonus from promotions
 */
export function getPromotionMovementBonus(unit: Unit): number {
  let bonus = 0

  for (const pid of unit.promotions) {
    const promotion = PROMOTION_MAP.get(pid)
    if (promotion?.effect.type === 'movement_bonus') {
      bonus += promotion.effect.amount
    }
  }

  return bonus
}

/**
 * Checks if unit ignores terrain costs
 */
export function ignoresTerrainCosts(unit: Unit): boolean {
  return unit.promotions.some((pid) => {
    const promotion = PROMOTION_MAP.get(pid)
    return promotion?.effect.type === 'ignore_terrain'
  })
}

/**
 * Calculates healing bonus from promotions
 */
export function getPromotionHealingBonus(unit: Unit): number {
  let bonus = 0

  for (const pid of unit.promotions) {
    const promotion = PROMOTION_MAP.get(pid)
    if (promotion?.effect.type === 'heal_per_turn') {
      bonus += promotion.effect.amount
    }
  }

  return bonus
}

/**
 * Checks if unit has first strike ability
 */
export function hasFirstStrike(unit: Unit): boolean {
  return unit.promotions.some((pid) => {
    const promotion = PROMOTION_MAP.get(pid)
    return promotion?.effect.type === 'first_strike'
  })
}

/**
 * Gets low health combat bonus if applicable
 */
export function getLowHealthBonus(unit: Unit): number {
  const healthPercent = (unit.health / unit.maxHealth) * 100

  for (const pid of unit.promotions) {
    const promotion = PROMOTION_MAP.get(pid)
    if (promotion?.effect.type === 'low_health_bonus') {
      if (healthPercent <= promotion.effect.threshold) {
        return promotion.effect.percent
      }
    }
  }

  return 0
}

/**
 * Gets adjacent unit healing amount
 */
export function getAdjacentHealAmount(unit: Unit): number {
  let amount = 0

  for (const pid of unit.promotions) {
    const promotion = PROMOTION_MAP.get(pid)
    if (promotion?.effect.type === 'adjacent_heal') {
      amount = Math.max(amount, promotion.effect.amount)
    }
  }

  return amount
}

// =============================================================================
// Apply Promotion
// =============================================================================

/**
 * Applies a promotion to a unit
 */
export function applyPromotion(unit: Unit, promotionId: PromotionId): Unit | null {
  const promotion = PROMOTION_MAP.get(promotionId)
  if (!promotion) return null

  // Check if already has it
  if (unit.promotions.includes(promotionId)) return null

  // Check prerequisite
  if (promotion.prerequisite && !unit.promotions.includes(promotion.prerequisite)) {
    return null
  }

  // Apply the promotion
  let updatedUnit: Unit = {
    ...unit,
    promotions: [...unit.promotions, promotionId],
  }

  // Apply immediate effects (like movement bonus)
  if (promotion.effect.type === 'movement_bonus') {
    updatedUnit = {
      ...updatedUnit,
      maxMovement: updatedUnit.maxMovement + promotion.effect.amount,
      movementRemaining: updatedUnit.movementRemaining + promotion.effect.amount,
    }
  }

  return updatedUnit
}
