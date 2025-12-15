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
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          HP: {unit.health}/{unit.maxHealth} | Moves: {unit.movementRemaining}/{unit.maxMovement}
        </div>
        {unit.rarity !== 'common' && (
          <div
            style={{
              fontSize: '11px',
              marginTop: '4px',
              color: getRarityColor(unit.rarity),
              textTransform: 'capitalize',
            }}
          >
            {unit.rarity}
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
