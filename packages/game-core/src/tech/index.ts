// Technology system - research, unlocks, and cross-prerequisites

import type {
  GameState,
  Tech,
  TechId,
  CultureId,
  TribeId,
  Era,
  Player,
  BuildingId,
} from '../types'
import { recordTechResearched } from '../goldenage'

// =============================================================================
// Tech Definitions
// =============================================================================

export const TECH_DEFINITIONS: Record<string, Tech> = {
  // ==========================================================================
  // Era 1: Ancient Age (20-40 Alpha)
  // ==========================================================================
  mining: {
    id: 'mining' as TechId,
    name: 'Mining',
    era: 1,
    cost: 20,
    prerequisites: { techs: [], cultures: [] },
    unlocks: { improvements: ['mine', 'quarry'], resources: ['iron'] },
  },
  animal_husbandry: {
    id: 'animal_husbandry' as TechId,
    name: 'Animal Husbandry',
    era: 1,
    cost: 20,
    prerequisites: { techs: [], cultures: [] },
    unlocks: { improvements: ['pasture'], resources: ['horses'] },
  },
  farming: {
    id: 'farming' as TechId,
    name: 'Farming',
    era: 1,
    cost: 20,
    prerequisites: { techs: ['animal_husbandry' as TechId], cultures: [] },
    unlocks: { improvements: ['farm'], buildings: ['granary' as BuildingId] },
  },
  coding: {
    id: 'coding' as TechId,
    name: 'Coding',
    era: 1,
    cost: 25,
    prerequisites: { techs: [], cultures: [] },
    unlocks: { buildings: ['library' as BuildingId] },
  },
  smart_contracts: {
    id: 'smart_contracts' as TechId,
    name: 'Smart Contracts',
    era: 1,
    cost: 25,
    prerequisites: { techs: ['coding' as TechId], cultures: [] },
    // +1 trade route capacity, unlocks Candy Machine wonder
    unlocks: {},
  },
  archery: {
    id: 'archery' as TechId,
    name: 'Archery',
    era: 1,
    cost: 25,
    prerequisites: { techs: ['animal_husbandry' as TechId], cultures: [] },
    unlocks: { units: ['archer'] },
  },
  minting: {
    id: 'minting' as TechId,
    name: 'Minting',
    era: 1,
    cost: 30,
    prerequisites: { techs: [], cultures: [] },
    unlocks: { improvements: ['mint'], buildings: ['solanart' as BuildingId] },
  },
  bronze_working: {
    id: 'bronze_working' as TechId,
    name: 'Bronze Working',
    era: 1,
    cost: 35,
    prerequisites: { techs: ['mining' as TechId], cultures: [] },
    unlocks: { buildings: ['barracks' as BuildingId] },
  },
  pfps: {
    id: 'pfps' as TechId,
    name: 'PFPs',
    era: 1,
    cost: 35,
    prerequisites: { techs: ['coding' as TechId], cultures: [] },
    unlocks: { buildings: ['gallery' as BuildingId] },
  },
  horseback_riding: {
    id: 'horseback_riding' as TechId,
    name: 'Horseback Riding',
    era: 1,
    cost: 40,
    prerequisites: { techs: ['farming' as TechId], cultures: [] },
    unlocks: { units: ['horseman'], improvements: ['roads'] },
  },

  // ==========================================================================
  // Era 2: Classical Age (50-80 Alpha)
  // ==========================================================================
  iron_working: {
    id: 'iron_working' as TechId,
    name: 'Iron Working',
    era: 2,
    cost: 50,
    prerequisites: { techs: ['bronze_working' as TechId], cultures: [] },
    unlocks: { units: ['swordsman'] },
  },
  discord: {
    id: 'discord' as TechId,
    name: 'Discord',
    era: 2,
    cost: 50,
    prerequisites: { techs: ['pfps' as TechId], cultures: [] },
    unlocks: { buildings: ['server' as BuildingId, 'creckhouse' as BuildingId] }, // Creckhouse: Cets unique
  },
  currency: {
    id: 'currency' as TechId,
    name: 'Currency',
    era: 2,
    cost: 55,
    prerequisites: { techs: ['minting' as TechId], cultures: ['otc_trading' as CultureId] },
    // +1 trade route, unlocks Magic Eden wonder
    unlocks: {},
  },
  staking: {
    id: 'staking' as TechId,
    name: 'Staking',
    era: 2,
    cost: 55,
    prerequisites: { techs: ['pfps' as TechId, 'smart_contracts' as TechId], cultures: [] },
    // Unlocks Art Upgrader, Taiyo Robotics Factory wonder, The Garage (Geckos unique)
    unlocks: { buildings: ['art_upgrader' as BuildingId, 'the_garage' as BuildingId] },
  },
  lending: {
    id: 'lending' as TechId,
    name: 'Lending',
    era: 2,
    cost: 60,
    prerequisites: { techs: ['smart_contracts' as TechId], cultures: [] },
    // +1 trade route capacity, Degen Mints Cabana (Monkes unique)
    unlocks: { buildings: ['degen_mints_cabana' as BuildingId] },
  },
  matrica: {
    id: 'matrica' as TechId,
    name: 'Matrica',
    era: 2,
    cost: 65,
    prerequisites: { techs: ['discord' as TechId], cultures: ['early_empire' as CultureId] },
    // Alpha Hunter Hideout, Social Engineer, Eternal Bridge (DeGods unique)
    unlocks: { buildings: ['alpha_hunter_hideout' as BuildingId, 'eternal_bridge' as BuildingId], units: ['social_engineer'] },
  },
  botting: {
    id: 'botting' as TechId,
    name: 'Botting',
    era: 2,
    cost: 70,
    prerequisites: { techs: ['iron_working' as TechId], cultures: [] },
    unlocks: { buildings: ['bot_farm' as BuildingId], units: ['sniper'] },
  },
  onchain_gaming: {
    id: 'onchain_gaming' as TechId,
    name: 'On-chain Gaming',
    era: 2,
    cost: 70,
    prerequisites: { techs: ['coding' as TechId, 'minting' as TechId], cultures: [] },
    unlocks: { buildings: ['arena' as BuildingId] },
  },
  priority_fees: {
    id: 'priority_fees' as TechId,
    name: 'Priority Fees',
    era: 2,
    cost: 75,
    prerequisites: { techs: ['onchain_gaming' as TechId], cultures: [] },
    unlocks: { units: ['knight'] },
  },
  defi: {
    id: 'defi' as TechId,
    name: 'Defi',
    era: 2,
    cost: 80,
    prerequisites: { techs: ['currency' as TechId], cultures: [] },
    unlocks: { buildings: ['yield_farm' as BuildingId] },
  },

  // ==========================================================================
  // Era 3: Renaissance Age (100-150 Alpha)
  // ==========================================================================
  artificial_intelligence: {
    id: 'artificial_intelligence' as TechId,
    name: 'Artificial Intelligence',
    era: 3,
    cost: 100,
    prerequisites: { techs: ['priority_fees' as TechId], cultures: [] },
    unlocks: { units: ['bot_fighter'] },
  },
  ponzinomics: {
    id: 'ponzinomics' as TechId,
    name: 'Ponzinomics',
    era: 3,
    cost: 100,
    prerequisites: { techs: ['staking' as TechId], cultures: [] },
    // Unlocks Hype Machine and Mindfolk Lumberyard wonder
    unlocks: { buildings: ['hype_machine' as BuildingId] },
  },
  hacking: {
    id: 'hacking' as TechId,
    name: 'Hacking',
    era: 3,
    cost: 110,
    prerequisites: { techs: ['botting' as TechId, 'horseback_riding' as TechId], cultures: [] },
    unlocks: { units: ['tank'] },
  },
  tokenomics: {
    id: 'tokenomics' as TechId,
    name: 'Tokenomics',
    era: 3,
    cost: 110,
    prerequisites: { techs: ['defi' as TechId], cultures: [] },
    // +1 trade route capacity
    unlocks: { buildings: ['dex_labs' as BuildingId] },
  },
  hardware_wallets: {
    id: 'hardware_wallets' as TechId,
    name: 'Hardware Wallets',
    era: 3,
    cost: 120,
    prerequisites: { techs: ['iron_working' as TechId], cultures: [] },
    unlocks: { buildings: ['ledger_foundry' as BuildingId] },
  },
  siege_weapons: {
    id: 'siege_weapons' as TechId,
    name: 'Siege Weapons',
    era: 3,
    cost: 120,
    prerequisites: { techs: ['hardware_wallets' as TechId], cultures: [] },
    unlocks: { units: ['bombard'] },
  },
  wolf_game: {
    id: 'wolf_game' as TechId,
    name: 'Wolf Game',
    era: 3,
    cost: 130,
    prerequisites: { techs: ['defi' as TechId], cultures: [] },
    unlocks: { units: ['rockeeter'] },
  },
  liquidity_pools: {
    id: 'liquidity_pools' as TechId,
    name: 'Liquidity Pools',
    era: 3,
    cost: 140,
    prerequisites: { techs: ['tokenomics' as TechId], cultures: ['alpha_daos' as CultureId] },
    // +2 trade route capacity, +5% all yields
    unlocks: {},
  },
  firedancer: {
    id: 'firedancer' as TechId,
    name: 'Firedancer',
    era: 3,
    cost: 140,
    prerequisites: { techs: ['priority_fees' as TechId], cultures: [] },
    // +2 mobility for all units
    unlocks: {},
  },
  ohm: {
    id: 'ohm' as TechId,
    name: 'OHM',
    era: 3,
    cost: 150,
    prerequisites: { techs: ['wolf_game' as TechId, 'liquidity_pools' as TechId], cultures: [] },
    unlocks: { buildings: ['cult_hq' as BuildingId] },
  },
}

export const ALL_TECHS: Tech[] = Object.values(TECH_DEFINITIONS)

export const TECH_MAP: Map<TechId, Tech> = new Map(
  ALL_TECHS.map((t) => [t.id, t])
)

// =============================================================================
// Tech Queries
// =============================================================================

/**
 * Gets a tech by ID
 */
export function getTech(id: TechId): Tech | undefined {
  return TECH_MAP.get(id)
}

/**
 * Gets all techs for an era
 */
export function getTechsByEra(era: Era): Tech[] {
  return ALL_TECHS.filter((t) => t.era === era)
}

/**
 * Checks if a player has researched a tech
 */
export function hasResearched(player: Player, techId: TechId): boolean {
  return player.researchedTechs.includes(techId)
}

/**
 * Checks if a player has unlocked a culture (for cross-prerequisites)
 * Internal helper - use cultures module's hasUnlockedCulture for external calls
 */
function playerHasUnlockedCulture(player: Player, cultureId: CultureId): boolean {
  return player.unlockedCultures.includes(cultureId)
}

/**
 * Checks if prerequisites are met for a tech
 */
export function canResearchTech(player: Player, techId: TechId): { canResearch: boolean; reason?: string } {
  const tech = getTech(techId)
  if (!tech) {
    return { canResearch: false, reason: 'Tech not found' }
  }

  // Already researched
  if (hasResearched(player, techId)) {
    return { canResearch: false, reason: 'Already researched' }
  }

  // Check tech prerequisites
  for (const prereqTechId of tech.prerequisites.techs) {
    if (!hasResearched(player, prereqTechId)) {
      const prereqTech = getTech(prereqTechId)
      return { canResearch: false, reason: `Requires tech: ${prereqTech?.name || prereqTechId}` }
    }
  }

  // Check culture prerequisites (cross-tree)
  for (const prereqCultureId of tech.prerequisites.cultures) {
    if (!playerHasUnlockedCulture(player, prereqCultureId)) {
      return { canResearch: false, reason: `Requires culture: ${prereqCultureId}` }
    }
  }

  return { canResearch: true }
}

/**
 * Gets all available techs for a player to research
 */
export function getAvailableTechs(player: Player): Tech[] {
  return ALL_TECHS.filter((tech) => {
    const result = canResearchTech(player, tech.id)
    return result.canResearch
  })
}

/**
 * Gets techs by prerequisite (what does this tech unlock?)
 */
export function getTechsUnlockedBy(techId: TechId): Tech[] {
  return ALL_TECHS.filter((tech) =>
    tech.prerequisites.techs.includes(techId)
  )
}

// =============================================================================
// Research Progress
// =============================================================================

/**
 * Starts researching a tech
 */
export function startResearch(state: GameState, tribeId: TribeId, techId: TechId): GameState | null {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return null

  const player = state.players[playerIndex]!
  const result = canResearchTech(player, techId)
  if (!result.canResearch) return null

  const updatedPlayer: Player = {
    ...player,
    currentResearch: techId,
    researchProgress: 0,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

/**
 * Adds research progress from Alpha yield
 */
export function addResearchProgress(state: GameState, tribeId: TribeId, amount: number): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  if (!player.currentResearch) return state

  const tech = getTech(player.currentResearch)
  if (!tech) return state

  const newProgress = player.researchProgress + amount

  // Check if research complete
  if (newProgress >= tech.cost) {
    return completeResearch(state, tribeId, tech.id)
  }

  const updatedPlayer: Player = {
    ...player,
    researchProgress: newProgress,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  return { ...state, players: newPlayers }
}

/**
 * Completes research on a tech
 */
export function completeResearch(state: GameState, tribeId: TribeId, techId: TechId): GameState {
  const playerIndex = state.players.findIndex((p) => p.tribeId === tribeId)
  if (playerIndex === -1) return state

  const player = state.players[playerIndex]!
  const tech = getTech(techId)
  if (!tech) return state

  // Build updated player without setting currentResearch to undefined explicitly
  const { currentResearch: _, ...playerWithoutResearch } = player
  const updatedPlayer: Player = {
    ...playerWithoutResearch,
    researchedTechs: [...player.researchedTechs, techId],
    researchProgress: 0,
  }

  const newPlayers = [...state.players]
  newPlayers[playerIndex] = updatedPlayer

  let newState: GameState = { ...state, players: newPlayers }

  // Apply unlocks (reveal resources, etc.)
  newState = applyTechUnlocks(newState, tribeId, tech)

  // Record tech for golden age trigger tracking
  newState = recordTechResearched(newState, tribeId, state.turn)

  return newState
}

/**
 * Applies tech unlocks to the game state
 */
function applyTechUnlocks(state: GameState, _tribeId: TribeId, tech: Tech): GameState {
  let newState = state

  // Reveal resources
  if (tech.unlocks.resources && tech.unlocks.resources.length > 0) {
    const newTiles = new Map(state.map.tiles)

    for (const [key, tile] of newTiles) {
      if (tile.resource && tech.unlocks.resources.includes(tile.resource.type)) {
        if (!tile.resource.revealed) {
          newTiles.set(key, {
            ...tile,
            resource: {
              ...tile.resource,
              revealed: true,
            },
          })
        }
      }
    }

    newState = {
      ...newState,
      map: {
        ...newState.map,
        tiles: newTiles,
      },
    }
  }

  return newState
}

// =============================================================================
// Research Queries
// =============================================================================

/**
 * Gets research progress as percentage
 */
export function getResearchProgress(player: Player): { current: number; total: number; percent: number } | null {
  if (!player.currentResearch) return null

  const tech = getTech(player.currentResearch)
  if (!tech) return null

  return {
    current: player.researchProgress,
    total: tech.cost,
    percent: Math.floor((player.researchProgress / tech.cost) * 100),
  }
}

/**
 * Gets turns remaining for current research
 */
export function getTurnsToComplete(player: Player): number | null {
  if (!player.currentResearch) return null

  const tech = getTech(player.currentResearch)
  if (!tech) return null

  const remaining = tech.cost - player.researchProgress
  const alphaPerTurn = player.yields.alpha

  if (alphaPerTurn <= 0) return Infinity

  return Math.ceil(remaining / alphaPerTurn)
}

/**
 * Gets the current era for a player based on researched techs
 */
export function getCurrentEra(player: Player): Era {
  let maxEra: Era = 1

  for (const techId of player.researchedTechs) {
    const tech = getTech(techId)
    if (tech && tech.era > maxEra) {
      maxEra = tech.era
    }
  }

  return maxEra
}

/**
 * Counts techs researched in an era
 */
export function countTechsInEra(player: Player, era: Era): number {
  return player.researchedTechs.filter((techId) => {
    const tech = getTech(techId)
    return tech?.era === era
  }).length
}
