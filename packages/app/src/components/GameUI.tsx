// HUD overlay container for game UI elements

import { useState } from 'react'
import type { TechId } from '@tribes/game-core'
import { getTech, getResearchProgress, getTurnsToComplete } from '@tribes/game-core'
import { useGame, useCurrentPlayer, useSelectedSettlement, useSelectedUnit } from '../hooks/useGame'
import { SettlementPanel } from './SettlementPanel'
import { UnitActionsPanel } from './UnitActionsPanel'
import { TechTreePanel } from './tech'

export function GameUI(): JSX.Element | null {
  const { state, dispatch } = useGame()
  const currentPlayer = useCurrentPlayer()
  const selectedSettlement = useSelectedSettlement()
  const selectedUnit = useSelectedUnit()
  const [showTechTree, setShowTechTree] = useState(false)

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
        <div style={{ display: 'flex', gap: '24px', color: '#fff', alignItems: 'center' }}>
          <span>Turn {state.turn}/{state.maxTurns}</span>
          <span style={{ color: '#ffd700' }}>Gold: {currentPlayer.treasury}</span>

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

          <span style={{ color: '#ba68c8' }}>Vibes: {currentPlayer.cultureProgress}</span>
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

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom Panel - Selected settlement info (only if owned by current player) */}
      {canInteractWithSettlement && (
        <div style={{ pointerEvents: 'auto' }}>
          <SettlementPanel settlement={selectedSettlement} />
        </div>
      )}

      {/* Unit Actions Panel (only if owned by current player and no settlement selected) */}
      {canInteractWithUnit && !canInteractWithSettlement && (
        <div style={{ pointerEvents: 'auto' }}>
          <UnitActionsPanel unit={selectedUnit} />
        </div>
      )}

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
    </div>
  )
}
