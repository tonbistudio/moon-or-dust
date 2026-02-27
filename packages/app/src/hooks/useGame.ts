// Hook for easy access to game state and actions

import { useCallback, useMemo } from 'react'
import type {
  HexCoord,
  SettlementId,
  UnitId,
  Settlement,
  Unit,
  Player,
  UnitRarity,
} from '@tribes/game-core'
import { hexKey, getCurrentPlayer, canAttackSettlement, areAtWar } from '@tribes/game-core'
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
  const { state, selectedUnit, selectedSettlement, dispatch, selectTile, selectUnit, selectSettlement, addEvent } = useGameContext()

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
          const attackerHealthBefore = attacker.health
          const targetHealthBefore = target.health
          const result = dispatch({
            type: 'ATTACK',
            attackerId: selectedUnit,
            targetId: target.id,
          })
          if (result.success && result.state) {
            // Calculate damage from new state
            const newAttacker = result.state.units.get(selectedUnit)
            const newTarget = result.state.units.get(target.id)
            const attackerDamage = newAttacker ? attackerHealthBefore - newAttacker.health : attackerHealthBefore
            const targetDamage = newTarget ? targetHealthBefore - newTarget.health : targetHealthBefore

            // Find tribe names for the message
            const attackerPlayer = state.players.find(p => p.tribeId === attacker.owner)
            const targetPlayer = state.players.find(p => p.tribeId === target.owner)
            const attackerTribe = attackerPlayer?.tribeName ?? 'Unknown'
            const targetTribe = targetPlayer?.tribeName ?? 'Unknown'

            // Format unit type names
            const formatType = (type: string) => type.replace(/_/g, ' ')

            // Build message
            let message = `${attackerTribe} ${formatType(attacker.type)}`
            if (attackerDamage > 0) message += ` (-${attackerDamage} HP)`
            message += ` attacks ${targetTribe} ${formatType(target.type)}`
            message += ` (-${targetDamage} HP)`
            if (!newTarget) message += ' - KILLED!'
            if (!newAttacker) message += ' - Attacker died!'

            addEvent(message, 'combat')

            // Auto-cycle after attack if attacker has no moves left
            const postAttacker = result.state.units.get(selectedUnit)
            if (postAttacker && postAttacker.movementRemaining > 0 && !postAttacker.hasActed) return
            // Find next actionable unit
            const nextAfterAttack = Array.from(result.state.units.values())
              .filter(u => u.owner === result.state!.currentPlayer && u.movementRemaining > 0 && !u.hasActed && !u.sleeping && u.id !== selectedUnit)
              .sort((a, b) => a.id.localeCompare(b.id))[0]
            if (nextAfterAttack) selectUnit(nextAfterAttack.id)
            else selectUnit(null)
            return
          }
          // If attack failed, continue to other logic
        }
      }

      // If clicking on enemy settlement (with no defending units) and we have a selected combat unit, try to attack it
      if (settlementAtTile && settlementAtTile.owner !== state.currentPlayer && selectedUnit) {
        const attacker = state.units.get(selectedUnit)
        if (attacker && attacker.owner === state.currentPlayer && !attacker.hasActed) {
          // Check if we're at war and can attack
          if (areAtWar(state, attacker.owner, settlementAtTile.owner)) {
            const canAttackResult = canAttackSettlement(state, attacker, settlementAtTile)
            if (canAttackResult.canAttack) {
              const settlementHealthBefore = settlementAtTile.health
              const result = dispatch({
                type: 'ATTACK_SETTLEMENT',
                attackerId: selectedUnit,
                settlementId: settlementAtTile.id,
              })
              if (result.success && result.state) {
                // Calculate damage from new state
                const newSettlement = result.state.settlements.get(settlementAtTile.id)
                const settlementDamage = newSettlement
                  ? settlementHealthBefore - newSettlement.health
                  : settlementHealthBefore

                // Find tribe names for the message
                const attackerPlayer = state.players.find(p => p.tribeId === attacker.owner)
                const defenderPlayer = state.players.find(p => p.tribeId === settlementAtTile.owner)
                const attackerTribe = attackerPlayer?.tribeName ?? 'Unknown'
                const defenderTribe = defenderPlayer?.tribeName ?? 'Unknown'

                // Format unit type names
                const formatType = (type: string) => type.replace(/_/g, ' ')

                // Build message
                let message = `${attackerTribe} ${formatType(attacker.type)} attacks ${defenderTribe} ${settlementAtTile.name} (-${settlementDamage} HP)`
                if (!newSettlement || newSettlement.health <= 0) {
                  message += ' - CONQUERED!'
                }

                addEvent(message, 'combat')

                // Keep unit selected after attack
                return
              }
            } else {
              addEvent(canAttackResult.reason ?? 'Cannot attack settlement', 'warning')
              return
            }
          } else {
            addEvent(`Cannot attack ${settlementAtTile.name} - not at war`, 'warning')
            return
          }
        }
      }

      // If clicking on a conquered enemy settlement (0 HP) and we have a selected unit, capture it
      if (settlementAtTile && settlementAtTile.owner !== state.currentPlayer && settlementAtTile.health <= 0 && selectedUnit) {
        const mover = state.units.get(selectedUnit)
        if (mover && mover.owner === state.currentPlayer && mover.movementRemaining > 0) {
          // Move unit to the settlement tile first (if not already there)
          if (hexKey(mover.position) !== key) {
            const moveResult = dispatch({ type: 'MOVE_UNIT', unitId: selectedUnit, to: coord })
            if (!moveResult.success || !moveResult.state) {
              addEvent('Cannot reach conquered settlement', 'warning')
              return
            }
          }
          // Capture the settlement
          const captureResult = dispatch({ type: 'CAPTURE_SETTLEMENT', settlementId: settlementAtTile.id })
          if (captureResult.success) {
            addEvent(`Captured ${settlementAtTile.name}!`, 'combat')
          }
          return
        }
      }

      // If a unit is selected elsewhere, try to move it onto an own settlement tile
      if (selectedUnit && settlementAtTile && settlementAtTile.owner === state.currentPlayer) {
        const mover = state.units.get(selectedUnit)
        if (mover && mover.owner === state.currentPlayer && mover.movementRemaining > 0) {
          if (hexKey(mover.position) !== key) {
            const moveResult = dispatch({ type: 'MOVE_UNIT', unitId: selectedUnit, to: coord })
            if (moveResult.success && moveResult.state) {
              const movedUnit = moveResult.state.units.get(selectedUnit)
              if (movedUnit && movedUnit.movementRemaining > 0) return
              // Auto-cycle to next actionable unit
              const next = Array.from(moveResult.state.units.values())
                .filter(u => u.owner === moveResult.state!.currentPlayer && u.movementRemaining > 0 && !u.hasActed && !u.sleeping && u.id !== selectedUnit)
                .sort((a, b) => a.id.localeCompare(b.id))[0]
              if (next) { selectUnit(next.id); selectSettlement(null) }
              else { selectUnit(null); selectSettlement(settlementAtTile.id) }
              return
            }
            // If move failed, fall through to settlement selection
          }
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
            if (result.success && result.state) {
              const movedUnit = result.state.units.get(selectedUnit)
              if (movedUnit && movedUnit.movementRemaining > 0) return // Still has moves
              // Auto-cycle to next actionable unit
              const next = Array.from(result.state.units.values())
                .filter(u => u.owner === result.state!.currentPlayer && u.movementRemaining > 0 && !u.hasActed && !u.sleeping && u.id !== selectedUnit)
                .sort((a, b) => a.id.localeCompare(b.id))[0]
              if (next) selectUnit(next.id)
              else selectUnit(null)
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
    [state, selectedUnit, selectedSettlement, dispatch, selectTile, selectUnit, selectSettlement, addEvent]
  )
}

/**
 * Hook for handling right-click (deselect unit/settlement)
 */
export function useTileRightClick() {
  const { selectUnit, selectSettlement } = useGameContext()

  return useCallback(
    (_coord: HexCoord) => {
      // Right click clears all selections
      selectUnit(null)
      selectSettlement(null)
    },
    [selectUnit, selectSettlement]
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

  const purchase = useCallback(
    (settlementId: SettlementId, itemType: 'unit' | 'building', itemId: string) => {
      return dispatch({
        type: 'PURCHASE',
        settlementId,
        itemType,
        itemId,
      })
    },
    [dispatch]
  )

  const mintUnit = useCallback(
    (settlementId: SettlementId, index: number, rarity?: UnitRarity) => {
      const action: { type: 'MINT_UNIT'; settlementId: SettlementId; index: number; rarity?: UnitRarity } = {
        type: 'MINT_UNIT',
        settlementId,
        index,
      }
      if (rarity !== undefined) {
        action.rarity = rarity
      }
      return dispatch(action)
    },
    [dispatch]
  )

  return useMemo(
    () => ({
      dispatch,
      endTurn,
      startProduction,
      cancelProduction,
      purchase,
      mintUnit,
    }),
    [dispatch, endTurn, startProduction, cancelProduction, purchase, mintUnit]
  )
}
