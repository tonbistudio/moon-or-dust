// Panel for showing combat preview when hovering over enemy units

import type { Unit } from '@tribes/game-core'
import { getCombatPreview, areAtWar } from '@tribes/game-core'
import { useGame } from '../hooks/useGame'
import { Tooltip } from './Tooltip'

interface CombatPreviewPanelProps {
  attacker: Unit
  defender: Unit
}

export function CombatPreviewPanel({ attacker, defender }: CombatPreviewPanelProps): JSX.Element | null {
  const { state } = useGame()
  if (!state) return null
  const preview = getCombatPreview(state, attacker, defender)
  const isAtWar = areAtWar(state, attacker.owner, defender.owner)

  const formatUnitName = (unit: Unit): string => {
    return unit.type.replace(/_/g, ' ')
  }

  return (
    <div
      style={{
        position: 'absolute',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        borderRadius: '8px',
        padding: '16px',
        minWidth: '220px',
        color: '#fff',
        border: '2px solid #ef4444',
      }}
    >
      <div style={{
        fontWeight: 'bold',
        fontSize: '14px',
        marginBottom: '12px',
        textAlign: 'center',
        color: '#ef4444',
      }}>
        Combat Preview
      </div>

      {/* Attacker */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 'bold',
          textTransform: 'capitalize',
          color: '#22c55e',
        }}>
          {formatUnitName(attacker)} (You)
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
          HP: {attacker.health}/{attacker.maxHealth}
        </div>
        <div style={{ fontSize: '12px', marginTop: '2px', pointerEvents: 'auto' }}>
          <Tooltip
            content={
              <div style={{ fontSize: '11px' }}>
                <div style={{ marginBottom: '4px' }}>Base: {preview.attackerStrength.base}</div>
                {preview.attackerStrength.rarityBonus !== 0 && (
                  <div style={{ color: '#a855f7' }}>
                    Rarity: +{preview.attackerStrength.rarityBonus}
                  </div>
                )}
                {preview.attackerStrength.healthPenalty !== 0 && (
                  <div style={{ color: '#ef4444' }}>
                    Health: {preview.attackerStrength.healthPenalty}
                  </div>
                )}
                {preview.attackerStrength.terrainBonus !== 0 && (
                  <div style={{ color: preview.attackerStrength.terrainBonus > 0 ? '#4ade80' : '#ef4444' }}>
                    Terrain: {preview.attackerStrength.terrainBonus > 0 ? '+' : ''}{preview.attackerStrength.terrainBonus}
                  </div>
                )}
                {preview.attackerStrength.promotionBonus !== 0 && (
                  <div style={{ color: '#4ade80' }}>
                    Promotions: +{preview.attackerStrength.promotionBonus}
                  </div>
                )}
                {preview.attackerStrength.policyBonus !== 0 && (
                  <div style={{ color: '#60a5fa' }}>
                    Policies: +{preview.attackerStrength.policyBonus}
                  </div>
                )}
              </div>
            }
            position="left"
            width="auto"
          >
            <span style={{ cursor: 'help', borderBottom: '1px dotted #666' }}>
              Strength: <span style={{ color: '#fbbf24' }}>{preview.attackerStrength.total}</span>
            </span>
          </Tooltip>
        </div>
        {preview.estimatedAttackerDamage > 0 && (
          <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px', pointerEvents: 'auto' }}>
            <Tooltip
              content="Counter-attack damage based on defender's combat strength. Ranged units take less counter damage."
              position="left"
              width={180}
            >
              <span style={{ cursor: 'help', borderBottom: '1px dotted #7f1d1d' }}>
                Est. Damage Taken: -{preview.estimatedAttackerDamage} HP
              </span>
            </Tooltip>
          </div>
        )}
      </div>

      {/* VS Divider */}
      <div style={{
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#6b7280',
        margin: '8px 0',
      }}>
        VS
      </div>

      {/* Defender */}
      <div>
        <div style={{
          fontSize: '13px',
          fontWeight: 'bold',
          textTransform: 'capitalize',
          color: '#ef4444',
        }}>
          {formatUnitName(defender)} (Enemy)
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
          HP: {defender.health}/{defender.maxHealth}
        </div>
        <div style={{ fontSize: '12px', marginTop: '2px', pointerEvents: 'auto' }}>
          <Tooltip
            content={
              <div style={{ fontSize: '11px' }}>
                <div style={{ marginBottom: '4px' }}>Base: {preview.defenderStrength.base}</div>
                {preview.defenderStrength.rarityBonus !== 0 && (
                  <div style={{ color: '#a855f7' }}>
                    Rarity: +{preview.defenderStrength.rarityBonus}
                  </div>
                )}
                {preview.defenderStrength.healthPenalty !== 0 && (
                  <div style={{ color: '#ef4444' }}>
                    Health: {preview.defenderStrength.healthPenalty}
                  </div>
                )}
                {preview.defenderStrength.terrainBonus !== 0 && (
                  <div style={{ color: preview.defenderStrength.terrainBonus > 0 ? '#4ade80' : '#ef4444' }}>
                    Terrain: {preview.defenderStrength.terrainBonus > 0 ? '+' : ''}{preview.defenderStrength.terrainBonus}
                  </div>
                )}
                {preview.defenderStrength.promotionBonus !== 0 && (
                  <div style={{ color: '#4ade80' }}>
                    Promotions: +{preview.defenderStrength.promotionBonus}
                  </div>
                )}
                {preview.defenderStrength.fortificationBonus !== 0 && (
                  <div style={{ color: '#60a5fa' }}>
                    Fortification: +{preview.defenderStrength.fortificationBonus}
                  </div>
                )}
                {preview.defenderStrength.policyBonus !== 0 && (
                  <div style={{ color: '#60a5fa' }}>
                    Policies: +{preview.defenderStrength.policyBonus}
                  </div>
                )}
              </div>
            }
            position="left"
            width="auto"
          >
            <span style={{ cursor: 'help', borderBottom: '1px dotted #666' }}>
              Strength: <span style={{ color: '#fbbf24' }}>{preview.defenderStrength.total}</span>
            </span>
          </Tooltip>
        </div>
        <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '2px', pointerEvents: 'auto' }}>
          <Tooltip
            content="Damage is based on the difference in combat strength. Higher strength = more damage dealt."
            position="left"
            width={180}
          >
            <span style={{ cursor: 'help', borderBottom: '1px dotted #166534' }}>
              Est. Damage Dealt: -{preview.estimatedDefenderDamage} HP
            </span>
          </Tooltip>
        </div>
      </div>

      {/* War declaration warning */}
      {!isAtWar && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #374151',
          background: '#3a2a1a',
          margin: '12px -16px -16px -16px',
          padding: '12px 16px',
          borderRadius: '0 0 6px 6px',
        }}>
          <div style={{
            color: '#f97316',
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '4px',
          }}>
            ⚠ Warning
          </div>
          <div style={{
            color: '#fbbf24',
            fontSize: '11px',
          }}>
            Initiating this attack will be a declaration of war!
          </div>
        </div>
      )}

      {/* Outcome prediction */}
      {isAtWar && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #374151',
          fontSize: '11px',
          color: '#9ca3af',
        }}>
          {preview.estimatedDefenderDamage >= defender.health && (
            <div style={{ color: '#22c55e' }}>Likely to defeat enemy!</div>
          )}
          {preview.estimatedAttackerDamage >= attacker.health && (
            <div style={{ color: '#ef4444' }}>Warning: May be defeated!</div>
          )}
          {preview.estimatedDefenderDamage < defender.health &&
           preview.estimatedAttackerDamage < attacker.health && (
            <div>Both units will survive</div>
          )}
        </div>
      )}
    </div>
  )
}
