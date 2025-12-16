// Cultures system - governance, policy cards, and slot management

import type {
  GameState,
  Culture,
  CultureId,
  TechId,
  TribeId,
  PolicyId,
  PolicyCard,
  PolicySlotType,
  PolicySlots,
  PlayerPolicies,
  Era,
  Player,
} from '../types'

// =============================================================================
// Policy Card Definitions
// =============================================================================

function createPolicy(
  id: string,
  name: string,
  description: string,
  cultureId: string,
  choice: 'a' | 'b',
  slotType: PolicySlotType,
  effectType: string,
  effectData: Record<string, unknown> = {}
): PolicyCard {
  return {
    id: id as PolicyId,
    name,
    description,
    cultureId: cultureId as CultureId,
    choice,
    slotType,
    effect: { type: effectType, ...effectData },
  }
}

// =============================================================================
// Culture Definitions (placeholder - needs update to match CULTURES.md)
// =============================================================================

export const CULTURE_DEFINITIONS: Record<string, Culture> = {
  // Era 1: Tribal Age (15-35 Vibes)
  community: {
    id: 'community' as CultureId,
    name: 'Community',
    era: 1,
    cost: 15,
    prerequisites: { cultures: [], techs: [] },
    policyChoices: [
      createPolicy('governance', 'Governance', '+2 Vibes in capital', 'community', 'a', 'progress', 'capital_vibes', { amount: 2 }),
      createPolicy('discipline', 'Discipline', '+5 unit healing per turn', 'community', 'b', 'military', 'unit_healing', { amount: 5 }),
    ],
    slotUnlocks: { wildcard: 1 },
  },
  otc_trading: {
    id: 'otc_trading' as CultureId,
    name: 'OTC Trading',
    era: 1,
    cost: 20,
    prerequisites: { cultures: [], techs: [] },
    policyChoices: [
      createPolicy('escrow', 'Escrow', '+2 Gold from trade routes', 'otc_trading', 'a', 'economy', 'trade_gold', { amount: 2 }),
      createPolicy('broker', 'Broker', '+10% Gold from all sources', 'otc_trading', 'b', 'economy', 'gold_percent', { percent: 10 }),
    ],
    slotUnlocks: { economy: 1 },
  },
  influence: {
    id: 'influence' as CultureId,
    name: 'Influence',
    era: 1,
    cost: 20,
    prerequisites: { cultures: [], techs: [] },
    policyChoices: [
      createPolicy('clout', 'Clout', '65% chance of earning great people at thresholds', 'influence', 'a', 'wildcard', 'great_people_chance', { percent: 65 }),
      createPolicy('networking', 'Networking', '+1 Gold per ally', 'influence', 'b', 'economy', 'ally_gold', { amount: 1 }),
    ],
    slotUnlocks: { military: 1 },
  },
  builder_culture: {
    id: 'builder_culture' as CultureId,
    name: 'Builder Culture',
    era: 1,
    cost: 25,
    prerequisites: { cultures: ['community' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('craftsmanship', 'Craftsmanship', '+15% Production for buildings', 'builder_culture', 'a', 'wildcard', 'production_buildings', { percent: 15 }),
      createPolicy('grind', 'Grind', '+1 Production in all settlements', 'builder_culture', 'b', 'wildcard', 'settlement_production', { amount: 1 }),
    ],
    slotUnlocks: { progress: 1 },
  },
  degen_culture: {
    id: 'degen_culture' as CultureId,
    name: 'Degen Culture',
    era: 1,
    cost: 25,
    prerequisites: { cultures: ['community' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('full_send', 'Full Send', '+10% combat strength, -5% defense', 'degen_culture', 'a', 'military', 'aggressive_combat', { attack: 10, defense: -5 }),
      createPolicy('ape_in', 'Ape In', '+20% Production when behind in score', 'degen_culture', 'b', 'wildcard', 'catchup_production', { percent: 20 }),
    ],
  },
  social_media: {
    id: 'social_media' as CultureId,
    name: 'Social Media',
    era: 1,
    cost: 25,
    prerequisites: { cultures: ['influence' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('followers', 'Followers', '+1 Vibes per population', 'social_media', 'a', 'progress', 'pop_vibes', { amount: 1 }),
      createPolicy('engagement', 'Engagement', '+15% Vibes generation', 'social_media', 'b', 'progress', 'vibes_percent', { percent: 15 }),
    ],
  },
  memeing: {
    id: 'memeing' as CultureId,
    name: 'Memeing',
    era: 1,
    cost: 25,
    prerequisites: { cultures: ['influence' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('shitposting', 'Shitposting', 'Enemy units in your territory -1 combat strength', 'memeing', 'a', 'military', 'territory_debuff', { amount: -1 }),
      createPolicy('good_vibes', 'Good Vibes', '+1 Vibes per settlement', 'memeing', 'b', 'progress', 'settlement_vibes', { amount: 1 }),
    ],
  },
  early_adopters: {
    id: 'early_adopters' as CultureId,
    name: 'Early Adopters',
    era: 1,
    cost: 30,
    prerequisites: { cultures: ['otc_trading' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('first_mover', 'First Mover', '+10 Gold on discovery', 'early_adopters', 'a', 'economy', 'discovery_gold', { amount: 10 }),
      createPolicy('scout_bonus', 'Scout Bonus', '+1 Scout vision', 'early_adopters', 'b', 'military', 'scout_vision', { amount: 1 }),
    ],
  },
  diamond_hands: {
    id: 'diamond_hands' as CultureId,
    name: 'Diamond Hands',
    era: 1,
    cost: 35,
    prerequisites: { cultures: ['early_adopters' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('hodl', 'HODL', 'Units +25% defense below 50% HP', 'diamond_hands', 'a', 'military', 'low_health_defense', { percent: 25, threshold: 50 }),
      createPolicy('paper_hands', 'Paper Hands', '-50% war weariness', 'diamond_hands', 'b', 'wildcard', 'war_weariness', { percent: -50 }),
    ],
  },

  // Era 2: Classical Age (45-70 Vibes)
  alpha_daos: {
    id: 'alpha_daos' as CultureId,
    name: 'Alpha DAOs',
    era: 2,
    cost: 50,
    prerequisites: { cultures: ['otc_trading' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('big_addition', 'Big Addition', '80% chance of earning great people at thresholds', 'alpha_daos', 'a', 'wildcard', 'great_people_chance', { percent: 80 }),
      createPolicy('treasury', 'Treasury', '+2 Trade Route capacity', 'alpha_daos', 'b', 'economy', 'trade_capacity', { amount: 2 }),
    ],
  },

  // Era 3: Renaissance Age (80-120 Vibes)
  one_of_ones: {
    id: 'one_of_ones' as CultureId,
    name: '1 of 1s',
    era: 3,
    cost: 85,
    prerequisites: { cultures: ['whitelisting' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('unique_art', 'Unique Art', '+3 Vibes per wonder', 'one_of_ones', 'a', 'progress', 'wonder_vibes', { amount: 3 }),
      createPolicy('collector', 'Collector', '100% chance of earning great people at thresholds', 'one_of_ones', 'b', 'wildcard', 'great_people_chance', { percent: 100 }),
    ],
  },

  whitelisting: {
    id: 'whitelisting' as CultureId,
    name: 'Whitelisting',
    era: 2,
    cost: 45,
    prerequisites: { cultures: ['early_adopters' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('exclusive_access', 'Exclusive Access', '+10% Gold from improvements', 'whitelisting', 'a', 'economy', 'improvement_gold', { percent: 10 }),
      createPolicy('vip_list', 'VIP List', 'Alliance cost -25%', 'whitelisting', 'b', 'wildcard', 'alliance_discount', { percent: 25 }),
    ],
    slotUnlocks: { progress: 1 },
  },
}

export const ALL_CULTURES: Culture[] = Object.values(CULTURE_DEFINITIONS)

export const CULTURE_MAP: Map<CultureId, Culture> = new Map(
  ALL_CULTURES.map((c) => [c.id, c])
)

// Build policy map from all cultures
const allPolicies: PolicyCard[] = ALL_CULTURES.flatMap((c) => c.policyChoices)
export const POLICY_MAP: Map<PolicyId, PolicyCard> = new Map(
  allPolicies.map((p) => [p.id, p])
)

// =============================================================================
// Culture Queries
// =============================================================================

/**
 * Gets a culture by ID
 */
export function getCulture(id: CultureId): Culture | undefined {
  return CULTURE_MAP.get(id)
}

/**
 * Gets a policy card by ID
 */
export function getPolicy(id: PolicyId): PolicyCard | undefined {
  return POLICY_MAP.get(id)
}

/**
 * Gets all cultures for an era
 */
export function getCulturesByEra(era: Era): Culture[] {
  return ALL_CULTURES.filter((c) => c.era === era)
}

/**
 * Checks if a player has unlocked a culture
 */
export function hasUnlockedCulture(player: Player, cultureId: CultureId): boolean {
  return player.unlockedCultures.includes(cultureId)
}

/**
 * Checks if a player has researched a tech (for cross-prerequisites)
 */
export function hasResearchedTech(player: Player, techId: TechId): boolean {
  return player.researchedTechs.includes(techId)
}

/**
 * Checks if prerequisites are met for a culture
 */
export function canUnlockCulture(player: Player, cultureId: CultureId): { canUnlock: boolean; reason?: string } {
  const culture = getCulture(cultureId)
  if (!culture) {
    return { canUnlock: false, reason: 'Culture not found' }
  }

  // Already unlocked
  if (hasUnlockedCulture(player, cultureId)) {
    return { canUnlock: false, reason: 'Already unlocked' }
  }

  // Check culture prerequisites
  for (const prereqCultureId of culture.prerequisites.cultures) {
    if (!hasUnlockedCulture(player, prereqCultureId)) {
      const prereqCulture = getCulture(prereqCultureId)
      return { canUnlock: false, reason: `Requires culture: ${prereqCulture?.name || prereqCultureId}` }
    }
  }

  // Check tech prerequisites (cross-tree)
  for (const prereqTechId of culture.prerequisites.techs) {
    if (!hasResearchedTech(player, prereqTechId)) {
      return { canUnlock: false, reason: `Requires tech: ${prereqTechId}` }
    }
  }

  return { canUnlock: true }
}

/**
 * Gets all available cultures for a player
 */
export function getAvailableCultures(player: Player): Culture[] {
  return ALL_CULTURES.filter((culture) => {
    const result = canUnlockCulture(player, culture.id)
    return result.canUnlock
  })
}

// =============================================================================
// Culture Progress
// =============================================================================

/**
 * Starts working on a culture
 */
export function startCulture(state: GameState, tribeId: TribeId, cultureId: CultureId): GameState | null {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return null

  const player = state.players[playerIndex]!
  const result = canUnlockCulture(player, cultureId)
  if (!result.canUnlock) return null

  const updatedPlayer: Player = {
    ...player,
    currentCulture: cultureId,
    cultureProgress: 0,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

/**
 * Adds culture progress from Vibes yield
 */
export function addCultureProgress(state: GameState, tribeId: TribeId, amount: number): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  if (!player.currentCulture) return state

  const culture = getCulture(player.currentCulture)
  if (!culture) return state

  const newProgress = player.cultureProgress + amount

  // Check if culture complete (but don't auto-complete, need policy choice)
  if (newProgress >= culture.cost) {
    // Mark as ready for completion (player must choose policy)
    const updatedPlayer: Player = {
      ...player,
      cultureProgress: culture.cost, // Cap at cost
    }

    const newPlayers = [...state.players]
    newPlayers[playerIndex] = updatedPlayer

    return { ...state, players: newPlayers }
  }

  const updatedPlayer: Player = {
    ...player,
    cultureProgress: newProgress,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

/**
 * Checks if a culture is ready for completion (player must choose policy)
 */
export function isCultureReadyForCompletion(player: Player): boolean {
  if (!player.currentCulture) return false

  const culture = getCulture(player.currentCulture)
  if (!culture) return false

  return player.cultureProgress >= culture.cost
}

/**
 * Completes a culture with a policy choice
 */
export function completeCulture(
  state: GameState,
  tribeId: TribeId,
  policyChoice: 'a' | 'b'
): GameState | null {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return null

  const player = state.players[playerIndex]!
  if (!player.currentCulture) return null

  const culture = getCulture(player.currentCulture)
  if (!culture) return null

  if (player.cultureProgress < culture.cost) return null

  // Get chosen policy
  const chosenPolicy = policyChoice === 'a' ? culture.policyChoices[0] : culture.policyChoices[1]

  // Update player policies with slot unlocks
  const newSlots: PolicySlots = culture.slotUnlocks
    ? {
        military: player.policies.slots.military + (culture.slotUnlocks.military || 0),
        economy: player.policies.slots.economy + (culture.slotUnlocks.economy || 0),
        progress: player.policies.slots.progress + (culture.slotUnlocks.progress || 0),
        wildcard: player.policies.slots.wildcard + (culture.slotUnlocks.wildcard || 0),
      }
    : player.policies.slots

  const newPolicies: PlayerPolicies = {
    slots: newSlots,
    pool: [...player.policies.pool, chosenPolicy.id],
    active: player.policies.active,
  }

  // Build updated player without setting undefined explicitly
  const { currentCulture: _, ...playerWithoutCurrentCulture } = player
  const updatedPlayer: Player = {
    ...playerWithoutCurrentCulture,
    unlockedCultures: [...player.unlockedCultures, culture.id],
    cultureProgress: 0,
    policies: newPolicies,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

// =============================================================================
// Policy Slot Management
// =============================================================================

/**
 * Gets initial policy slots
 */
export function getInitialPolicySlots(): PolicySlots {
  return {
    military: 1,
    economy: 1,
    progress: 0,
    wildcard: 0,
  }
}

/**
 * Gets total available slots for a slot type
 */
export function getAvailableSlotCount(policies: PlayerPolicies, slotType: PolicySlotType): number {
  return policies.slots[slotType]
}

/**
 * Gets count of active policies in a slot type
 */
export function getActiveSlotCount(policies: PlayerPolicies, slotType: PolicySlotType): number {
  let count = 0
  for (const policyId of policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.slotType === slotType) count++
  }
  return count
}

/**
 * Checks if a policy can be slotted
 */
export function canSlotPolicy(
  policies: PlayerPolicies,
  policyId: PolicyId
): { canSlot: boolean; reason?: string } {
  const policy = getPolicy(policyId)
  if (!policy) {
    return { canSlot: false, reason: 'Policy not found' }
  }

  // Must be in pool
  if (!policies.pool.includes(policyId)) {
    return { canSlot: false, reason: 'Policy not unlocked' }
  }

  // Already active
  if (policies.active.includes(policyId)) {
    return { canSlot: false, reason: 'Policy already active' }
  }

  // Check slot availability
  const slotType = policy.slotType
  const available = policies.slots[slotType]
  const used = getActiveSlotCount(policies, slotType)

  // Check wildcard if specific slot is full
  if (used >= available) {
    // Try wildcard
    const wildcardAvailable = policies.slots.wildcard
    const wildcardUsed = getActiveSlotCount(policies, 'wildcard')

    if (wildcardUsed >= wildcardAvailable) {
      return { canSlot: false, reason: `No ${slotType} or wildcard slots available` }
    }
  }

  return { canSlot: true }
}

/**
 * Slots a policy (during culture completion swap window)
 */
export function slotPolicy(policies: PlayerPolicies, policyId: PolicyId): PlayerPolicies | null {
  const result = canSlotPolicy(policies, policyId)
  if (!result.canSlot) return null

  return {
    ...policies,
    active: [...policies.active, policyId],
  }
}

/**
 * Unslots a policy
 */
export function unslotPolicy(policies: PlayerPolicies, policyId: PolicyId): PlayerPolicies | null {
  if (!policies.active.includes(policyId)) return null

  return {
    ...policies,
    active: policies.active.filter((id) => id !== policyId),
  }
}

/**
 * Calculates the GP spawn chance bonus from active policies
 * Returns the bonus percentage to add to the base 50% chance
 */
export function calculateGPSpawnChanceBonus(policies: PlayerPolicies): number {
  let highestChance = 50 // Base chance

  for (const policyId of policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'great_people_chance') {
      const policyChance = policy.effect.percent as number
      if (typeof policyChance === 'number' && policyChance > highestChance) {
        highestChance = policyChance
      }
    }
  }

  // Return the bonus (amount above base 50%)
  return highestChance - 50
}

/**
 * Swaps policies during culture completion
 */
export function swapPolicies(
  state: GameState,
  tribeId: TribeId,
  toSlot: PolicyId[],
  toUnslot: PolicyId[]
): GameState | null {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return null

  const player = state.players[playerIndex]!
  let policies = { ...player.policies }

  // First unslot
  for (const policyId of toUnslot) {
    const result = unslotPolicy(policies, policyId)
    if (!result) return null
    policies = result
  }

  // Then slot new ones
  for (const policyId of toSlot) {
    const result = slotPolicy(policies, policyId)
    if (!result) return null
    policies = result
  }

  // Calculate new GP spawn chance bonus based on active policies
  const gpSpawnChanceBonus = calculateGPSpawnChanceBonus(policies)

  const updatedPlayer: Player = {
    ...player,
    policies,
    greatPeople: {
      ...player.greatPeople,
      spawnChanceBonus: gpSpawnChanceBonus,
    },
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

// =============================================================================
// Culture Queries
// =============================================================================

/**
 * Gets culture progress as percentage
 */
export function getCultureProgress(player: Player): { current: number; total: number; percent: number } | null {
  if (!player.currentCulture) return null

  const culture = getCulture(player.currentCulture)
  if (!culture) return null

  return {
    current: player.cultureProgress,
    total: culture.cost,
    percent: Math.floor((player.cultureProgress / culture.cost) * 100),
  }
}

/**
 * Gets turns remaining for current culture
 */
export function getTurnsToCompleteCulture(player: Player): number | null {
  if (!player.currentCulture) return null

  const culture = getCulture(player.currentCulture)
  if (!culture) return null

  const remaining = culture.cost - player.cultureProgress
  const vibesPerTurn = player.yields.vibes

  if (vibesPerTurn <= 0) return Infinity

  return Math.ceil(remaining / vibesPerTurn)
}

/**
 * Gets the current culture era for a player
 */
export function getCurrentCultureEra(player: Player): Era {
  let maxEra: Era = 1

  for (const cultureId of player.unlockedCultures) {
    const culture = getCulture(cultureId)
    if (culture && culture.era > maxEra) {
      maxEra = culture.era
    }
  }

  return maxEra
}
