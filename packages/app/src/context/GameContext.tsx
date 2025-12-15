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
} from '@tribes/game-core'
import {
  createInitialState,
  applyAction,
  generateMap,
  createUnit,
  addUnit,
  createRng,
  generateAIActions,
  type GameConfig,
  type ActionResult,
} from '@tribes/game-core'

// =============================================================================
// Types
// =============================================================================

export interface GameContextValue {
  // Game state
  state: GameState | null
  isLoading: boolean
  error: string | null

  // Selection state
  selectedTile: HexCoord | null
  selectedUnit: UnitId | null
  selectedSettlement: SettlementId | null

  // Actions
  startGame: (config: GameConfig) => void
  dispatch: (action: GameAction) => ActionResult
  selectTile: (coord: HexCoord | null) => void
  selectUnit: (unitId: UnitId | null) => void
  selectSettlement: (settlementId: SettlementId | null) => void
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
}

type InternalAction =
  | { type: 'START_GAME'; config: GameConfig }
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SELECT_TILE'; coord: HexCoord | null }
  | { type: 'SELECT_UNIT'; unitId: UnitId | null }
  | { type: 'SELECT_SETTLEMENT'; settlementId: SettlementId | null }

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
      }
    }

    case 'SET_STATE':
      return { ...state, gameState: action.state }

    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false }

    case 'SELECT_TILE':
      return { ...state, selectedTile: action.coord }

    case 'SELECT_UNIT':
      return { ...state, selectedUnit: action.unitId }

    case 'SELECT_SETTLEMENT':
      return { ...state, selectedSettlement: action.settlementId }

    default:
      return state
  }
}

// =============================================================================
// Context
// =============================================================================

const GameContext = createContext<GameContextValue | null>(null)

/**
 * Runs AI turns until we reach a human player
 */
function runAITurns(state: GameState): GameState {
  let currentState = state
  const maxIterations = 10 // Safety limit

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

  return currentState
}

const initialState: InternalState = {
  gameState: null,
  isLoading: false,
  error: null,
  selectedTile: null,
  selectedUnit: null,
  selectedSettlement: null,
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

      const result = applyAction(state.gameState, action)
      if (!result.success) {
        console.error('Action failed:', result.error)
        return result
      }

      let currentState = result.state

      // After END_TURN, run AI turns until we get back to a human player
      if (action.type === 'END_TURN') {
        currentState = runAITurns(currentState)
      }

      internalDispatch({ type: 'SET_STATE', state: currentState })
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

  const value: GameContextValue = {
    state: state.gameState,
    isLoading: state.isLoading,
    error: state.error,
    selectedTile: state.selectedTile,
    selectedUnit: state.selectedUnit,
    selectedSettlement: state.selectedSettlement,
    startGame,
    dispatch,
    selectTile,
    selectUnit,
    selectSettlement,
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
