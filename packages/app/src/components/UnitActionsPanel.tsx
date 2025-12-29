// Panel for showing actions available for the selected unit

import type { Unit, ImprovementType } from '@tribes/game-core'
import { getValidImprovements, IMPROVEMENT_DEFINITIONS, hexKey, canBuildImprovement, getGreatPersonDefinition } from '@tribes/game-core'
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

        {unit.type === 'great_person' && state && (
          <GreatPersonPanel unit={unit} />
        )}

        {unit.type !== 'settler' && unit.type !== 'builder' && unit.type !== 'great_person' && (
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            No special actions available
          </div>
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
    case 'combat': return '#ef4444'
    case 'alpha': return '#3b82f6'
    case 'gold': return '#eab308'
    case 'vibes': return '#ec4899'
    case 'trade': return '#22c55e'
    case 'production': return '#f97316'
    case 'kills': return '#dc2626'
    case 'captures': return '#7c3aed'
    case 'tribal': return '#a855f7'
    default: return '#9ca3af'
  }
}

// Helper to format category name
function formatCategory(category: string): string {
  switch (category) {
    case 'combat': return 'Combat'
    case 'alpha': return 'Research'
    case 'gold': return 'Economy'
    case 'vibes': return 'Culture'
    case 'trade': return 'Trade'
    case 'production': return 'Production'
    case 'kills': return 'Military'
    case 'captures': return 'Conquest'
    case 'tribal': return 'Tribal'
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
    case 'combo':
      return `Build ${threshold.wonders} wonders and ${threshold.buildings} buildings`
    case 'tribal':
      const building = String(threshold.building).replace(/_/g, ' ')
      const culture = String(threshold.culture).replace(/_/g, ' ')
      return `Build ${building} + unlock ${culture}`
    default:
      return 'Special condition'
  }
}

// Helper to describe the effect
function getEffectDescription(effect: { type: string; [key: string]: unknown }): string {
  switch (effect.type) {
    case 'instant_gold':
      const goldAmount = effect.amount as number
      const bonusYield = effect.bonusYield as { yield: string; percent: number; turns: number } | undefined
      if (bonusYield) {
        return `Gain ${goldAmount} Gold and +${bonusYield.percent}% ${bonusYield.yield} for ${bonusYield.turns} turns`
      }
      return `Instantly gain ${goldAmount} Gold`

    case 'instant_vibes':
      return `Instantly gain ${effect.amount} Vibes`

    case 'instant_research':
      return 'Instantly complete current research'

    case 'instant_culture':
      return 'Instantly complete current culture research'

    case 'instant_building':
      return 'Instantly produce next tech building'

    case 'free_trade_route':
      return 'Gain a free trade route'

    case 'free_units':
      const count = effect.count as number
      const bonusVibes = effect.bonusVibes as number | undefined
      if (bonusVibes) {
        return `Spawn ${count} free combat units and gain ${bonusVibes} Vibes`
      }
      return `Spawn ${count} free combat units at capital`

    case 'border_expansion':
      const tiles = effect.tiles as number
      const vibesBonus = effect.bonusVibes as number | undefined
      if (vibesBonus) {
        return `Expand borders by ${tiles} tiles and gain ${vibesBonus} Vibes`
      }
      return `Expand borders by ${tiles} tiles`

    case 'area_promotion':
      return `All friendly units within ${effect.radius} tiles gain a free promotion`

    case 'area_combat_buff':
      return `All friendly units within ${effect.radius} tiles gain +${effect.percent}% combat for ${effect.turns} turns`

    case 'area_defense_buff': {
      const defEffect = effect as unknown as { radius: number; percent: number; turns: number; includePromotion?: boolean }
      if (defEffect.includePromotion) {
        return `All friendly units within ${defEffect.radius} tiles gain +${defEffect.percent}% defense for ${defEffect.turns} turns + free promotion`
      }
      return `All friendly units within ${defEffect.radius} tiles gain +${defEffect.percent}% defense for ${defEffect.turns} turns`
    }

    case 'yield_buff': {
      const yieldBuff = effect as unknown as { yield?: string; yields?: Array<{ yield: string; percent: number }>; percent?: number; turns: number }
      if (yieldBuff.yields) {
        const parts = yieldBuff.yields.map(y => `+${y.percent}% ${y.yield}`)
        return `${parts.join(' and ')} for ${yieldBuff.turns} turns`
      }
      return `+${yieldBuff.percent}% ${yieldBuff.yield} for ${yieldBuff.turns} turns`
    }

    case 'production_buff': {
      const prodBuff = effect as unknown as { percent: number; turns: number; target: string }
      const targetText = prodBuff.target === 'all' ? 'all production' : `${prodBuff.target} production`
      return `+${prodBuff.percent}% ${targetText} for ${prodBuff.turns} turns`
    }

    case 'golden_age':
      return `Trigger a ${effect.turns}-turn Golden Age`

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
