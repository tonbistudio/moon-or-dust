// HUD overlay container for game UI elements

import { useState, useMemo } from 'react'
import type { TechId, HexCoord, Unit } from '@tribes/game-core'
import { getTech, getResearchProgress, getTurnsToComplete, hexKey, getValidTargets } from '@tribes/game-core'
import { useGame, useCurrentPlayer, useSelectedSettlement, useSelectedUnit } from '../hooks/useGame'
import { useGameContext } from '../context/GameContext'
import { SettlementPanel } from './SettlementPanel'
import { UnitActionsPanel } from './UnitActionsPanel'
import { TechTreePanel } from './tech'
import { LootboxRewardPopup } from './LootboxRewardPopup'
import { YieldIcon } from './YieldIcon'
import { CombatPreviewPanel } from './CombatPreviewPanel'
import { EventLog } from './EventLog'
import { DiplomacyPanel } from './DiplomacyPanel'
import { WarConfirmationPopup } from './WarConfirmationPopup'

interface GameUIProps {
  hoveredTile?: HexCoord | null
}

export function GameUI({ hoveredTile }: GameUIProps): JSX.Element | null {
  const { state, dispatch } = useGame()
  const {
    pendingLootboxReward,
    dismissLootboxReward,
    pendingWarAttack,
    confirmWarAttack,
    cancelWarAttack,
    events,
  } = useGameContext()
  const currentPlayer = useCurrentPlayer()
  const selectedSettlement = useSelectedSettlement()
  const selectedUnit = useSelectedUnit()
  const [showTechTree, setShowTechTree] = useState(false)

  // Find enemy unit on hovered tile for combat preview
  const hoveredEnemy: Unit | null = useMemo(() => {
    if (!state || !hoveredTile || !selectedUnit) return null
    if (selectedUnit.owner !== state.currentPlayer) return null

    // Check if hovered tile has valid attack target
    const targets = getValidTargets(state, selectedUnit)
    const hoveredKey = hexKey(hoveredTile)
    return targets.find(t => hexKey(t.position) === hoveredKey) ?? null
  }, [state, hoveredTile, selectedUnit])

  if (!state || !currentPlayer) return null

  const handleEndTurn = () => {
    dispatch({ type: 'END_TURN' })
  }

  const handleSelectTech = (techId: TechId) => {
    dispatch({ type: 'START_RESEARCH', techId })
    setShowTechTree(false)
  }

  // Current research info
  const currentResearch = currentPlayer.currentResearch ? getTech(currentPlayer.currentResearch) : null
  const progress = getResearchProgress(currentPlayer)
  const turnsRemaining = getTurnsToComplete(currentPlayer)

  // Check if selected settlement belongs to current player
  const canInteractWithSettlement =
    selectedSettlement && selectedSettlement.owner === state.currentPlayer

  // Check if selected unit belongs to current player
  const canInteractWithUnit =
    selectedUnit && selectedUnit.owner === state.currentPlayer

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Bar - Turn info, yields, floor price */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', color: '#fff', alignItems: 'center' }}>
          <span>Turn {state.turn}/{state.maxTurns}</span>
          <YieldIcon type="gold" value={currentPlayer.treasury} />
          <YieldIcon type="alpha" value={currentPlayer.yields.alpha} />
          <YieldIcon type="vibes" value={currentPlayer.cultureProgress} />

          {/* Research Button with Progress */}
          <button
            onClick={() => setShowTechTree(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              background: currentResearch ? '#1a2a3a' : '#2a2a3a',
              border: '1px solid #64b5f6',
              borderRadius: '4px',
              color: '#64b5f6',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {currentResearch ? (
              <>
                <span>{currentResearch.name}</span>
                <span style={{ color: '#888', fontSize: '11px' }}>
                  ({progress?.percent ?? 0}% - {turnsRemaining === Infinity ? '∞' : turnsRemaining}t)
                </span>
              </>
            ) : (
              <span>Research</span>
            )}
          </button>

          {/* Diplomacy Panel */}
          <DiplomacyPanel currentPlayer={currentPlayer} />
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
            Floor Price: {state.floorPrices.get(state.currentPlayer) ?? 0}
          </span>
          <button
            onClick={handleEndTurn}
            style={{
              padding: '8px 16px',
              background: '#4caf50',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            End Turn
          </button>
        </div>
      </div>

      {/* Main content area with side panel */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Left Side Panel - Settlement or Unit info */}
        {canInteractWithSettlement && (
          <div style={{ pointerEvents: 'auto', height: '100%' }}>
            <SettlementPanel settlement={selectedSettlement} />
          </div>
        )}

        {/* Unit Actions Panel (only if owned by current player and no settlement selected) */}
        {canInteractWithUnit && !canInteractWithSettlement && (
          <div style={{ pointerEvents: 'auto' }}>
            <UnitActionsPanel unit={selectedUnit} />
          </div>
        )}

        {/* Spacer for game view */}
        <div style={{ flex: 1 }} />
      </div>

      {/* Tech Tree Modal */}
      {showTechTree && (
        <div style={{ pointerEvents: 'auto' }}>
          <TechTreePanel
            player={currentPlayer}
            onSelectTech={handleSelectTech}
            onClose={() => setShowTechTree(false)}
          />
        </div>
      )}

      {/* Lootbox Reward Popup */}
      {pendingLootboxReward && (
        <div style={{ pointerEvents: 'auto' }}>
          <LootboxRewardPopup
            reward={pendingLootboxReward}
            onDismiss={dismissLootboxReward}
          />
        </div>
      )}

      {/* War Confirmation Popup */}
      {pendingWarAttack && (
        <div style={{ pointerEvents: 'auto' }}>
          <WarConfirmationPopup
            attackerTribe={pendingWarAttack.attackerTribe}
            defenderTribe={pendingWarAttack.defenderTribe}
            onConfirm={confirmWarAttack}
            onCancel={cancelWarAttack}
          />
        </div>
      )}

      {/* Combat Preview Panel - shows when hovering over enemy with unit selected */}
      {hoveredEnemy && selectedUnit && (
        <div style={{ pointerEvents: 'none' }}>
          <CombatPreviewPanel
            attacker={selectedUnit}
            defender={hoveredEnemy}
          />
        </div>
      )}

      {/* Event Log - bottom right */}
      <EventLog events={events} />
    </div>
  )
}
