// React context for game state management

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react'
import type {
  GameState,
  GameAction,
  HexCoord,
  SettlementId,
  UnitId,
  LootboxReward,
  TribeId,
} from '@tribes/game-core'
import {
  createInitialState,
  applyAction,
  generateMap,
  createUnit,
  addUnit,
  createRng,
  generateAIActions,
  areAtWar,
  getTech,
  getCulture,
  getMilestoneForLevel,
  type GameConfig,
  type ActionResult,
} from '@tribes/game-core'
import type { GameEvent } from '../components/EventLog'

// =============================================================================
// Types
// =============================================================================

// Lootbox reward info for popup display
export interface LootboxRewardInfo {
  reward: LootboxReward
  details: string
}

// Pending war attack info for confirmation popup
export interface PendingWarAttack {
  attackerId: UnitId
  targetId: UnitId
  attackerTribe: string
  defenderTribe: string
}

export interface GameContextValue {
  // Game state
  state: GameState | null
  isLoading: boolean
  error: string | null

  // Selection state
  selectedTile: HexCoord | null
  selectedUnit: UnitId | null
  selectedSettlement: SettlementId | null

  // Lootbox reward popup
  pendingLootboxReward: LootboxRewardInfo | null

  // War confirmation popup
  pendingWarAttack: PendingWarAttack | null

  // Event log
  events: GameEvent[]

  // Actions
  startGame: (config: GameConfig) => void
  dispatch: (action: GameAction) => ActionResult
  selectTile: (coord: HexCoord | null) => void
  selectUnit: (unitId: UnitId | null) => void
  selectSettlement: (settlementId: SettlementId | null) => void
  dismissLootboxReward: () => void
  addEvent: (message: string, type: GameEvent['type']) => void
  confirmWarAttack: () => void
  cancelWarAttack: () => void
}

// =============================================================================
// Internal State
// =============================================================================

interface InternalState {
  gameState: GameState | null
  isLoading: boolean
  error: string | null
  selectedTile: HexCoord | null
  selectedUnit: UnitId | null
  selectedSettlement: SettlementId | null
  pendingLootboxReward: LootboxRewardInfo | null
  pendingWarAttack: PendingWarAttack | null
  events: GameEvent[]
  eventIdCounter: number
}

type InternalAction =
  | { type: 'START_GAME'; config: GameConfig }
  | { type: 'SET_STATE'; state: GameState; lootboxReward?: LootboxRewardInfo }
  | { type: 'SET_PENDING_WAR_ATTACK'; attack: PendingWarAttack | null }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SELECT_TILE'; coord: HexCoord | null }
  | { type: 'SELECT_UNIT'; unitId: UnitId | null }
  | { type: 'SELECT_SETTLEMENT'; settlementId: SettlementId | null }
  | { type: 'DISMISS_LOOTBOX_REWARD' }
  | { type: 'ADD_EVENT'; message: string; eventType: GameEvent['type']; turn: number }
  | { type: 'CLEAR_EVENTS' }

function internalReducer(state: InternalState, action: InternalAction): InternalState {
  switch (action.type) {
    case 'START_GAME': {
      // Create initial game state
      let gameState = createInitialState(action.config)

      // Generate map
      const { map, startPositions, lootboxes, barbarianCamps } = generateMap({
        width: gameState.map.width,
        height: gameState.map.height,
        seed: action.config.seed,
        playerCount: gameState.players.length,
      })

      // Apply map to state
      gameState = {
        ...gameState,
        map,
        lootboxes,
        barbarianCamps,
      }

      // Reveal starting areas for each player
      const newFog = new Map(gameState.fog)
      gameState.players.forEach((player, index) => {
        const startPos = startPositions[index]
        if (startPos) {
          const visibleHexes = new Set<string>()
          // Reveal 3-hex radius around start
          for (let dq = -3; dq <= 3; dq++) {
            for (let dr = -3; dr <= 3; dr++) {
              const q = startPos.q + dq
              const r = startPos.r + dr
              if (q >= 0 && q < map.width && r >= 0 && r < map.height) {
                visibleHexes.add(`${q},${r}`)
              }
            }
          }
          newFog.set(player.tribeId, visibleHexes)
        }
      })
      gameState = { ...gameState, fog: newFog }

      // Spawn starting units for each player (settler + scout)
      const unitRng = createRng(action.config.seed + 1000) // Offset seed for unit rarity
      gameState.players.forEach((player, index) => {
        const startPos = startPositions[index]
        if (startPos) {
          // Create settler (no rarity for civilian units)
          const settler = createUnit({
            type: 'settler',
            owner: player.tribeId,
            position: startPos,
            rarity: 'common',
          })
          gameState = addUnit(gameState, settler)

          // Create scout with rarity roll
          const scout = createUnit({
            type: 'scout',
            owner: player.tribeId,
            position: startPos,
            rng: unitRng,
          })
          gameState = addUnit(gameState, scout)
        }
      })

      return {
        ...state,
        gameState,
        isLoading: false,
        error: null,
        selectedTile: null,
        selectedUnit: null,
        selectedSettlement: null,
        pendingLootboxReward: null,
        events: [],
        eventIdCounter: 0,
      }
    }

    case 'SET_STATE':
      return {
        ...state,
        gameState: action.state,
        pendingLootboxReward: action.lootboxReward ?? state.pendingLootboxReward,
      }

    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false }

    case 'SELECT_TILE':
      return { ...state, selectedTile: action.coord }

    case 'SELECT_UNIT':
      return { ...state, selectedUnit: action.unitId }

    case 'SELECT_SETTLEMENT':
      return { ...state, selectedSettlement: action.settlementId }

    case 'DISMISS_LOOTBOX_REWARD':
      return { ...state, pendingLootboxReward: null }

    case 'SET_PENDING_WAR_ATTACK':
      return { ...state, pendingWarAttack: action.attack }

    case 'ADD_EVENT': {
      const newEvent: GameEvent = {
        id: `event-${state.eventIdCounter}`,
        message: action.message,
        type: action.eventType,
        turn: action.turn,
      }
      // Keep newest events first, max 10 events
      const newEvents = [newEvent, ...state.events].slice(0, 10)
      return {
        ...state,
        events: newEvents,
        eventIdCounter: state.eventIdCounter + 1,
      }
    }

    case 'CLEAR_EVENTS':
      return { ...state, events: [] }

    default:
      return state
  }
}

// =============================================================================
// Context
// =============================================================================

const GameContext = createContext<GameContextValue | null>(null)

/**
 * Event info for AI actions affecting human player
 */
interface AIEvent {
  message: string
  turn: number
  type: 'combat' | 'diplomacy'
}

/**
 * Runs AI turns until we reach a human player
 * Returns the new state and any events where AI affected human player
 */
function runAITurns(state: GameState, humanTribeId: TribeId): { state: GameState; events: AIEvent[] } {
  let currentState = state
  const events: AIEvent[] = []
  const maxIterations = 10 // Safety limit

  // Helper to get tribe display name
  const getTribeName = (tribeId: TribeId): string => {
    const player = currentState.players.find(p => p.tribeId === tribeId)
    return player?.tribeName
      ? player.tribeName.charAt(0).toUpperCase() + player.tribeName.slice(1)
      : 'Unknown'
  }

  for (let i = 0; i < maxIterations; i++) {
    const currentPlayer = currentState.players.find(
      (p) => p.tribeId === currentState.currentPlayer
    )

    // Stop if it's a human player's turn
    if (!currentPlayer || currentPlayer.isHuman) {
      break
    }

    // Generate and execute AI actions
    const actions = generateAIActions(currentState, currentState.currentPlayer)

    for (const action of actions) {
      // Track war declarations against human player
      if (action.type === 'DECLARE_WAR' && action.target === humanTribeId) {
        const result = applyAction(currentState, action)
        if (result.success && result.state) {
          currentState = result.state
          const attackerName = getTribeName(currentState.currentPlayer)
          events.push({
            message: `${attackerName} DECLARES WAR on You!`,
            turn: currentState.turn,
            type: 'diplomacy',
          })
        }
        continue
      }

      // Track attack actions targeting human player's units
      if (action.type === 'ATTACK') {
        const attacker = currentState.units.get(action.attackerId)
        const target = currentState.units.get(action.targetId)

        // Only track attacks on human player's units
        if (attacker && target && target.owner === humanTribeId) {
          const attackerHealthBefore = attacker.health
          const targetHealthBefore = target.health

          const result = applyAction(currentState, action)
          if (result.success && result.state) {
            currentState = result.state

            // Calculate damage from new state
            const newAttacker = currentState.units.get(action.attackerId)
            const newTarget = currentState.units.get(action.targetId)
            const attackerDamage = newAttacker ? attackerHealthBefore - newAttacker.health : attackerHealthBefore
            const targetDamage = newTarget ? targetHealthBefore - newTarget.health : targetHealthBefore

            // Find tribe names
            const attackerTribe = getTribeName(attacker.owner)
            const targetTribe = getTribeName(target.owner)

            // Format unit type names
            const formatType = (type: string) => type.replace(/_/g, ' ')

            // Build message
            let message = `${attackerTribe} ${formatType(attacker.type)}`
            if (attackerDamage > 0) message += ` (-${attackerDamage} HP)`
            message += ` attacks ${targetTribe} ${formatType(target.type)}`
            message += ` (-${targetDamage} HP)`
            if (!newTarget) message += ' - KILLED!'
            if (!newAttacker) message += ' - Attacker died!'

            events.push({ message, turn: currentState.turn, type: 'combat' })
          }
          continue // Skip the normal action application below
        }
      }

      const result = applyAction(currentState, action)
      if (result.success && result.state) {
        currentState = result.state
      }

      // Stop processing actions after END_TURN
      if (action.type === 'END_TURN') {
        break
      }
    }
  }

  return { state: currentState, events }
}

const initialState: InternalState = {
  gameState: null,
  isLoading: false,
  error: null,
  selectedTile: null,
  selectedUnit: null,
  selectedSettlement: null,
  pendingLootboxReward: null,
  pendingWarAttack: null,
  events: [],
  eventIdCounter: 0,
}

// Helper to detect lootbox claims by comparing states
function detectLootboxClaim(
  oldState: GameState,
  newState: GameState
): LootboxRewardInfo | null {
  // Find a lootbox that was unclaimed in old state but claimed in new state
  for (let i = 0; i < newState.lootboxes.length; i++) {
    const newLb = newState.lootboxes[i]
    const oldLb = oldState.lootboxes[i]
    if (newLb && oldLb && newLb.claimed && !oldLb.claimed && newLb.reward) {
      // Generate human-readable details
      const details = getRewardDetails(newLb.reward, newState)
      return { reward: newLb.reward, details }
    }
  }
  return null
}

// Generate human-readable reward description
function getRewardDetails(reward: LootboxReward, _state: GameState): string {
  switch (reward) {
    case 'airdrop':
      return 'Gold bonus received!'
    case 'alpha_leak':
      return 'Research boost received!'
    case 'og_holder':
      return 'Free warrior unit spawned!'
    case 'community_growth':
      return 'Growth boost to your capital!'
    case 'scout':
      return 'Large area revealed on the map!'
    default:
      return 'Reward claimed!'
  }
}

// Format reward name for event log
function formatRewardName(reward: LootboxReward): string {
  switch (reward) {
    case 'airdrop':
      return 'Airdrop'
    case 'alpha_leak':
      return 'Alpha Leak'
    case 'og_holder':
      return 'OG Holder'
    case 'community_growth':
      return 'Community Growth'
    case 'scout':
      return 'Scout'
    default:
      return 'Mystery'
  }
}

// Detect research completion by comparing old and new player state
function detectResearchCompletion(
  oldState: GameState,
  newState: GameState,
  tribeId: TribeId
): string | null {
  const oldPlayer = oldState.players.find(p => p.tribeId === tribeId)
  const newPlayer = newState.players.find(p => p.tribeId === tribeId)
  if (!oldPlayer || !newPlayer) return null

  // Check if a tech was completed (was researching, now not, and it's in completed list)
  if (oldPlayer.currentResearch && !newPlayer.currentResearch) {
    // Find the newly completed tech
    const newlyCompleted = newPlayer.researchedTechs.find(
      (techId) => !oldPlayer.researchedTechs.includes(techId)
    )
    if (newlyCompleted) {
      const tech = getTech(newlyCompleted)
      return tech?.name ?? newlyCompleted
    }
  }
  return null
}

// Detect culture completion by comparing old and new player state
function detectCultureCompletion(
  oldState: GameState,
  newState: GameState,
  tribeId: TribeId
): string | null {
  const oldPlayer = oldState.players.find(p => p.tribeId === tribeId)
  const newPlayer = newState.players.find(p => p.tribeId === tribeId)
  if (!oldPlayer || !newPlayer) return null

  // Check if a culture was completed
  if (oldPlayer.currentCulture && !newPlayer.currentCulture) {
    const newlyCompleted = newPlayer.unlockedCultures.find(
      (cultureId) => !oldPlayer.unlockedCultures.includes(cultureId)
    )
    if (newlyCompleted) {
      const culture = getCulture(newlyCompleted)
      return culture?.name ?? newlyCompleted
    }
  }
  return null
}

// Detect golden age starting
function detectGoldenAgeStart(
  oldState: GameState,
  newState: GameState,
  tribeId: TribeId
): boolean {
  const oldPlayer = oldState.players.find(p => p.tribeId === tribeId)
  const newPlayer = newState.players.find(p => p.tribeId === tribeId)
  if (!oldPlayer || !newPlayer) return false

  // Golden age just started if it wasn't active before but is now
  return !oldPlayer.goldenAge.active && newPlayer.goldenAge.active
}

export function GameProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, internalDispatch] = useReducer(internalReducer, initialState)

  const startGame = useCallback((config: GameConfig) => {
    internalDispatch({ type: 'START_GAME', config })
  }, [])

  const dispatch = useCallback(
    (action: GameAction): ActionResult => {
      if (!state.gameState) {
        return { success: false, error: 'Game not started' }
      }

      const oldState = state.gameState

      // Check if this is an attack on a non-war target - if so, show confirmation
      if (action.type === 'ATTACK') {
        const attacker = oldState.units.get(action.attackerId)
        const target = oldState.units.get(action.targetId)

        if (attacker && target && !areAtWar(oldState, attacker.owner, target.owner)) {
          // Find tribe names for the popup
          const attackerPlayer = oldState.players.find(p => p.tribeId === attacker.owner)
          const targetPlayer = oldState.players.find(p => p.tribeId === target.owner)

          internalDispatch({
            type: 'SET_PENDING_WAR_ATTACK',
            attack: {
              attackerId: action.attackerId,
              targetId: action.targetId,
              attackerTribe: attackerPlayer?.tribeName ?? 'Unknown',
              defenderTribe: targetPlayer?.tribeName ?? 'Unknown',
            },
          })

          // Return success: false to prevent the attack from happening yet
          return { success: false, error: 'War confirmation required' }
        }
      }

      const result = applyAction(oldState, action)
      if (!result.success) {
        console.error('Action failed:', result.error)
        return result
      }

      let currentState = result.state

      // Detect lootbox claims (only for human player actions like MOVE_UNIT)
      let lootboxReward: LootboxRewardInfo | null = null
      if (action.type === 'MOVE_UNIT') {
        lootboxReward = detectLootboxClaim(oldState, currentState)

        // Add lootbox event if claimed
        if (lootboxReward) {
          const unit = currentState.units.get(action.unitId)
          const player = currentState.players.find(p => p.tribeId === currentState.currentPlayer)
          const tribeName = player?.tribeName ?? 'Unknown'
          const unitType = unit?.type.replace(/_/g, ' ') ?? 'unit'
          const rewardName = formatRewardName(lootboxReward.reward)
          const message = `${tribeName} ${unitType} opens ${rewardName} lootbox!`
          internalDispatch({
            type: 'ADD_EVENT',
            message,
            eventType: 'lootbox',
            turn: currentState.turn,
          })
        }
      }

      // Detect milestone selection
      if (action.type === 'SELECT_MILESTONE') {
        const settlement = currentState.settlements.get(action.settlementId)
        const milestone = getMilestoneForLevel(action.level)
        if (settlement && milestone) {
          const option = action.choice === 'a' ? milestone.optionA : milestone.optionB
          internalDispatch({
            type: 'ADD_EVENT',
            message: `${settlement.name} chose ${option.name} at Level ${action.level}!`,
            eventType: 'milestone',
            turn: currentState.turn,
          })
        }
      }

      // Detect research completion
      const completedTech = detectResearchCompletion(oldState, currentState, currentState.currentPlayer)
      if (completedTech) {
        internalDispatch({
          type: 'ADD_EVENT',
          message: `Research complete: ${completedTech}!`,
          eventType: 'research',
          turn: currentState.turn,
        })
      }

      // Detect culture completion
      const completedCulture = detectCultureCompletion(oldState, currentState, currentState.currentPlayer)
      if (completedCulture) {
        internalDispatch({
          type: 'ADD_EVENT',
          message: `Culture unlocked: ${completedCulture}!`,
          eventType: 'research',
          turn: currentState.turn,
        })
      }

      // Detect golden age start
      if (detectGoldenAgeStart(oldState, currentState, currentState.currentPlayer)) {
        const newPlayer = currentState.players.find(p => p.tribeId === currentState.currentPlayer)
        const turns = newPlayer?.goldenAge.turnsRemaining ?? 0
        internalDispatch({
          type: 'ADD_EVENT',
          message: `Golden Era begins! (+25% yields for ${turns} turns)`,
          eventType: 'golden',
          turn: currentState.turn,
        })
      }

      // Clear events and run AI after END_TURN
      if (action.type === 'END_TURN') {
        internalDispatch({ type: 'CLEAR_EVENTS' })

        // Find human player's tribe ID to track attacks on their units
        const humanPlayer = currentState.players.find(p => p.isHuman)
        const humanTribeId = humanPlayer?.tribeId ?? currentState.currentPlayer

        const aiResult = runAITurns(currentState, humanTribeId)
        currentState = aiResult.state

        // Dispatch events for AI actions affecting human player
        for (const event of aiResult.events) {
          internalDispatch({
            type: 'ADD_EVENT',
            message: event.message,
            eventType: event.type,
            turn: event.turn,
          })
        }
      }

      internalDispatch(
        lootboxReward
          ? { type: 'SET_STATE', state: currentState, lootboxReward }
          : { type: 'SET_STATE', state: currentState }
      )
      return result
    },
    [state.gameState]
  )

  const selectTile = useCallback((coord: HexCoord | null) => {
    internalDispatch({ type: 'SELECT_TILE', coord })
  }, [])

  const selectUnit = useCallback((unitId: UnitId | null) => {
    internalDispatch({ type: 'SELECT_UNIT', unitId })
  }, [])

  const selectSettlement = useCallback((settlementId: SettlementId | null) => {
    internalDispatch({ type: 'SELECT_SETTLEMENT', settlementId })
  }, [])

  const dismissLootboxReward = useCallback(() => {
    internalDispatch({ type: 'DISMISS_LOOTBOX_REWARD' })
  }, [])

  const addEvent = useCallback(
    (message: string, eventType: GameEvent['type']) => {
      const turn = state.gameState?.turn ?? 0
      internalDispatch({ type: 'ADD_EVENT', message, eventType, turn })
    },
    [state.gameState?.turn]
  )

  const confirmWarAttack = useCallback(() => {
    if (!state.gameState || !state.pendingWarAttack) return

    const { attackerId, targetId } = state.pendingWarAttack
    const attacker = state.gameState.units.get(attackerId)
    const target = state.gameState.units.get(targetId)

    if (!attacker || !target) {
      // Units no longer exist, just clear the pending attack
      internalDispatch({ type: 'SET_PENDING_WAR_ATTACK', attack: null })
      return
    }

    // First declare war
    const warResult = applyAction(state.gameState, {
      type: 'DECLARE_WAR',
      target: target.owner,
    })

    if (!warResult.success) {
      console.error('Failed to declare war:', warResult.error)
      internalDispatch({ type: 'SET_PENDING_WAR_ATTACK', attack: null })
      return
    }

    // Add war declaration event
    const targetPlayer = warResult.state.players.find(p => p.tribeId === target.owner)
    const targetName = targetPlayer?.tribeName
      ? targetPlayer.tribeName.charAt(0).toUpperCase() + targetPlayer.tribeName.slice(1)
      : 'enemy'
    internalDispatch({
      type: 'ADD_EVENT',
      message: `You DECLARE WAR on ${targetName}!`,
      eventType: 'diplomacy',
      turn: warResult.state.turn,
    })

    // Now execute the attack
    const attackResult = applyAction(warResult.state, {
      type: 'ATTACK',
      attackerId,
      targetId,
    })

    if (attackResult.success && attackResult.state) {
      internalDispatch({ type: 'SET_STATE', state: attackResult.state })
    }

    // Clear the pending attack
    internalDispatch({ type: 'SET_PENDING_WAR_ATTACK', attack: null })
  }, [state.gameState, state.pendingWarAttack])

  const cancelWarAttack = useCallback(() => {
    internalDispatch({ type: 'SET_PENDING_WAR_ATTACK', attack: null })
  }, [])

  const value: GameContextValue = {
    state: state.gameState,
    isLoading: state.isLoading,
    error: state.error,
    selectedTile: state.selectedTile,
    selectedUnit: state.selectedUnit,
    selectedSettlement: state.selectedSettlement,
    pendingLootboxReward: state.pendingLootboxReward,
    pendingWarAttack: state.pendingWarAttack,
    events: state.events,
    startGame,
    dispatch,
    selectTile,
    selectUnit,
    selectSettlement,
    dismissLootboxReward,
    addEvent,
    confirmWarAttack,
    cancelWarAttack,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGameContext(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider')
  }
  return context
}
