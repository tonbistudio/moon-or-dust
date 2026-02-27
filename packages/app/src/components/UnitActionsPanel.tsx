// Panel for showing actions available for the selected unit

import type { Unit, ImprovementType, PromotionId } from '@tribes/game-core'
import { getValidImprovements, IMPROVEMENT_DEFINITIONS, hexKey, canBuildImprovement, getGreatPersonDefinition, canLevelUp, getXpForNextLevel, getPromotion } from '@tribes/game-core'
import { useGame } from '../hooks/useGame'
import { Tooltip } from './Tooltip'

interface UnitActionsPanelProps {
  unit: Unit
  onLevelUp?: (() => void) | undefined
}

// Path colors for promotions
const PROMOTION_PATH_COLORS: Record<string, string> = {
  combat: '#ef4444',
  mobility: '#3b82f6',
  survival: '#22c55e',
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

export function UnitActionsPanel({ unit, onLevelUp }: UnitActionsPanelProps): JSX.Element {
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
          {unit.type === 'great_person' && state?.greatPersons?.get(unit.id)
            ? getGreatPersonDefinition(state.greatPersons.get(unit.id)!.greatPersonId)?.name ?? unit.type
            : unit.type.replace(/_/g, ' ')}
          {unit.rarity !== 'common' && unit.type !== 'great_person' && (
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

        {/* XP and Level - show for combat units */}
        {unit.combatStrength > 0 && (
          <div style={{ marginTop: '8px' }}>
            {/* Level and XP Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Tooltip
                content={`Units gain XP from combat. Earn ${getXpForNextLevel(unit) - unit.experience} more XP to level up.`}
                position="right"
                width={180}
              >
                <span style={{ fontSize: '11px', color: '#a855f7', cursor: 'help' }}>
                  Level {unit.level}
                </span>
              </Tooltip>

              {/* XP Progress bar */}
              <div
                style={{
                  flex: 1,
                  height: '6px',
                  background: 'rgba(168, 85, 247, 0.2)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (unit.experience / getXpForNextLevel(unit)) * 100)}%`,
                    height: '100%',
                    background: canLevelUp(unit)
                      ? 'linear-gradient(90deg, #a855f7 0%, #c084fc 100%)'
                      : '#7c3aed',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <span style={{ fontSize: '10px', color: '#666' }}>
                {unit.experience}/{getXpForNextLevel(unit)}
              </span>
            </div>

            {/* Level Up button */}
            {canLevelUp(unit) && onLevelUp && (
              <button
                onClick={onLevelUp}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  marginBottom: '8px',
                  animation: 'levelUpPulse 2s ease-in-out infinite',
                }}
              >
                ⬆️ Level Up! Choose Promotion
              </button>
            )}

            {/* Current Promotions */}
            {unit.promotions.length > 0 && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
                  Promotions:
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {unit.promotions.map((promoId: PromotionId) => {
                    const promo = getPromotion(promoId)
                    if (!promo) return null
                    const color = PROMOTION_PATH_COLORS[promo.path] ?? '#888'
                    return (
                      <Tooltip key={promoId} content={promo.description} position="above" width={160}>
                        <div
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            background: `${color}20`,
                            border: `1px solid ${color}40`,
                            borderRadius: '3px',
                            color,
                            cursor: 'help',
                          }}
                        >
                          {promo.name}
                        </div>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CSS for level up animation */}
        <style>{`
          @keyframes levelUpPulse {
            0%, 100% {
              box-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
            }
            50% {
              box-shadow: 0 0 20px rgba(168, 85, 247, 0.7);
            }
          }
        `}</style>
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

        {unit.type === 'great_person' && state && (
          <GreatPersonPanel unit={unit} />
        )}

        {unit.type !== 'settler' && unit.type !== 'builder' && unit.type !== 'great_person' && (
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            No special actions available
          </div>
        )}

        {/* Sleep/Wake toggle */}
        {unit.type !== 'great_person' && (
          <button
            onClick={() => {
              if (unit.sleeping) {
                dispatch({ type: 'WAKE_UNIT', unitId: unit.id })
              } else {
                dispatch({ type: 'SLEEP_UNIT', unitId: unit.id })
              }
            }}
            style={{
              padding: '6px 12px',
              background: unit.sleeping ? '#1e40af' : '#374151',
              border: `1px solid ${unit.sleeping ? '#3b82f6' : '#4b5563'}`,
              borderRadius: '4px',
              color: unit.sleeping ? '#93c5fd' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '12px',
              marginTop: '4px',
              width: '100%',
            }}
          >
            {unit.sleeping ? 'Wake Unit' : 'Sleep Until Woken'}
          </button>
        )}
      </div>
    </div>
  )
}

// Great Person sub-panel
function GreatPersonPanel({ unit }: { unit: Unit }): JSX.Element | null {
  const { dispatch, state } = useGame()

  if (!state) return null

  const greatPerson = state.greatPersons?.get(unit.id)
  if (!greatPerson) {
    return (
      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
        Great Person data not found
      </div>
    )
  }

  const definition = getGreatPersonDefinition(greatPerson.greatPersonId)
  if (!definition) {
    return (
      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
        Unknown Great Person
      </div>
    )
  }

  const handleUseAbility = () => {
    const result = dispatch({ type: 'USE_GREAT_PERSON', unitId: unit.id })
    if (!result.success) {
      console.warn('Failed to use great person ability:', result.error)
    }
  }

  const hasActed = greatPerson.hasActed
  const effectDescription = getEffectDescription(definition.effect)
  const thresholdDescription = getThresholdDescription(definition)

  return (
    <div>
      {/* Great Person Name */}
      <div style={{
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#a855f7',
        marginBottom: '8px',
      }}>
        {definition.name}
      </div>

      {/* Category Badge */}
      <div style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        color: getCategoryColor(definition.category),
        background: `${getCategoryColor(definition.category)}20`,
        border: `1px solid ${getCategoryColor(definition.category)}40`,
        marginBottom: '12px',
      }}>
        {formatCategory(definition.category)}
      </div>

      {/* Threshold / Requirements */}
      <div style={{
        fontSize: '11px',
        color: '#6b7280',
        marginBottom: '8px',
        padding: '6px 8px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '4px',
      }}>
        <span style={{ color: '#9ca3af' }}>Earned by: </span>
        {thresholdDescription}
      </div>

      {/* Action Name & Effect */}
      <div style={{
        marginBottom: '12px',
        padding: '10px',
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)',
        borderRadius: '6px',
        border: '1px solid rgba(168, 85, 247, 0.3)',
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#c084fc',
          marginBottom: '4px',
        }}>
          {definition.actionName}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#d1d5db',
          lineHeight: 1.4,
        }}>
          {effectDescription}
        </div>
      </div>

      {/* Use Ability Button */}
      <button
        onClick={handleUseAbility}
        disabled={hasActed}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: hasActed
            ? '#374151'
            : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
          border: 'none',
          borderRadius: '6px',
          color: hasActed ? '#6b7280' : '#fff',
          cursor: hasActed ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '13px',
          transition: 'opacity 0.2s',
        }}
        onMouseOver={(e) => {
          if (!hasActed) e.currentTarget.style.opacity = '0.9'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.opacity = '1'
        }}
      >
        {hasActed ? 'Ability Already Used' : `Use ${definition.actionName}`}
      </button>

      {hasActed && (
        <div style={{
          fontSize: '11px',
          color: '#6b7280',
          textAlign: 'center',
          marginTop: '6px',
        }}>
          Great Person abilities are one-time use
        </div>
      )}
    </div>
  )
}

// Helper to get category color
function getCategoryColor(category: string): string {
  switch (category) {
    case 'alpha': return '#3b82f6'
    case 'gold': return '#eab308'
    case 'vibes': return '#ec4899'
    case 'trade': return '#22c55e'
    case 'production': return '#f97316'
    default: return '#9ca3af'
  }
}

// Helper to format category name
function formatCategory(category: string): string {
  switch (category) {
    case 'alpha': return 'Research'
    case 'gold': return 'Economy'
    case 'vibes': return 'Culture'
    case 'trade': return 'Trade'
    case 'production': return 'Production'
    default: return category
  }
}

// Helper to describe the threshold
function getThresholdDescription(definition: ReturnType<typeof getGreatPersonDefinition>): string {
  if (!definition) return 'Unknown'
  const threshold = definition.threshold

  switch (threshold.type) {
    case 'accumulator':
      return `Accumulate ${threshold.amount} ${threshold.stat}`
    case 'count':
      return `${threshold.amount} ${threshold.stat.replace(/([A-Z])/g, ' $1').toLowerCase()}`
    default:
      return 'Special condition'
  }
}

// Helper to describe the effect
function getEffectDescription(effect: { type: string; [key: string]: unknown }): string {
  switch (effect.type) {
    case 'instant_gold':
      return `Instantly gain ${effect.amount as number} Gold`

    case 'instant_building':
      return 'Instantly produce next tech building'

    case 'border_expansion': {
      const tiles = effect.tiles as number
      const vibesBonus = effect.bonusVibes as number | undefined
      if (vibesBonus) {
        return `Expand borders by ${tiles} tiles and gain ${vibesBonus} Vibes`
      }
      return `Expand borders by ${tiles} tiles`
    }

    case 'yield_buff': {
      const yieldBuff = effect as unknown as { yield: string; percent: number; turns: number }
      return `+${yieldBuff.percent}% ${yieldBuff.yield} for ${yieldBuff.turns} turns`
    }

    case 'production_buff': {
      const prodBuff = effect as unknown as { percent: number; turns: number; target: string }
      return `+${prodBuff.percent}% ${prodBuff.target} production for ${prodBuff.turns} turns`
    }

    default:
      return 'Special effect'
  }
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
