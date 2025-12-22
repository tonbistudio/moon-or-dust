// Panel for showing actions available for the selected unit

import type { Unit } from '@tribes/game-core'
import { useGame } from '../hooks/useGame'

interface UnitActionsPanelProps {
  unit: Unit
}

export function UnitActionsPanel({ unit }: UnitActionsPanelProps): JSX.Element {
  const { dispatch } = useGame()

  const handleFoundSettlement = () => {
    const result = dispatch({ type: 'FOUND_SETTLEMENT', settlerId: unit.id })
    if (!result.success) {
      console.warn('Failed to found settlement:', result.error)
    }
  }

  const handleBuildFarm = () => {
    const result = dispatch({
      type: 'BUILD_IMPROVEMENT',
      builderId: unit.id,
      improvement: 'farm',
    })
    if (!result.success) {
      console.warn('Failed to build farm:', result.error)
    }
  }

  const handleBuildMine = () => {
    const result = dispatch({
      type: 'BUILD_IMPROVEMENT',
      builderId: unit.id,
      improvement: 'mine',
    })
    if (!result.success) {
      console.warn('Failed to build mine:', result.error)
    }
  }

  const canAct = !unit.hasActed

  return (
    <div
      style={{
        position: 'absolute',
        left: '16px',
        bottom: '16px',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '8px',
        padding: '16px',
        minWidth: '200px',
        color: '#fff',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'capitalize' }}>
          {unit.type}
          {unit.rarity !== 'common' && (
            <span
              style={{
                fontSize: '11px',
                marginLeft: '8px',
                color: getRarityColor(unit.rarity),
                textTransform: 'capitalize',
              }}
            >
              ({unit.rarity})
            </span>
          )}
        </div>

        {/* Health and Movement */}
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
          HP: {unit.health}/{unit.maxHealth} | Moves: {unit.movementRemaining}/{unit.maxMovement}
        </div>

        {/* Combat Stats */}
        <div style={{ fontSize: '12px', marginTop: '6px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {unit.combatStrength > 0 && (
            <span style={{ color: '#ef4444' }} title="Melee Strength">
              ⚔️ {unit.combatStrength}
            </span>
          )}
          {unit.rangedStrength > 0 && (
            <span style={{ color: '#22c55e' }} title="Ranged Strength">
              🏹 {unit.rangedStrength}
            </span>
          )}
          {unit.settlementStrength > 0 && unit.settlementStrength !== unit.combatStrength && (
            <span style={{ color: '#f97316' }} title="Siege Strength (vs Settlements)">
              🏰 {unit.settlementStrength}
            </span>
          )}
        </div>

        {/* XP and Level */}
        {unit.level > 0 && (
          <div style={{ fontSize: '11px', color: '#a855f7', marginTop: '4px' }}>
            Level {unit.level} | XP: {unit.experience}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {unit.type === 'settler' && (
          <button
            onClick={handleFoundSettlement}
            disabled={!canAct}
            style={{
              padding: '8px 12px',
              background: canAct ? '#4caf50' : '#374151',
              border: 'none',
              borderRadius: '4px',
              color: canAct ? '#fff' : '#6b7280',
              cursor: canAct ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              fontSize: '13px',
            }}
          >
            Found Settlement
          </button>
        )}

        {unit.type === 'builder' && (
          <>
            <button
              onClick={handleBuildFarm}
              disabled={!canAct}
              style={{
                padding: '8px 12px',
                background: canAct ? '#3b82f6' : '#374151',
                border: 'none',
                borderRadius: '4px',
                color: canAct ? '#fff' : '#6b7280',
                cursor: canAct ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Build Farm
            </button>
            <button
              onClick={handleBuildMine}
              disabled={!canAct}
              style={{
                padding: '8px 12px',
                background: canAct ? '#3b82f6' : '#374151',
                border: 'none',
                borderRadius: '4px',
                color: canAct ? '#fff' : '#6b7280',
                cursor: canAct ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                fontSize: '13px',
              }}
            >
              Build Mine
            </button>
          </>
        )}

        {unit.type !== 'settler' && unit.type !== 'builder' && (
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            No special actions available
          </div>
        )}
      </div>
    </div>
  )
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'uncommon':
      return '#22c55e'
    case 'rare':
      return '#3b82f6'
    case 'epic':
      return '#a855f7'
    case 'legendary':
      return '#eab308'
    default:
      return '#9ca3af'
  }
}
