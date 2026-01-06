// Popup for selecting a promotion when a unit levels up

import type { Unit, PromotionId } from '@tribes/game-core'
import { getAvailablePromotions, getPromotion, type PromotionDefinition } from '@tribes/game-core'
import { Tooltip } from './Tooltip'

interface PromotionSelectionPopupProps {
  unit: Unit
  onSelect: (promotionId: PromotionId) => void
  onDismiss: () => void
}

// Path colors
const PATH_COLORS: Record<string, { primary: string; bg: string; border: string }> = {
  combat: {
    primary: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
  mobility: {
    primary: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  survival: {
    primary: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.1)',
    border: 'rgba(34, 197, 94, 0.3)',
  },
}

// Path icons
const PATH_ICONS: Record<string, string> = {
  combat: '⚔️',
  mobility: '🏃',
  survival: '💚',
}

// Path descriptions for tooltips
const PATH_DESCRIPTIONS: Record<string, string> = {
  combat: 'Increases attack and defense strength in battle. Best for frontline fighters.',
  mobility: 'Enhances movement speed and terrain traversal. Best for scouts and cavalry.',
  survival: 'Improves healing and durability. Best for units that need to stay in the field.',
}

// Effect type icons
function getEffectIcon(type: string): string {
  switch (type) {
    case 'attack_bonus':
      return '⚔️'
    case 'defense_bonus':
      return '🛡️'
    case 'movement_bonus':
      return '🏃'
    case 'ignore_terrain':
      return '🗺️'
    case 'heal_per_turn':
      return '💚'
    case 'low_health_bonus':
      return '💀'
    case 'adjacent_heal':
      return '➕'
    case 'first_strike':
      return '⚡'
    case 'ranged_bonus':
      return '🏹'
    case 'anti_cavalry':
      return '🐴'
    default:
      return '✨'
  }
}

export function PromotionSelectionPopup({
  unit,
  onSelect,
  onDismiss,
}: PromotionSelectionPopupProps): JSX.Element {
  const availablePromotions = getAvailablePromotions(unit)

  // Group promotions by path
  const groupedPromotions = availablePromotions.reduce(
    (acc, promo) => {
      if (!acc[promo.path]) acc[promo.path] = []
      acc[promo.path]!.push(promo)
      return acc
    },
    {} as Record<string, PromotionDefinition[]>
  )

  // Get current promotions for display
  const currentPromotions = unit.promotions.map((id) => getPromotion(id)).filter(Boolean) as PromotionDefinition[]

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
          minWidth: '500px',
          maxWidth: '640px',
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(168, 85, 247, 0.3)',
          border: '1px solid #a855f7',
          animation: 'promotionPopIn 0.4s ease-out',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.2) 0%, #0d0d1a 100%)',
            borderBottom: '1px solid #333',
          }}
        >
          {/* Level up icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 12px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
              animation: 'promotionPulse 2s ease-in-out infinite',
            }}
          >
            <span style={{ fontSize: '28px' }}>⬆️</span>
          </div>

          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#c084fc',
              marginBottom: '4px',
            }}
          >
            Level Up!
          </div>
          <div
            style={{
              fontSize: '14px',
              color: '#888',
            }}
          >
            <span style={{ textTransform: 'capitalize' }}>{unit.type.replace(/_/g, ' ')}</span> is now Level{' '}
            <span style={{ color: '#a855f7', fontWeight: 600 }}>{unit.level + 1}</span>
          </div>
        </div>

        {/* Current Promotions */}
        {currentPromotions.length > 0 && (
          <div
            style={{
              padding: '12px 24px',
              background: 'rgba(168, 85, 247, 0.05)',
              borderBottom: '1px solid #333',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '8px',
              }}
            >
              Current Promotions
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {currentPromotions.map((promo) => {
                const colors = PATH_COLORS[promo.path] ?? PATH_COLORS.combat!
                return (
                  <Tooltip key={promo.id} content={promo.description} position="above" width={180}>
                    <div
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '4px',
                        color: colors.primary,
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

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          <div
            style={{
              fontSize: '13px',
              color: '#888',
              marginBottom: '16px',
            }}
          >
            Choose a promotion for your unit
          </div>

          {/* Promotion options by path */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(groupedPromotions).map(([path, promotions]) => {
              const colors = PATH_COLORS[path] ?? PATH_COLORS.combat!
              const icon = PATH_ICONS[path] ?? '✨'
              const pathDesc = PATH_DESCRIPTIONS[path] ?? ''

              return (
                <div key={path}>
                  {/* Path header */}
                  <Tooltip content={pathDesc} position="above" width={200}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                        cursor: 'help',
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{icon}</span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: colors.primary,
                          textTransform: 'capitalize',
                        }}
                      >
                        {path} Path
                      </span>
                      <div
                        style={{
                          flex: 1,
                          height: '1px',
                          background: colors.border,
                        }}
                      />
                    </div>
                  </Tooltip>

                  {/* Promotion buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {promotions.map((promo) => (
                      <button
                        key={promo.id}
                        onClick={() => onSelect(promo.id)}
                        style={{
                          flex: '1 1 200px',
                          padding: '12px 16px',
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = `${colors.primary}30`
                          e.currentTarget.style.borderColor = colors.primary
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = colors.bg
                          e.currentTarget.style.borderColor = colors.border
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                          }}
                        >
                          <span>{getEffectIcon(promo.effect.type)}</span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: colors.primary,
                            }}
                          >
                            {promo.name}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              color: '#666',
                              marginLeft: 'auto',
                            }}
                          >
                            Tier {promo.tier}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#9ca3af',
                            lineHeight: 1.4,
                          }}
                        >
                          {promo.description}
                        </div>
                        {promo.prerequisite && (
                          <div
                            style={{
                              fontSize: '10px',
                              color: '#666',
                              marginTop: '6px',
                              fontStyle: 'italic',
                            }}
                          >
                            Requires: {getPromotion(promo.prerequisite)?.name ?? promo.prerequisite}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* No promotions available */}
          {availablePromotions.length === 0 && (
            <div
              style={{
                padding: '24px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                color: '#ef4444',
              }}
            >
              No promotions available. This unit may have unlocked all available promotions.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #333',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onDismiss}
            style={{
              padding: '10px 24px',
              background: '#374151',
              border: 'none',
              borderRadius: '6px',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Decide Later
          </button>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes promotionPopIn {
          0% {
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes promotionPulse {
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
