// Hook for easy access to game state and actions

import { useCallback, useMemo } from 'react'
import type {
  HexCoord,
  SettlementId,
  UnitId,
  Settlement,
  Unit,
  Player,
} from '@tribes/game-core'
import { hexKey, getCurrentPlayer } from '@tribes/game-core'
import { useGameContext } from '../context/GameContext'

/**
 * Main hook for accessing game state and actions
 */
export function useGame() {
  const context = useGameContext()
  return context
}

/**
 * Hook for accessing the current player
 */
export function useCurrentPlayer(): Player | null {
  const { state } = useGameContext()
  if (!state) return null
  return getCurrentPlayer(state) ?? null
}

/**
 * Hook for accessing a specific settlement
 */
export function useSettlement(settlementId: SettlementId | null): Settlement | null {
  const { state } = useGameContext()
  if (!state || !settlementId) return null
  return state.settlements.get(settlementId) ?? null
}

/**
 * Hook for accessing the selected settlement
 */
export function useSelectedSettlement(): Settlement | null {
  const { state, selectedSettlement } = useGameContext()
  if (!state || !selectedSettlement) return null
  return state.settlements.get(selectedSettlement) ?? null
}

/**
 * Hook for accessing a specific unit
 */
export function useUnit(unitId: UnitId | null): Unit | null {
  const { state } = useGameContext()
  if (!state || !unitId) return null
  return state.units.get(unitId) ?? null
}

/**
 * Hook for accessing the selected unit
 */
export function useSelectedUnit(): Unit | null {
  const { state, selectedUnit } = useGameContext()
  if (!state || !selectedUnit) return null
  return state.units.get(selectedUnit) ?? null
}

/**
 * Hook for handling tile clicks
 */
export function useTileClick() {
  const { state, selectedUnit, selectedSettlement, dispatch, selectTile, selectUnit, selectSettlement } = useGameContext()

  return useCallback(
    (coord: HexCoord) => {
      if (!state) return

      selectTile(coord)
      const key = hexKey(coord)

      // Find settlement at tile (if any)
      let settlementAtTile: Settlement | null = null
      for (const settlement of state.settlements.values()) {
        if (hexKey(settlement.position) === key) {
          settlementAtTile = settlement
          break
        }
      }

      // Get all units at this tile
      const friendlyUnitsAtTile: Unit[] = []
      const enemyUnitsAtTile: Unit[] = []
      for (const unit of state.units.values()) {
        if (hexKey(unit.position) === key) {
          if (unit.owner === state.currentPlayer) {
            friendlyUnitsAtTile.push(unit)
          } else {
            enemyUnitsAtTile.push(unit)
          }
        }
      }

      // If clicking on enemy units and we have a selected combat unit, try to attack
      if (enemyUnitsAtTile.length > 0 && selectedUnit) {
        const attacker = state.units.get(selectedUnit)
        if (attacker && attacker.owner === state.currentPlayer && !attacker.hasActed) {
          const target = enemyUnitsAtTile[0]!
          const result = dispatch({
            type: 'ATTACK',
            attackerId: selectedUnit,
            targetId: target.id,
          })
          if (result.success) {
            // Keep unit selected after attack (if still alive)
            return
          }
          // If attack failed, continue to other logic
        }
      }

      // Handle tiles with both settlement and units - cycle between them
      if (settlementAtTile && friendlyUnitsAtTile.length > 0) {
        // If settlement is currently selected, switch to first unit
        if (selectedSettlement === settlementAtTile.id) {
          selectSettlement(null)
          selectUnit(friendlyUnitsAtTile[0]!.id)
          return
        }

        // If a unit at this tile is selected, cycle to next unit or back to settlement
        const currentUnitIndex = selectedUnit
          ? friendlyUnitsAtTile.findIndex((u) => u.id === selectedUnit)
          : -1

        if (currentUnitIndex >= 0) {
          const nextIndex = currentUnitIndex + 1
          if (nextIndex < friendlyUnitsAtTile.length) {
            // Cycle to next unit
            selectUnit(friendlyUnitsAtTile[nextIndex]!.id)
          } else {
            // Cycled through all units, go back to settlement
            selectUnit(null)
            selectSettlement(settlementAtTile.id)
          }
          return
        }

        // Nothing selected at this tile yet, select settlement first
        selectSettlement(settlementAtTile.id)
        selectUnit(null)
        return
      }

      // Settlement only (no friendly units)
      if (settlementAtTile) {
        selectSettlement(settlementAtTile.id)
        selectUnit(null)
        return
      }

      // If there are friendly units at this tile, cycle through them
      if (friendlyUnitsAtTile.length > 0) {
        // Find current selection index
        const currentIndex = selectedUnit
          ? friendlyUnitsAtTile.findIndex((u) => u.id === selectedUnit)
          : -1

        // If clicking same tile with a selected unit, cycle to next unit
        if (currentIndex >= 0) {
          const nextIndex = (currentIndex + 1) % friendlyUnitsAtTile.length
          selectUnit(friendlyUnitsAtTile[nextIndex]!.id)
        } else {
          // Select first unit at tile
          selectUnit(friendlyUnitsAtTile[0]!.id)
        }
        selectSettlement(null)
        return
      }

      // If we have a selected unit and clicked an empty tile, try to move
      if (selectedUnit) {
        const unit = state.units.get(selectedUnit)
        if (unit && unit.owner === state.currentPlayer && unit.movementRemaining > 0) {
          // Don't move if clicking the same tile
          if (hexKey(unit.position) !== key) {
            const result = dispatch({
              type: 'MOVE_UNIT',
              unitId: selectedUnit,
              to: coord,
            })
            if (result.success) {
              // Keep unit selected after move
              return
            }
            // If move failed, just deselect
          }
        }
      }

      // Clear selections if nothing found and no move happened
      selectUnit(null)
      selectSettlement(null)
    },
    [state, selectedUnit, selectedSettlement, dispatch, selectTile, selectUnit, selectSettlement]
  )
}

/**
 * Hook for dispatching game actions with convenience methods
 */
export function useGameActions() {
  const { dispatch } = useGameContext()

  const endTurn = useCallback(() => {
    return dispatch({ type: 'END_TURN' })
  }, [dispatch])

  const startProduction = useCallback(
    (
      settlementId: SettlementId,
      itemType: 'unit' | 'building' | 'wonder',
      itemId: string,
      cost: number
    ) => {
      return dispatch({
        type: 'START_PRODUCTION',
        settlementId,
        item: {
          type: itemType,
          id: itemId,
          progress: 0,
          cost,
        },
      })
    },
    [dispatch]
  )

  const cancelProduction = useCallback(
    (settlementId: SettlementId, queueIndex: number) => {
      return dispatch({
        type: 'CANCEL_PRODUCTION',
        settlementId,
        queueIndex,
      })
    },
    [dispatch]
  )

  return useMemo(
    () => ({
      dispatch,
      endTurn,
      startProduction,
      cancelProduction,
    }),
    [dispatch, endTurn, startProduction, cancelProduction]
  )
}
