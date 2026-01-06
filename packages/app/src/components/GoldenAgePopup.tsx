// Popup for showing when a Golden Age begins

import type { GoldenAgeTrigger, GoldenAgeEffectType } from '@tribes/game-core'
import { getTriggerDefinition, getEffectDefinition } from '@tribes/game-core'
import { Tooltip } from './Tooltip'

interface GoldenAgePopupProps {
  trigger: GoldenAgeTrigger
  effect: GoldenAgeEffectType
  turnsRemaining: number
  onDismiss: () => void
}

// Category colors for different effects
function getEffectColor(effect: GoldenAgeEffectType): string {
  if (effect.includes('combat') || effect.includes('defense')) return '#ef4444'
  if (effect.includes('alpha')) return '#3b82f6'
  if (effect.includes('vibes')) return '#ec4899'
  if (effect.includes('gold')) return '#eab308'
  if (effect.includes('production')) return '#f97316'
  if (effect.includes('mobility')) return '#22c55e'
  return '#a855f7' // Default purple for golden age
}

// Get effect icon
function getEffectIcon(effect: GoldenAgeEffectType): string {
  if (effect.includes('combat')) return '\u2694' // swords
  if (effect.includes('defense')) return '\u{1F6E1}' // shield
  if (effect.includes('alpha')) return '\u{1F4A1}' // lightbulb
  if (effect.includes('vibes')) return '\u{1F3A8}' // palette
  if (effect.includes('gold')) return '\u{1F4B0}' // money bag
  if (effect.includes('production')) return '\u2692' // hammer
  if (effect.includes('mobility')) return '\u26A1' // lightning
  return '\u2728' // sparkles
}

export function GoldenAgePopup({
  trigger,
  effect,
  turnsRemaining,
  onDismiss,
}: GoldenAgePopupProps): JSX.Element {
  const triggerDef = getTriggerDefinition(trigger)
  const effectDef = getEffectDefinition(effect)

  const effectColor = getEffectColor(effect)
  const effectIcon = getEffectIcon(effect)

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.92)',
        zIndex: 1000,
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: '#0d0d1a',
          borderRadius: '12px',
          minWidth: '380px',
          maxWidth: '440px',
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(168, 85, 247, 0.3)',
          border: '1px solid #a855f7',
          animation: 'goldenAgePopIn 0.5s ease-out',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with golden gradient */}
        <div
          style={{
            padding: '24px 24px 20px',
            background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.2) 0%, #0d0d1a 100%)',
            borderBottom: '1px solid #333',
          }}
        >
          {/* Golden Age icon */}
          <div
            style={{
              width: '72px',
              height: '72px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
              animation: 'goldenAgePulse 2s ease-in-out infinite',
            }}
          >
            <span style={{ fontSize: '32px' }}>{'\u2728'}</span>
          </div>

          {/* Title */}
          <Tooltip
            content="Golden Ages are periods of extraordinary prosperity triggered by major achievements. All yields are boosted and units move faster."
            position="below"
            width={240}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#c084fc',
                marginBottom: '8px',
                textShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
                cursor: 'help',
              }}
            >
              Golden Age Begins!
            </div>
          </Tooltip>

          {/* Duration */}
          <Tooltip
            content="Golden Age effects last for the specified number of turns. Use this time to expand and build!"
            position="below"
            width={200}
          >
            <div
              style={{
                fontSize: '14px',
                color: '#a855f7',
                fontWeight: 500,
                cursor: 'help',
              }}
            >
              {turnsRemaining} turns of prosperity
            </div>
          </Tooltip>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px 24px' }}>
          {/* Trigger - What caused this */}
          <div
            style={{
              marginBottom: '20px',
              padding: '12px 16px',
              background: 'rgba(168, 85, 247, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(168, 85, 247, 0.2)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '6px',
              }}
            >
              Triggered By
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#d1d5db',
                marginBottom: '4px',
              }}
            >
              {triggerDef?.name ?? trigger}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#9ca3af',
              }}
            >
              {triggerDef?.description ?? ''}
            </div>
          </div>

          {/* Effect - What you get */}
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              background: `linear-gradient(135deg, ${effectColor}15 0%, ${effectColor}05 100%)`,
              borderRadius: '8px',
              border: `1px solid ${effectColor}40`,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
              }}
            >
              Effect
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '24px' }}>{effectIcon}</span>
              <div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: effectColor,
                  }}
                >
                  {effectDef?.name ?? effect}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#9ca3af',
                  }}
                >
                  {effectDef?.description ?? ''}
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={onDismiss}
            style={{
              background: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 48px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Begin the Golden Age
          </button>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes goldenAgePopIn {
          0% {
            transform: scale(0.8) translateY(30px);
            opacity: 0;
          }
          50% {
            transform: scale(1.02) translateY(-5px);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes goldenAgePulse {
          0%, 100% {
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);
          }
          50% {
            box-shadow: 0 0 50px rgba(168, 85, 247, 0.8);
          }
        }
      `}</style>
    </div>
  )
}
