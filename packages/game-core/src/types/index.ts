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
export type CampId = Brand<string, 'CampId'>

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
  | 'whitelists'
  | 'rpcs'
  | 'wheat'
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

export type ImprovementType = 'farm' | 'mine' | 'pasture' | 'quarry' | 'mint' | 'server_farm'

export interface HexMap {
  readonly width: number
  readonly height: number
  readonly tiles: ReadonlyMap<string, Tile> // key is `${q},${r}`
}

// =============================================================================
// Units
// =============================================================================

export type UnitType = 'scout' | 'warrior' | 'ranged' | 'settler' | 'builder' | 'great_person'

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
  readonly experience: number
  readonly level: number
  readonly promotions: readonly PromotionId[]
  readonly rarity: UnitRarity
  readonly rarityBonuses: RarityBonuses
  readonly hasActed: boolean
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
  readonly population: number
  readonly level: number
  readonly populationProgress: number
  readonly populationThreshold: number
  readonly buildings: readonly BuildingId[]
  readonly productionQueue: readonly ProductionItem[]
  readonly currentProduction: number
  readonly milestonesChosen: readonly MilestoneChoice[]
  readonly isCapital: boolean
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

export interface Tribe {
  readonly id: TribeId
  readonly name: TribeName
  readonly displayName: string
  readonly primaryStrength: BuildingCategory
  readonly secondaryStrength: BuildingCategory
  readonly uniqueUnitType: UnitType
  readonly uniqueBuildingId: BuildingId
  readonly color: string
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
}

// =============================================================================
// Trade Routes
// =============================================================================

export interface TradeRoute {
  readonly id: TradeRouteId
  readonly origin: SettlementId
  readonly destination: SettlementId
  readonly targetTribe: TribeId
  readonly goldPerTurn: number
  readonly active: boolean
}

// =============================================================================
// Great People
// =============================================================================

export type GreatPersonType = 'general' | 'scientist' | 'merchant' | 'artist'

export interface GreatPerson {
  readonly id: UnitId
  readonly type: GreatPersonType
  readonly hasActed: boolean
}

export interface GreatPeopleAccumulator {
  readonly combat: number
  readonly alpha: number
  readonly gold: number
  readonly vibes: number
}

// =============================================================================
// Golden Ages
// =============================================================================

export type GoldenAgeTrigger =
  | 'research_3_techs'
  | 'capture_capital'
  | 'found_4th_settlement'
  | 'reach_20_population'
  | 'monkes_500_gold'
  | 'geckos_era3_first'
  | 'degods_10_kills'
  | 'cets_30_tiles'

export interface GoldenAgeState {
  readonly active: boolean
  readonly turnsRemaining: number
  readonly triggersUsed: readonly GoldenAgeTrigger[]
}

// =============================================================================
// Barbarians
// =============================================================================

export interface BarbarianCamp {
  readonly id: CampId
  readonly position: HexCoord
  readonly spawnCooldown: number
  readonly unitsSpawned: readonly UnitId[]
  readonly destroyed: boolean
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
// Player State
// =============================================================================

export interface Player {
  readonly id: PlayerId
  readonly tribeId: TribeId
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
  readonly greatPeopleProgress: GreatPeopleAccumulator
  readonly goldenAge: GoldenAgeState
  readonly killCount: number
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
  readonly barbarianCamps: readonly BarbarianCamp[]
  readonly lootboxes: readonly Lootbox[]
  readonly wonders: readonly Wonder[]
  readonly floorPrices: ReadonlyMap<TribeId, number>
}

// =============================================================================
// Actions
// =============================================================================

export type GameAction =
  | { type: 'MOVE_UNIT'; unitId: UnitId; to: HexCoord }
  | { type: 'ATTACK'; attackerId: UnitId; targetId: UnitId }
  | { type: 'FOUND_SETTLEMENT'; settlerId: UnitId }
  | { type: 'BUILD_IMPROVEMENT'; builderId: UnitId; improvement: ImprovementType }
  | { type: 'START_PRODUCTION'; settlementId: SettlementId; item: ProductionItem }
  | { type: 'START_RESEARCH'; techId: TechId }
  | { type: 'START_CULTURE'; cultureId: CultureId }
  | { type: 'SELECT_POLICY'; cultureId: CultureId; choice: 0 | 1 }
  | { type: 'SELECT_PROMOTION'; unitId: UnitId; promotionId: PromotionId }
  | { type: 'SELECT_MILESTONE'; settlementId: SettlementId; choice: 'a' | 'b' }
  | { type: 'CREATE_TRADE_ROUTE'; origin: SettlementId; destination: SettlementId }
  | { type: 'CANCEL_TRADE_ROUTE'; routeId: TradeRouteId }
  | { type: 'USE_GREAT_PERSON'; unitId: UnitId }
  | { type: 'DECLARE_WAR'; target: TribeId }
  | { type: 'PROPOSE_PEACE'; target: TribeId }
  | { type: 'PROPOSE_ALLIANCE'; target: TribeId }
  | { type: 'END_TURN' }
