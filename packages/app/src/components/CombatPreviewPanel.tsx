// Panel for showing combat preview when hovering over enemy units

import type { Unit } from '@tribes/game-core'
import { getCombatPreview, areAtWar } from '@tribes/game-core'
import { useGame } from '../hooks/useGame'

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
        <div style={{ fontSize: '12px', marginTop: '2px' }}>
          Strength: <span style={{ color: '#fbbf24' }}>{preview.attackerStrength.total}</span>
        </div>
        {preview.estimatedAttackerDamage > 0 && (
          <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px' }}>
            Est. Damage Taken: -{preview.estimatedAttackerDamage} HP
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
        <div style={{ fontSize: '12px', marginTop: '2px' }}>
          Strength: <span style={{ color: '#fbbf24' }}>{preview.defenderStrength.total}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '2px' }}>
          Est. Damage Dealt: -{preview.estimatedDefenderDamage} HP
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
