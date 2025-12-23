// Panel for showing actions available for the selected unit

import type { Unit, ImprovementType } from '@tribes/game-core'
import { getValidImprovements, IMPROVEMENT_DEFINITIONS, hexKey, canBuildImprovement } from '@tribes/game-core'
import { useGame } from '../hooks/useGame'

interface UnitActionsPanelProps {
  unit: Unit
}

// Format improvement name for display
function formatImprovementName(type: ImprovementType): string {
  const def = IMPROVEMENT_DEFINITIONS[type]
  return def?.name ?? type.replace(/_/g, ' ')
}

// Get resource name that the improvement works
function getResourceForImprovement(type: ImprovementType): string | null {
  const def = IMPROVEMENT_DEFINITIONS[type]
  if (def?.validResources && def.validResources.length > 0) {
    return def.validResources[0]!.replace(/_/g, ' ')
  }
  return null
}

export function UnitActionsPanel({ unit }: UnitActionsPanelProps): JSX.Element {
  const { dispatch, state } = useGame()

  const handleFoundSettlement = () => {
    const result = dispatch({ type: 'FOUND_SETTLEMENT', settlerId: unit.id })
    if (!result.success) {
      console.warn('Failed to found settlement:', result.error)
    }
  }

  const handleBuildImprovement = (improvement: ImprovementType) => {
    const result = dispatch({
      type: 'BUILD_IMPROVEMENT',
      builderId: unit.id,
      improvement,
    })
    if (!result.success) {
      console.warn('Failed to build improvement:', result.error)
    }
  }

  const canAct = !unit.hasActed

  // Get valid improvements for builder
  const validImprovements: ImprovementType[] = state && unit.type === 'builder'
    ? getValidImprovements(state, unit.position, unit.owner)
    : []

  // Get tile info for builder
  const currentTile = state?.map.tiles.get(hexKey(unit.position))

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
            {/* Builder charges display */}
            <div style={{
              fontSize: '12px',
              color: '#fbbf24',
              marginBottom: '8px',
              padding: '6px 10px',
              background: 'rgba(251, 191, 36, 0.15)',
              borderRadius: '4px',
              textAlign: 'center',
            }}>
              🔨 Charges: {unit.buildCharges}/2
            </div>

            {/* Valid improvements */}
            {validImprovements.length > 0 ? (
              validImprovements.map((improvement) => {
                const resource = getResourceForImprovement(improvement)
                // Builders can use multiple charges per turn - only check charges remaining
                const canBuild = unit.buildCharges > 0
                return (
                  <button
                    key={improvement}
                    onClick={() => handleBuildImprovement(improvement)}
                    disabled={!canBuild}
                    style={{
                      padding: '8px 12px',
                      background: canBuild ? '#3b82f6' : '#374151',
                      border: 'none',
                      borderRadius: '4px',
                      color: canBuild ? '#fff' : '#6b7280',
                      cursor: canBuild ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      textAlign: 'left',
                    }}
                  >
                    Build {formatImprovementName(improvement)}
                    {resource && (
                      <span style={{ fontWeight: 'normal', opacity: 0.8 }}>
                        {' '}(Improve {resource})
                      </span>
                    )}
                  </button>
                )
              })
            ) : (
              <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                {(() => {
                  if (currentTile?.owner !== unit.owner) return 'Move to owned territory'
                  if (!currentTile?.resource) return 'No resource on this tile'
                  if (!currentTile.resource.revealed) return 'Resource not revealed yet'

                  // Debug: check why specific improvements fail
                  const resource = currentTile.resource.type
                  const terrain = currentTile.terrain

                  // Find which improvement should work for this resource
                  for (const [type, def] of Object.entries(IMPROVEMENT_DEFINITIONS)) {
                    if (def.validResources?.includes(resource as never)) {
                      const result = state ? canBuildImprovement(state, unit.position, type as ImprovementType, unit.owner) : null
                      return `${def.name} for ${resource}: ${result?.reason || 'unknown'} (terrain: ${terrain})`
                    }
                  }
                  return `No improvement defined for ${resource}`
                })()}
              </div>
            )}
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
