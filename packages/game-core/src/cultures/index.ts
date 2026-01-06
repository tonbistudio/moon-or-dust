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
// Culture Definitions (matches CULTURES.md)
// =============================================================================

export const CULTURE_DEFINITIONS: Record<string, Culture> = {
  // =========================================================================
  // Era 1: Tribal Age (15-35 Vibes) - 9 cultures
  // =========================================================================
  community: {
    id: 'community' as CultureId,
    name: 'Community',
    era: 1,
    cost: 15,
    prerequisites: { cultures: [], techs: [] },
    policyChoices: [
      createPolicy('welcome_party', 'Welcome Party', '+2 Vibes in capital', 'community', 'a', 'progress', 'capital_vibes', { amount: 2 }),
      createPolicy('strong_together', 'Strong Together', '+5 unit healing per turn', 'community', 'b', 'military', 'unit_healing', { amount: 5 }),
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
      createPolicy('foxy_swap', 'Foxy Swap', '+2 Gold from trade routes', 'otc_trading', 'a', 'economy', 'trade_gold', { amount: 2 }),
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
      createPolicy('kol_status', 'KOL Status', '+5 Gold base, +3 Gold per ally', 'influence', 'b', 'economy', 'ally_gold', { base: 5, perAlly: 3 }),
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
      createPolicy('ape_in', 'Ape In', '+10% Production (+20% when behind in score)', 'degen_culture', 'b', 'wildcard', 'scaling_production', { base: 10, behind: 20 }),
    ],
  },
  social_media: {
    id: 'social_media' as CultureId,
    name: 'Social Media',
    era: 1,
    cost: 25,
    prerequisites: { cultures: ['influence' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('banger_post', 'Banger Post', '+2 Vibes per population level in capital', 'social_media', 'a', 'progress', 'pop_vibes', { amount: 2 }),
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
      createPolicy('four_chan', '4-chan', '+1 Vibes per settlement', 'memeing', 'b', 'progress', 'settlement_vibes', { amount: 1 }),
    ],
  },
  early_adopters: {
    id: 'early_adopters' as CultureId,
    name: 'Early Adopters',
    era: 1,
    cost: 30,
    prerequisites: { cultures: ['otc_trading' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('first_mover', 'First Mover', '+1 trade route capacity', 'early_adopters', 'a', 'economy', 'trade_capacity', { amount: 1 }),
      createPolicy('recon', 'Recon', '+1 vision for all units', 'early_adopters', 'b', 'military', 'unit_vision', { amount: 1 }),
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
      createPolicy('exit_strategy', 'Exit Strategy', 'Units heal +10 HP when in friendly territory', 'diamond_hands', 'b', 'wildcard', 'friendly_healing', { amount: 10 }),
    ],
  },

  // =========================================================================
  // Era 2: Classical Age (45-70 Vibes) - 10 cultures
  // =========================================================================
  gm: {
    id: 'gm' as CultureId,
    name: 'GM',
    era: 2,
    cost: 45,
    prerequisites: { cultures: ['community' as CultureId, 'influence' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('wagmi', 'WAGMI', '+2 Vibes in all settlements', 'gm', 'a', 'progress', 'settlement_vibes', { amount: 2 }),
      createPolicy('gn', 'GN', '+3 Vibes per Friendly or Allied tribe', 'gm', 'b', 'wildcard', 'friendly_vibes', { amount: 3 }),
    ],
  },
  whitelisting: {
    id: 'whitelisting' as CultureId,
    name: 'Whitelisting',
    era: 2,
    cost: 45,
    prerequisites: { cultures: ['early_adopters' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('double_og', 'Double OG', '+10% Gold from improvements', 'whitelisting', 'a', 'economy', 'improvement_gold', { percent: 10 }),
      createPolicy('inner_circle', 'Inner Circle', '+2 Trade routes with Friendly or Allied tribes', 'whitelisting', 'b', 'wildcard', 'friendly_trade', { amount: 2 }),
    ],
    slotUnlocks: { progress: 1 },
  },
  alpha_daos: {
    id: 'alpha_daos' as CultureId,
    name: 'Alpha DAOs',
    era: 2,
    cost: 50,
    prerequisites: { cultures: ['otc_trading' as CultureId, 'community' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('big_addition', 'Big Addition', '80% chance of earning great people at thresholds', 'alpha_daos', 'a', 'wildcard', 'great_people_chance', { percent: 80 }),
      createPolicy('networking', 'Networking', '+2 Trade Route capacity', 'alpha_daos', 'b', 'economy', 'trade_capacity', { amount: 2 }),
    ],
  },
  follow_for_follow: {
    id: 'follow_for_follow' as CultureId,
    name: 'Follow for Follow',
    era: 2,
    cost: 50,
    prerequisites: { cultures: ['gm' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('mutual_support', 'Mutual Support', 'Adjacent friendly units heal +3 HP/turn', 'follow_for_follow', 'a', 'military', 'adjacent_healing', { amount: 3 }),
      createPolicy('community_building', 'Community Building', '+1 Population when settling', 'follow_for_follow', 'b', 'wildcard', 'settle_population', { amount: 1 }),
    ],
  },
  fudding: {
    id: 'fudding' as CultureId,
    name: 'Fudding',
    era: 2,
    cost: 55,
    prerequisites: { cultures: ['influence' as CultureId, 'memeing' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('fud_campaign', 'FUD Campaign', 'Enemy units -1 combat strength when attacking you', 'fudding', 'a', 'military', 'defender_debuff', { amount: -1 }),
      createPolicy('dev_asleep', 'Dev Asleep?', 'Enemies at war with you have -33% defense', 'fudding', 'b', 'wildcard', 'war_defense_debuff', { percent: 33 }),
    ],
  },
  virality: {
    id: 'virality' as CultureId,
    name: 'Virality',
    era: 2,
    cost: 55,
    prerequisites: { cultures: ['social_media' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('100k_likes', '100k Likes', '+30% wonder production speed', 'virality', 'a', 'progress', 'wonder_production', { percent: 30 }),
      createPolicy('retweet_bonanza', 'Retweet Bonanza', 'Golden Ages last 4 turns instead of 3', 'virality', 'b', 'wildcard', 'golden_age_duration', { turns: 4 }),
    ],
    slotUnlocks: { wildcard: 1 },
  },
  defensive_tactics: {
    id: 'defensive_tactics' as CultureId,
    name: 'Defensive Tactics',
    era: 2,
    cost: 60,
    prerequisites: { cultures: ['fudding' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('diamond_formation', 'Diamond Formation', '+100% production for wall buildings', 'defensive_tactics', 'a', 'wildcard', 'wall_production', { percent: 100 }),
      createPolicy('fortify', 'Fortify', '+25% defense in owned territory', 'defensive_tactics', 'b', 'military', 'territory_defense', { percent: 25 }),
    ],
    slotUnlocks: { military: 1 },
  },
  degen_minting: {
    id: 'degen_minting' as CultureId,
    name: 'Degen Minting',
    era: 2,
    cost: 60,
    prerequisites: { cultures: ['alpha_daos' as CultureId, 'degen_culture' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('fomo', 'FOMO', '+15% Production (+25% when behind in score)', 'degen_minting', 'a', 'wildcard', 'scaling_production', { base: 15, behind: 25 }),
      createPolicy('yolo', 'YOLO', 'Units +15% attack, -10% defense', 'degen_minting', 'b', 'military', 'aggressive_combat', { attack: 15, defense: -10 }),
    ],
    slotUnlocks: { economy: 1 },
  },
  memecoin_mania: {
    id: 'memecoin_mania' as CultureId,
    name: 'Memecoin Mania',
    era: 2,
    cost: 65,
    prerequisites: { cultures: ['memeing' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('sendu', 'SENDU', '+5 Gold per culture unlocked', 'memecoin_mania', 'a', 'economy', 'culture_gold_flat', { amount: 5 }),
      createPolicy('the_ticker_is', 'The Ticker Is', '+2 Vibes per enemy unit killed', 'memecoin_mania', 'b', 'progress', 'kill_vibes', { amount: 2 }),
    ],
  },
  raiding: {
    id: 'raiding' as CultureId,
    name: 'Raiding',
    era: 2,
    cost: 70,
    prerequisites: { cultures: ['gm' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('reply_army', 'Reply Army', '+100% pillage damage', 'raiding', 'a', 'military', 'pillage_damage', { percent: 100 }),
      createPolicy('to_the_streets', 'To the Streets', '+2 Movement for Cavalry units', 'raiding', 'b', 'military', 'cavalry_movement', { amount: 2 }),
    ],
    slotUnlocks: { military: 1 },
  },

  // =========================================================================
  // Era 3: Renaissance Age (80-120 Vibes) - 9 cultures
  // =========================================================================
  innovation: {
    id: 'innovation' as CultureId,
    name: 'Innovation',
    era: 3,
    cost: 80,
    prerequisites: { cultures: ['whitelisting' as CultureId, 'gm' as CultureId], techs: ['priority_fees' as TechId] },
    policyChoices: [
      createPolicy('r_and_d', 'R&D', '+20% Alpha generation', 'innovation', 'a', 'progress', 'alpha_percent', { percent: 20 }),
      createPolicy('breakthrough', 'Breakthrough', 'Buildings +2 Alpha', 'innovation', 'b', 'progress', 'building_alpha', { amount: 2 }),
    ],
    slotUnlocks: { progress: 1 },
  },
  hard_shilling: {
    id: 'hard_shilling' as CultureId,
    name: 'Hard Shilling',
    era: 3,
    cost: 85,
    prerequisites: { cultures: ['virality' as CultureId, 'memecoin_mania' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('hype_train', 'Hype Train', 'Units start with 1 free promotion', 'hard_shilling', 'a', 'military', 'free_promotion', { amount: 1 }),
      createPolicy('pump_it_up', 'Pump It Up', '+5 Vibes per unit promoted', 'hard_shilling', 'b', 'progress', 'promotion_vibes', { amount: 5 }),
    ],
  },
  one_of_ones: {
    id: 'one_of_ones' as CultureId,
    name: '1 of 1s',
    era: 3,
    cost: 85,
    prerequisites: { cultures: ['whitelisting' as CultureId, 'gm' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('customs', 'Customs', '+3 Vibes per wonder', 'one_of_ones', 'a', 'progress', 'wonder_vibes', { amount: 3 }),
      createPolicy('collector', 'Collector', '90% chance of earning great people at thresholds', 'one_of_ones', 'b', 'wildcard', 'great_people_chance', { percent: 90 }),
    ],
  },
  auctions: {
    id: 'auctions' as CultureId,
    name: 'Auctions',
    era: 3,
    cost: 90,
    prerequisites: { cultures: ['alpha_daos' as CultureId, 'whitelisting' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('bidding_war', 'Bidding War', '+25% Gold income', 'auctions', 'a', 'economy', 'gold_percent', { percent: 25 }),
      createPolicy('reserve_price', 'Reserve Price', '+15 Gold income per settlement', 'auctions', 'b', 'economy', 'settlement_gold', { amount: 15 }),
    ],
  },
  presales: {
    id: 'presales' as CultureId,
    name: 'Presales',
    era: 3,
    cost: 90,
    prerequisites: { cultures: ['alpha_daos' as CultureId, 'degen_minting' as CultureId], techs: ['matrica' as TechId] },
    policyChoices: [
      createPolicy('early_access', 'Early Access', '-25% building cost', 'presales', 'a', 'economy', 'building_discount', { percent: 25 }),
      createPolicy('allocation', 'Allocation', '+3 trade route capacity', 'presales', 'b', 'wildcard', 'trade_capacity', { amount: 3 }),
    ],
    slotUnlocks: { economy: 1 },
  },
  trenching: {
    id: 'trenching' as CultureId,
    name: 'Trenching',
    era: 3,
    cost: 95,
    prerequisites: { cultures: ['memecoin_mania' as CultureId, 'virality' as CultureId], techs: ['discord' as TechId] },
    policyChoices: [
      createPolicy('in_the_trenches', 'In the Trenches', '+25% combat strength when defending', 'trenching', 'a', 'military', 'defense_bonus', { percent: 25 }),
      createPolicy('just_scanning', 'Just Scanning', '+1 Floor Price per 3 population', 'trenching', 'b', 'wildcard', 'pop_floor_price', { per: 3, amount: 1 }),
    ],
  },
  delisting: {
    id: 'delisting' as CultureId,
    name: 'Delisting',
    era: 3,
    cost: 100,
    prerequisites: { cultures: ['follow_for_follow' as CultureId, 'degen_minting' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('floor_defense', 'Floor Defense', 'Settlements +75% defense', 'delisting', 'a', 'military', 'settlement_defense', { percent: 75 }),
      createPolicy('delist_train', 'Delist Train', '+50 Gold income per wonder built', 'delisting', 'b', 'economy', 'wonder_gold', { amount: 50 }),
    ],
  },
  sweeping: {
    id: 'sweeping' as CultureId,
    name: 'Sweeping',
    era: 3,
    cost: 110,
    prerequisites: { cultures: ['degen_minting' as CultureId, 'hard_shilling' as CultureId], techs: [] },
    policyChoices: [
      createPolicy('buy_the_dip', 'Buy the Dip', '+30% Gold from trade routes', 'sweeping', 'a', 'economy', 'trade_gold_percent', { percent: 30 }),
      createPolicy('take_out_the_brooms', 'Take Out the Brooms', '+5 Floor Price per 10 tiles', 'sweeping', 'b', 'wildcard', 'tile_floor_price', { per: 10, amount: 5 }),
    ],
  },
  rugging: {
    id: 'rugging' as CultureId,
    name: 'Rugging',
    era: 3,
    cost: 120,
    prerequisites: { cultures: ['fudding' as CultureId, 'defensive_tactics' as CultureId], techs: ['hacking' as TechId] },
    policyChoices: [
      createPolicy('ate_on_that_twin', 'Ate on That, Twin', '+50% Gold from pillaging, units heal 5 HP on kill', 'rugging', 'a', 'military', 'pillage_gold_heal', { gold_percent: 50, heal: 5 }),
      createPolicy('sends_his_regards', 'Sends His Regards', '+50 Gold per enemy unit killed in your territory', 'rugging', 'b', 'wildcard', 'territory_kill_gold', { amount: 50 }),
    ],
    slotUnlocks: { wildcard: 1 },
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
 * Note: When progress >= cost, the culture is ready for completion but NOT auto-completed.
 * The UI should detect this via isCultureReadyForCompletion() and show a policy selection popup.
 */
export function addCultureProgress(state: GameState, tribeId: TribeId, amount: number): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  if (!player.currentCulture) return state

  const culture = getCulture(player.currentCulture)
  if (!culture) return state

  const newProgress = player.cultureProgress + amount

  // Update the progress in state (culture completion is handled by UI via policy selection)
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

  // Check if we can auto-slot the new policy
  // First check if there's a slot of the matching type available
  let canAutoSlot = false
  const policySlotType = chosenPolicy.slotType

  // Count active policies by type
  const activeByType: Record<PolicySlotType, number> = {
    military: 0,
    economy: 0,
    progress: 0,
    wildcard: 0,
  }
  for (const activePolicyId of player.policies.active) {
    const activePolicy = getPolicy(activePolicyId)
    if (activePolicy) {
      activeByType[activePolicy.slotType]++
    }
  }

  // Check if matching slot is available
  if (activeByType[policySlotType] < newSlots[policySlotType]) {
    canAutoSlot = true
  }
  // Check if wildcard slot is available
  else if (activeByType.wildcard < newSlots.wildcard) {
    canAutoSlot = true
  }

  const newActive = canAutoSlot
    ? [...player.policies.active, chosenPolicy.id]
    : player.policies.active

  const newPolicies: PlayerPolicies = {
    slots: newSlots,
    pool: [...player.policies.pool, chosenPolicy.id],
    active: newActive,
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
// Policy Yield Effects
// =============================================================================

export interface PolicyYieldBonuses {
  // Flat bonuses
  capitalVibes: number
  settlementVibes: number
  settlementProduction: number
  settlementGold: number
  tradeGold: number
  allyGoldBase: number
  allyGoldPerAlly: number
  cultureGoldFlat: number
  buildingAlpha: number
  friendlyVibesPerTribe: number
  popVibesPerLevel: number
  wonderGoldPerWonder: number // wonder_gold: +X gold per wonder built
  // Percentage bonuses
  goldPercent: number
  vibesPercent: number
  alphaPercent: number
  productionPercent: number // from scaling_production, ape_in, fomo
  wonderProductionPercent: number
}

/**
 * Calculates yield bonuses from active policies
 */
export function calculatePolicyYieldBonuses(_state: GameState, player: Player): PolicyYieldBonuses {
  const bonuses: PolicyYieldBonuses = {
    capitalVibes: 0,
    settlementVibes: 0,
    settlementProduction: 0,
    settlementGold: 0,
    tradeGold: 0,
    allyGoldBase: 0,
    allyGoldPerAlly: 0,
    cultureGoldFlat: 0,
    buildingAlpha: 0,
    friendlyVibesPerTribe: 0,
    popVibesPerLevel: 0,
    wonderGoldPerWonder: 0,
    goldPercent: 0,
    vibesPercent: 0,
    alphaPercent: 0,
    productionPercent: 0,
    wonderProductionPercent: 0,
  }

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (!policy) continue

    const effect = policy.effect
    switch (effect.type) {
      case 'capital_vibes':
        bonuses.capitalVibes += (effect.amount as number) ?? 0
        break
      case 'settlement_vibes':
        bonuses.settlementVibes += (effect.amount as number) ?? 0
        break
      case 'settlement_production':
        bonuses.settlementProduction += (effect.amount as number) ?? 0
        break
      case 'settlement_gold':
        bonuses.settlementGold += (effect.amount as number) ?? 0
        break
      case 'trade_gold':
        bonuses.tradeGold += (effect.amount as number) ?? 0
        break
      case 'ally_gold':
        bonuses.allyGoldBase += (effect.base as number) ?? 0
        bonuses.allyGoldPerAlly += (effect.perAlly as number) ?? 0
        break
      case 'culture_gold_flat':
        bonuses.cultureGoldFlat += (effect.amount as number) ?? 0
        break
      case 'building_alpha':
        bonuses.buildingAlpha += (effect.amount as number) ?? 0
        break
      case 'friendly_vibes':
        bonuses.friendlyVibesPerTribe += (effect.amount as number) ?? 0
        break
      case 'pop_vibes':
        bonuses.popVibesPerLevel += (effect.amount as number) ?? 0
        break
      case 'gold_percent':
        bonuses.goldPercent += (effect.percent as number) ?? 0
        break
      case 'vibes_percent':
        bonuses.vibesPercent += (effect.percent as number) ?? 0
        break
      case 'alpha_percent':
        bonuses.alphaPercent += (effect.percent as number) ?? 0
        break
      case 'scaling_production':
        // Use base production bonus (behind bonus would require score comparison)
        bonuses.productionPercent += (effect.base as number) ?? 0
        break
      case 'wonder_production':
        bonuses.wonderProductionPercent += (effect.percent as number) ?? 0
        break
      case 'wonder_gold':
        bonuses.wonderGoldPerWonder += (effect.amount as number) ?? 0
        break
    }
  }

  return bonuses
}

/**
 * Applies policy yield bonuses to base yields
 */
export function applyPolicyBonusesToYields(
  state: GameState,
  player: Player,
  baseYields: { gold: number; alpha: number; vibes: number; production: number; growth: number },
  bonuses: PolicyYieldBonuses
): { gold: number; alpha: number; vibes: number; production: number; growth: number } {
  // Count settlements for per-settlement bonuses
  let settlementCount = 0
  let capitalLevel = 1
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === player.tribeId) {
      settlementCount++
      if (settlement.isCapital) {
        capitalLevel = settlement.level
      }
    }
  }

  // Count friendly/allied tribes by parsing relation keys
  let friendlyCount = 0
  let allyCount = 0
  for (const [key, relation] of state.diplomacy.relations) {
    // Parse key format: `${tribe1}-${tribe2}` (sorted alphabetically)
    const [tribe1, tribe2] = key.split('-') as [TribeId, TribeId]
    const involvesTribe = tribe1 === player.tribeId || tribe2 === player.tribeId
    if (involvesTribe) {
      if (relation.stance === 'friendly') friendlyCount++
      if (relation.stance === 'allied') {
        allyCount++
        friendlyCount++ // Allied also counts as friendly for vibes
      }
    }
  }

  // Count buildings for building_alpha bonus
  let buildingCount = 0
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === player.tribeId) {
      buildingCount += settlement.buildings.length
    }
  }

  // Count wonders built for wonder_gold bonus
  const wonderCount = player.greatPeople.accumulator.wondersBuilt

  // Calculate flat bonuses
  let gold = baseYields.gold
  let alpha = baseYields.alpha
  let vibes = baseYields.vibes
  let production = baseYields.production
  const growth = baseYields.growth

  // Capital vibes
  vibes += bonuses.capitalVibes

  // Settlement-based bonuses
  vibes += bonuses.settlementVibes * settlementCount
  production += bonuses.settlementProduction * settlementCount
  gold += bonuses.settlementGold * settlementCount

  // Population vibes (capital level)
  vibes += bonuses.popVibesPerLevel * capitalLevel

  // Friendly/ally vibes
  vibes += bonuses.friendlyVibesPerTribe * friendlyCount

  // Ally gold
  gold += bonuses.allyGoldBase
  gold += bonuses.allyGoldPerAlly * allyCount

  // Culture gold (per culture unlocked)
  gold += bonuses.cultureGoldFlat * player.unlockedCultures.length

  // Building alpha
  alpha += bonuses.buildingAlpha * buildingCount

  // Wonder gold
  gold += bonuses.wonderGoldPerWonder * wonderCount

  // Trade route gold bonus is applied in trade route calculation, not here
  // But we track it in bonuses for that system to use

  // Apply percentage bonuses
  gold = Math.floor(gold * (1 + bonuses.goldPercent / 100))
  alpha = Math.floor(alpha * (1 + bonuses.alphaPercent / 100))
  vibes = Math.floor(vibes * (1 + bonuses.vibesPercent / 100))
  production = Math.floor(production * (1 + bonuses.productionPercent / 100))

  return { gold, alpha, vibes, production, growth }
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

// =============================================================================
// Policy Effect Calculations (Non-Combat, Non-Yield)
// =============================================================================

/**
 * Calculates vision bonus from policies (unit_vision)
 */
export function calculatePolicyVisionBonus(player: Player): number {
  let bonus = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'unit_vision') {
      bonus += (policy.effect.amount as number) ?? 0
    }
  }

  return bonus
}

/**
 * Calculates cavalry movement bonus from policies (cavalry_movement)
 */
export function calculatePolicyCavalryMovementBonus(player: Player): number {
  let bonus = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'cavalry_movement') {
      bonus += (policy.effect.amount as number) ?? 0
    }
  }

  return bonus
}

/**
 * Gets the number of free promotions from policies (free_promotion)
 */
export function getPolicyFreePromotions(player: Player): number {
  let count = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'free_promotion') {
      count += (policy.effect.amount as number) ?? 0
    }
  }

  return count
}

/**
 * Calculates vibes gained per kill from policies (kill_vibes)
 */
export function calculatePolicyKillVibes(player: Player): number {
  let vibes = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'kill_vibes') {
      vibes += (policy.effect.amount as number) ?? 0
    }
  }

  return vibes
}

/**
 * Calculates vibes gained per promotion from policies (promotion_vibes)
 */
export function calculatePolicyPromotionVibes(player: Player): number {
  let vibes = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'promotion_vibes') {
      vibes += (policy.effect.amount as number) ?? 0
    }
  }

  return vibes
}

/**
 * Calculates gold gained per kill in territory from policies (territory_kill_gold)
 */
export function calculatePolicyTerritoryKillGold(player: Player): number {
  let gold = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'territory_kill_gold') {
      gold += (policy.effect.amount as number) ?? 0
    }
  }

  return gold
}

/**
 * Calculates extra population when settling from policies (settle_population)
 */
export function calculatePolicySettlePopulation(player: Player): number {
  let pop = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'settle_population') {
      pop += (policy.effect.amount as number) ?? 0
    }
  }

  return pop
}

/**
 * Calculates floor price bonuses from policies (pop_floor_price, tile_floor_price)
 */
export function calculatePolicyFloorPriceBonus(
  player: Player,
  totalPopulation: number,
  tilesControlled: number
): number {
  let bonus = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (!policy) continue

    if (policy.effect.type === 'pop_floor_price') {
      const per = (policy.effect.per as number) ?? 1
      const amount = (policy.effect.amount as number) ?? 0
      bonus += Math.floor(totalPopulation / per) * amount
    } else if (policy.effect.type === 'tile_floor_price') {
      const per = (policy.effect.per as number) ?? 1
      const amount = (policy.effect.amount as number) ?? 0
      bonus += Math.floor(tilesControlled / per) * amount
    }
  }

  return bonus
}

/**
 * Calculates vibes from wonders from policies (wonder_vibes)
 */
export function calculatePolicyWonderVibes(player: Player, wondersBuilt: number): number {
  let vibes = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'wonder_vibes') {
      vibes += ((policy.effect.amount as number) ?? 0) * wondersBuilt
    }
  }

  return vibes
}

/**
 * Production modifiers from policies
 */
export interface PolicyProductionModifiers {
  wallProductionPercent: number       // wall_production: +100% wall production
  buildingDiscountPercent: number     // building_discount: -25% building cost
  buildingProductionPercent: number   // production_buildings: +15% building production
}

/**
 * Calculates production modifiers from policies
 */
export function calculatePolicyProductionModifiers(player: Player): PolicyProductionModifiers {
  const modifiers: PolicyProductionModifiers = {
    wallProductionPercent: 0,
    buildingDiscountPercent: 0,
    buildingProductionPercent: 0,
  }

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (!policy) continue

    switch (policy.effect.type) {
      case 'wall_production':
        modifiers.wallProductionPercent += (policy.effect.percent as number) ?? 0
        break
      case 'building_discount':
        modifiers.buildingDiscountPercent += (policy.effect.percent as number) ?? 0
        break
      case 'production_buildings':
        modifiers.buildingProductionPercent += (policy.effect.percent as number) ?? 0
        break
    }
  }

  return modifiers
}

/**
 * Calculates gold bonus from improvements from policies (improvement_gold)
 */
export function calculatePolicyImprovementGoldPercent(player: Player): number {
  let percent = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'improvement_gold') {
      percent += (policy.effect.percent as number) ?? 0
    }
  }

  return percent
}

// =============================================================================
// Trade-Related Policy Effects
// =============================================================================

/**
 * Calculates extra trade route capacity from policies (trade_capacity)
 * Policies: first_mover (+1), networking (+2), allocation (+3)
 */
export function calculatePolicyTradeCapacity(player: Player): number {
  let capacity = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'trade_capacity') {
      capacity += (policy.effect.amount as number) ?? 0
    }
  }

  return capacity
}

/**
 * Calculates extra trade routes with friendly/allied tribes from policies (friendly_trade)
 * Policy: inner_circle (+2 trade routes with friendly/allied tribes)
 */
export function calculatePolicyFriendlyTradeBonus(player: Player): number {
  let bonus = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'friendly_trade') {
      bonus += (policy.effect.amount as number) ?? 0
    }
  }

  return bonus
}

/**
 * Calculates flat gold bonus per trade route from policies (trade_gold)
 * Policy: foxy_swap (+2 Gold per trade route)
 */
export function calculatePolicyTradeGoldFlat(player: Player): number {
  let gold = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'trade_gold') {
      gold += (policy.effect.amount as number) ?? 0
    }
  }

  return gold
}

/**
 * Calculates percentage gold bonus from trade routes from policies (trade_gold_percent)
 * Policy: buy_the_dip (+30% Gold from trade routes)
 */
export function calculatePolicyTradeGoldPercent(player: Player): number {
  let percent = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'trade_gold_percent') {
      percent += (policy.effect.percent as number) ?? 0
    }
  }

  return percent
}

/**
 * Calculates great person points bonus percentage from policies (great_person_points)
 */
export function calculatePolicyGPPointsPercent(player: Player): number {
  let percent = 0

  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'great_person_points') {
      percent += (policy.effect.percent as number) ?? 0
    }
  }

  return percent
}

/**
 * Gets golden age duration override from policies (golden_age_duration)
 * Policy: retweet_bonanza (4 turns instead of 3)
 * Returns null if no override, otherwise the number of turns
 */
export function getPolicyGoldenAgeDuration(player: Player): number | null {
  for (const policyId of player.policies.active) {
    const policy = getPolicy(policyId)
    if (policy?.effect.type === 'golden_age_duration') {
      return (policy.effect.turns as number) ?? null
    }
  }
  return null
}
