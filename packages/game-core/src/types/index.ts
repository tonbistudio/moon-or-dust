// Core type definitions for Tribes game

// =============================================================================
// Branded Types (for type safety)
// =============================================================================

declare const brand: unique symbol
type Brand<T, B> = T & { [brand]: B }

export type TribeId = Brand<string, 'TribeId'>
export type PlayerId = Brand<string, 'PlayerId'>
export type UnitId = Brand<string, 'UnitId'>
export type SettlementId = Brand<string, 'SettlementId'>
export type BuildingId = Brand<string, 'BuildingId'>
export type TechId = Brand<string, 'TechId'>
export type CultureId = Brand<string, 'CultureId'>
export type PolicyId = Brand<string, 'PolicyId'>
export type PromotionId = Brand<string, 'PromotionId'>
export type WonderId = Brand<string, 'WonderId'>
export type LootboxId = Brand<string, 'LootboxId'>
export type TradeRouteId = Brand<string, 'TradeRouteId'>

// =============================================================================
// Hex Coordinates
// =============================================================================

export interface HexCoord {
  readonly q: number
  readonly r: number
}

export interface CubeCoord {
  readonly q: number
  readonly r: number
  readonly s: number
}

// =============================================================================
// Yields
// =============================================================================

export interface Yields {
  readonly gold: number
  readonly alpha: number // science
  readonly vibes: number // culture
  readonly production: number
  readonly growth: number
}

// =============================================================================
// Terrain & Map
// =============================================================================

export type TerrainType =
  | 'grassland'
  | 'plains'
  | 'forest'
  | 'hills'
  | 'mountain'
  | 'water'
  | 'desert'
  | 'jungle'
  | 'marsh'

export type TerrainFeature = 'river' | 'oasis' | 'none'

export type ResourceType =
  | 'iron'
  | 'horses'
  | 'gems'
  | 'marble'
  | 'hops'
  | 'airdrop'
  | 'silicon'
  | 'pig'
  | 'cattle'

export type ResourceCategory = 'strategic' | 'luxury' | 'bonus'

export interface Resource {
  readonly type: ResourceType
  readonly category: ResourceCategory
  readonly revealed: boolean
  readonly improved: boolean
}

export interface Tile {
  readonly coord: HexCoord
  readonly terrain: TerrainType
  readonly feature: TerrainFeature
  readonly resource?: Resource
  readonly owner?: TribeId
  readonly improvement?: ImprovementType
}

export type ImprovementType = 'mine' | 'quarry' | 'pasture' | 'sty' | 'brewery' | 'airdrop_farm' | 'server_farm'

export interface HexMap {
  readonly width: number
  readonly height: number
  readonly tiles: ReadonlyMap<string, Tile> // key is `${q},${r}`
}

// =============================================================================
// Units
// =============================================================================

// Base/Era 1 units
export type UnitType =
  | 'scout'
  | 'warrior'
  | 'settler'
  | 'builder'
  | 'great_person'
  // Era 1 military
  | 'archer'      // Ranged, unlocked by Archery
  | 'horseman'    // Cavalry, unlocked by Horseback Riding
  // Era 2 military
  | 'swordsman'       // Melee upgrade, unlocked by Iron Working
  | 'sniper'          // Ranged upgrade, unlocked by Botting
  | 'knight'          // Cavalry upgrade, unlocked by Priority Fees
  | 'social_engineer' // Siege, unlocked by Matrica
  // Era 3 military
  | 'bot_fighter'  // Melee upgrade, unlocked by AI
  | 'rockeeter'    // Ranged upgrade, unlocked by Wolf Game
  | 'tank'         // Cavalry upgrade, unlocked by Hacking
  | 'bombard'      // Siege upgrade, unlocked by Siege Weapons
  // Tribal unique units
  | 'banana_slinger'  // Monkes: replaces Archer, 3 range, 3/6 strength
  | 'neon_geck'       // Geckos: replaces Sniper, 3 mobility, kills grant +5 Alpha
  | 'deadgod'         // DeGods: replaces Swordsman, 8 strength, kills grant +20 Gold
  | 'stuckers'        // Cets: replaces Swordsman, 6 str, 3 mobility, debuffs enemy mobility

export type UnitRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface RarityBonuses {
  readonly combat: number
  readonly movement: number
  readonly vision: number
}

export type PromotionPath = 'combat' | 'mobility' | 'survival'

export interface UnitPromotion {
  readonly id: PromotionId
  readonly name: string
  readonly path: PromotionPath
  readonly prerequisite?: PromotionId
}

export interface Unit {
  readonly id: UnitId
  readonly type: UnitType
  readonly owner: TribeId
  readonly position: HexCoord
  readonly health: number
  readonly maxHealth: number
  readonly movementRemaining: number
  readonly maxMovement: number
  readonly combatStrength: number
  readonly rangedStrength: number
  readonly settlementStrength: number // Strength when attacking settlements (siege units have higher values)
  readonly experience: number
  readonly level: number
  readonly promotions: readonly PromotionId[]
  readonly rarity: UnitRarity
  readonly rarityBonuses: RarityBonuses
  readonly hasActed: boolean
  readonly sleeping: boolean // Sleep until woken — skipped by auto-cycle
  readonly buildCharges: number // Remaining build charges (for builders)
  readonly immobilizedTurns: number // Turns remaining where movement = 0 (Stuckers debuff)
}

// =============================================================================
// Settlements
// =============================================================================

export interface MilestoneChoice {
  readonly level: number
  readonly choice: 'a' | 'b'
}

export interface Settlement {
  readonly id: SettlementId
  readonly name: string
  readonly owner: TribeId
  readonly position: HexCoord
  readonly level: number
  readonly growthProgress: number
  readonly growthThreshold: number
  readonly buildings: readonly BuildingId[]
  readonly productionQueue: readonly ProductionItem[]
  readonly currentProduction: number
  readonly milestonesChosen: readonly MilestoneChoice[]
  readonly isCapital: boolean
  readonly health: number
  readonly maxHealth: number
}

export interface ProductionItem {
  readonly type: 'unit' | 'building' | 'wonder'
  readonly id: string
  readonly progress: number
  readonly cost: number
}

// =============================================================================
// Buildings & Wonders
// =============================================================================

export type BuildingCategory = 'tech' | 'economy' | 'vibes' | 'military' | 'production'

export interface Building {
  readonly id: BuildingId
  readonly name: string
  readonly category: BuildingCategory
  readonly productionCost: number
  readonly yields: Yields
  readonly adjacencyBonus?: AdjacencyBonus
}

export interface AdjacencyBonus {
  readonly yield: keyof Yields
  readonly amount: number
  readonly condition: AdjacencyCondition
}

export type AdjacencyCondition =
  | { type: 'terrain'; terrain: TerrainType }
  | { type: 'resource'; category: ResourceCategory }
  | { type: 'building'; buildingId?: BuildingId } // any building if undefined
  | { type: 'improvement'; improvement: ImprovementType }

export interface Wonder {
  readonly id: WonderId
  readonly name: string
  readonly reference: string // Solana project reference
  readonly category: BuildingCategory
  readonly productionCost: number
  readonly floorPriceBonus: number
  readonly builtBy?: TribeId
  readonly location?: SettlementId
}

// =============================================================================
// Tribes
// =============================================================================

export type TribeName = 'monkes' | 'geckos' | 'degods' | 'cets' | 'gregs' | 'dragonz'

export interface TribeBonuses {
  // Yield percentage bonuses (0.05 = +5%)
  readonly vibesYieldPercent?: number
  readonly alphaYieldPercent?: number
  // Building category yield bonuses (0.10 = +10% from that building category)
  readonly goldFromGoldBuildingsPercent?: number
  readonly vibesFromCultureBuildingsPercent?: number
  readonly productionFromProductionBuildingsPercent?: number
  // Production bonuses for unit types (0.10 = +10% faster production)
  readonly meleeUnitProductionPercent?: number
  readonly rangedUnitProductionPercent?: number
  // Trade route bonus
  readonly extraTradeRouteCapacity?: number
}

export interface Tribe {
  readonly id: TribeId
  readonly name: TribeName
  readonly displayName: string
  readonly primaryStrength: BuildingCategory
  readonly secondaryStrength: BuildingCategory
  readonly uniqueUnitType: UnitType
  readonly uniqueBuildingId: BuildingId
  readonly color: string
  readonly bonuses: TribeBonuses
}

// =============================================================================
// Diplomacy
// =============================================================================

export type DiplomaticStance = 'war' | 'hostile' | 'neutral' | 'friendly' | 'allied'

export interface DiplomaticRelation {
  readonly stance: DiplomaticStance
  readonly turnsAtCurrentStance: number
  readonly reputation: number
}

export interface ReputationEvent {
  readonly type: 'war_declaration' | 'betrayal' | 'gift' | 'trade' | 'alliance'
  readonly turn: number
  readonly amount: number
}

export interface DiplomacyState {
  readonly relations: ReadonlyMap<string, DiplomaticRelation> // key is `${tribe1}-${tribe2}`
  readonly warWeariness: ReadonlyMap<TribeId, number>
  readonly reputationModifiers: ReadonlyMap<TribeId, readonly ReputationEvent[]>
  readonly peaceRejectionTurns: ReadonlyMap<string, number> // key `${proposer}-${target}`, value = turn rejected
}

// =============================================================================
// Trade Routes
// =============================================================================

export interface TradeRoute {
  readonly id: TradeRouteId
  readonly origin: SettlementId
  readonly destination: SettlementId
  readonly ownerTribe: TribeId // The tribe that owns/created this route
  readonly targetTribe: TribeId // The tribe receiving the route (same as owner for internal)
  readonly goldPerTurn: number
  readonly active: boolean
  readonly turnsUntilActive: number // 2 turns to form, 0 when active
}

// =============================================================================
// Great People
// =============================================================================

export type GreatPersonId =
  | 'scum' | 'mert' | 'dingaling' | 'toly'
  | 'watch_king' | 'monoliff' | 'retired_chad_dev' | 'blocksmyth'

export type GreatPersonCategory = 'alpha' | 'gold' | 'vibes' | 'trade' | 'production'

export type GreatPersonThreshold =
  | { readonly type: 'accumulator'; readonly stat: 'alpha' | 'gold' | 'vibes'; readonly amount: number }
  | { readonly type: 'count'; readonly stat: 'tradeRoutes' | 'wondersBuilt'; readonly amount: number }

export type GreatPersonEffect =
  | { readonly type: 'instant_gold'; readonly amount: number }
  | { readonly type: 'instant_building'; readonly buildingCategory: string }
  | { readonly type: 'border_expansion'; readonly tiles: number; readonly bonusVibes?: number }
  | { readonly type: 'yield_buff'; readonly yield: string; readonly percent: number; readonly turns: number }
  | { readonly type: 'production_buff'; readonly percent: number; readonly turns: number; readonly target: 'building' }

export interface GreatPersonDefinition {
  readonly id: GreatPersonId
  readonly name: string
  readonly category: GreatPersonCategory
  readonly threshold: GreatPersonThreshold
  readonly actionName: string
  readonly effect: GreatPersonEffect
}

export interface GreatPerson {
  readonly id: UnitId
  readonly greatPersonId: GreatPersonId
  readonly hasActed: boolean  // one-time action used
}

export interface GreatPeopleAccumulator {
  readonly alpha: number        // Total Alpha earned
  readonly gold: number         // Total Gold earned
  readonly vibes: number        // Total Vibes earned
  readonly tradeRoutes: number  // Current active trade routes
  readonly wondersBuilt: number // Total wonders built
}

export interface GreatPeopleState {
  readonly accumulator: GreatPeopleAccumulator
  readonly earned: readonly GreatPersonId[]  // Great people already earned (can't earn twice)
  readonly spawnChanceBonus: number  // Bonus % from policies/buildings (added to 50% base)
}

// =============================================================================
// Golden Ages
// =============================================================================

// Universal triggers (available to all tribes)
export type UniversalGoldenAgeTrigger =
  | 'research_3_techs_in_5_turns'
  | 'capture_capital'
  | 'found_4th_settlement'
  | 'reach_20_population'
  | 'build_2_wonders'
  | 'earn_3_great_people'
  | 'reach_6_trade_routes_first'

// Tribe-specific triggers
export type TribalGoldenAgeTrigger =
  | 'monkes_500_gold'
  | 'geckos_era3_tech_first'
  | 'degods_10_kills'
  | 'cets_era3_culture_first'

export type GoldenAgeTrigger = UniversalGoldenAgeTrigger | TribalGoldenAgeTrigger

// Golden age effect types by era
export type GoldenAgeEffectType =
  // Era 1 effects
  | 'combat_strength_25'
  | 'mobility_1'
  | 'alpha_20'
  | 'vibes_20'
  | 'production_20'
  | 'gold_20'
  // Era 2 effects
  | 'defense_33'
  | 'combat_strength_flat_2'
  | 'alpha_30'
  | 'vibes_30'
  | 'production_30'
  | 'gold_30'
  // Era 3 effects
  | 'combat_defense_20'
  | 'alpha_40'
  | 'vibes_40'
  | 'production_40'
  | 'gold_40'

export interface GoldenAgeState {
  readonly active: boolean
  readonly turnsRemaining: number
  readonly currentEffect?: GoldenAgeEffectType
  readonly currentTrigger?: GoldenAgeTrigger  // Which trigger caused the current golden age
  readonly triggersUsed: readonly GoldenAgeTrigger[]
  // Track techs researched in last 5 turns for the "3 techs in 5 turns" trigger
  readonly recentTechTurns: readonly number[]
}

// =============================================================================
// Lootboxes
// =============================================================================

export type LootboxReward = 'airdrop' | 'alpha_leak' | 'og_holder' | 'community_growth' | 'scout'

export interface Lootbox {
  readonly id: LootboxId
  readonly position: HexCoord
  readonly claimed: boolean
  readonly reward?: LootboxReward
}

// =============================================================================
// Tech & Cultures
// =============================================================================

export type Era = 1 | 2 | 3

export type PolicySlotType = 'military' | 'economy' | 'progress' | 'wildcard'

export interface TechPrerequisites {
  readonly techs: readonly TechId[]
  readonly cultures: readonly CultureId[]
}

export interface TechUnlocks {
  readonly units?: readonly UnitType[]
  readonly buildings?: readonly BuildingId[]
  readonly improvements?: readonly ImprovementType[]
  readonly resources?: readonly ResourceType[] // reveals these
  readonly features?: readonly string[] // Special features unlocked (e.g. "Trade Routes")
}

export interface Tech {
  readonly id: TechId
  readonly name: string
  readonly era: Era
  readonly cost: number
  readonly prerequisites: TechPrerequisites
  readonly unlocks: TechUnlocks
}

export interface CulturePrerequisites {
  readonly cultures: readonly CultureId[]
  readonly techs: readonly TechId[]
}

export interface SlotUnlocks {
  readonly military?: number
  readonly economy?: number
  readonly progress?: number
  readonly wildcard?: number
}

export interface Culture {
  readonly id: CultureId
  readonly name: string
  readonly era: Era
  readonly cost: number
  readonly prerequisites: CulturePrerequisites
  readonly policyChoices: readonly [PolicyCard, PolicyCard]
  readonly slotUnlocks?: SlotUnlocks
}

export interface PolicyEffect {
  readonly type: string
  readonly [key: string]: unknown
}

export interface PolicyCard {
  readonly id: PolicyId
  readonly name: string
  readonly description: string
  readonly cultureId: CultureId
  readonly choice: 'a' | 'b'
  readonly slotType: PolicySlotType
  readonly effect: PolicyEffect
}

export interface PolicySlots {
  readonly military: number
  readonly economy: number
  readonly progress: number
  readonly wildcard: number
}

export interface PlayerPolicies {
  readonly slots: PolicySlots
  readonly pool: readonly PolicyId[]      // all unlocked cards
  readonly active: readonly PolicyId[]    // currently slotted cards
}

// =============================================================================
// Pending Mints (units awaiting rarity reveal)
// =============================================================================

export interface PendingMint {
  readonly settlementId: SettlementId
  readonly unitType: UnitType
  readonly position: HexCoord
  readonly owner: TribeId
}

// =============================================================================
// Active Buffs (from Great People)
// =============================================================================

export interface ActiveBuff {
  readonly source: GreatPersonId
  readonly type: 'yield' | 'production' | 'trade'
  readonly yield?: string       // which yield: 'alpha', 'gold', 'vibes', 'trade'
  readonly percent: number      // e.g. 15 = +15%
  readonly turnsRemaining: number
}

// =============================================================================
// Player State
// =============================================================================

export interface Player {
  readonly id: PlayerId
  readonly tribeId: TribeId
  readonly tribeName: TribeName
  readonly isHuman: boolean
  readonly yields: Yields
  readonly treasury: number
  readonly researchedTechs: readonly TechId[]
  readonly currentResearch?: TechId
  readonly researchProgress: number
  readonly unlockedCultures: readonly CultureId[]
  readonly currentCulture?: CultureId
  readonly cultureProgress: number
  readonly policies: PlayerPolicies
  readonly greatPeople: GreatPeopleState
  readonly goldenAge: GoldenAgeState
  readonly killCount: number
  readonly pendingMints: readonly PendingMint[]
  readonly activeBuffs: readonly ActiveBuff[]
  readonly eliminatedOnTurn?: number // turn when tribe lost all settlements
}

// =============================================================================
// Game State
// =============================================================================

export interface GameState {
  readonly version: string
  readonly seed: number
  readonly turn: number
  readonly maxTurns: number
  readonly currentPlayer: TribeId
  readonly players: readonly Player[]
  readonly map: HexMap
  readonly units: ReadonlyMap<UnitId, Unit>
  readonly settlements: ReadonlyMap<SettlementId, Settlement>
  readonly fog: ReadonlyMap<TribeId, ReadonlySet<string>> // visible hex coords as `${q},${r}`
  readonly diplomacy: DiplomacyState
  readonly tradeRoutes: readonly TradeRoute[]
  readonly greatPersons: ReadonlyMap<UnitId, GreatPerson>
  readonly lootboxes: readonly Lootbox[]
  readonly wonders: readonly Wonder[]
  readonly floorPrices: ReadonlyMap<TribeId, number>
  readonly pendingPeaceProposals: readonly { readonly proposer: TribeId; readonly target: TribeId }[]
}

// =============================================================================
// Actions
// =============================================================================

export type GameAction =
  | { type: 'MOVE_UNIT'; unitId: UnitId; to: HexCoord }
  | { type: 'ATTACK'; attackerId: UnitId; targetId: UnitId }
  | { type: 'ATTACK_SETTLEMENT'; attackerId: UnitId; settlementId: SettlementId }
  | { type: 'CAPTURE_SETTLEMENT'; settlementId: SettlementId }
  | { type: 'RAZE_SETTLEMENT'; settlementId: SettlementId }
  | { type: 'FOUND_SETTLEMENT'; settlerId: UnitId }
  | { type: 'BUILD_IMPROVEMENT'; builderId: UnitId; improvement: ImprovementType }
  | { type: 'START_PRODUCTION'; settlementId: SettlementId; item: ProductionItem }
  | { type: 'CANCEL_PRODUCTION'; settlementId: SettlementId; queueIndex: number }
  | { type: 'PURCHASE'; settlementId: SettlementId; itemType: 'unit' | 'building'; itemId: string }
  | { type: 'MINT_UNIT'; settlementId: SettlementId; index: number; rarity?: UnitRarity }
  | { type: 'START_RESEARCH'; techId: TechId }
  | { type: 'START_CULTURE'; cultureId: CultureId }
  | { type: 'SELECT_POLICY'; choice: 'a' | 'b' }
  | { type: 'SELECT_PROMOTION'; unitId: UnitId; promotionId: PromotionId }
  | { type: 'SELECT_MILESTONE'; settlementId: SettlementId; level: number; choice: 'a' | 'b' }
  | { type: 'CREATE_TRADE_ROUTE'; origin: SettlementId; destination: SettlementId }
  | { type: 'CANCEL_TRADE_ROUTE'; routeId: TradeRouteId }
  | { type: 'USE_GREAT_PERSON'; unitId: UnitId }
  | { type: 'SWAP_POLICIES'; toSlot: PolicyId[]; toUnslot: PolicyId[] }
  | { type: 'SLEEP_UNIT'; unitId: UnitId }
  | { type: 'WAKE_UNIT'; unitId: UnitId }
  | { type: 'DECLARE_WAR'; target: TribeId }
  | { type: 'PROPOSE_PEACE'; target: TribeId }
  | { type: 'RESPOND_PEACE_PROPOSAL'; target: TribeId; accept: boolean }
  | { type: 'PROPOSE_ALLIANCE'; target: TribeId }
  | { type: 'END_TURN' }
