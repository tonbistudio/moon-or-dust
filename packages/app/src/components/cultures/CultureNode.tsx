// Civ 4 style culture node component with purple/pink theme

import { useState } from 'react'
import type { Culture, CultureId, Player, TechId } from '@tribes/game-core'
import { getCulture, canUnlockCulture, getTech } from '@tribes/game-core'

interface CultureNodeProps {
  culture: Culture
  player: Player
  isResearching: boolean
  onSelect: (cultureId: CultureId) => void
  onHover?: (cultureId: CultureId | null) => void
  isHighlighted?: boolean
  isDimmed?: boolean
  style?: React.CSSProperties
  tooltipPosition?: 'above' | 'below'
}

// Get icon path for a culture (icons use no underscores)
function getCultureIcon(cultureId: CultureId): string {
  // Remove underscores from culture ID to match icon filenames
  const iconName = String(cultureId).replace(/_/g, '')
  return `/assets/icons/cultures/${iconName}.svg`
}

// Slot type colors
const SLOT_COLORS = {
  military: '#ef5350',    // Red
  economy: '#ffd54f',     // Yellow
  progress: '#7e57c2',    // Bluish Purple
  wildcard: '#66bb6a',    // Green
} as const

// Unlock item with color info
interface UnlockItem {
  name: string
  color: string
}

// Get slot unlock items from culture
function getUnlockItems(culture: Culture): UnlockItem[] {
  const unlocks: UnlockItem[] = []

  if (culture.slotUnlocks) {
    if (culture.slotUnlocks.military) {
      unlocks.push({ name: `+${culture.slotUnlocks.military} Military`, color: SLOT_COLORS['military'] })
    }
    if (culture.slotUnlocks.economy) {
      unlocks.push({ name: `+${culture.slotUnlocks.economy} Economy`, color: SLOT_COLORS['economy'] })
    }
    if (culture.slotUnlocks.progress) {
      unlocks.push({ name: `+${culture.slotUnlocks.progress} Progress`, color: SLOT_COLORS['progress'] })
    }
    if (culture.slotUnlocks.wildcard) {
      unlocks.push({ name: `+${culture.slotUnlocks.wildcard} Wildcard`, color: SLOT_COLORS['wildcard'] })
    }
  }

  return unlocks
}

export function CultureNode({
  culture,
  player,
  isResearching,
  onSelect,
  onHover,
  isHighlighted,
  isDimmed,
  style,
  tooltipPosition = 'below',
}: CultureNodeProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false)
  const isUnlocked = player.unlockedCultures.includes(culture.id)
  const { canUnlock, reason } = canUnlockCulture(player, culture.id)
  const unlockItems = getUnlockItems(culture)

  // State-based colors (purple/pink theme)
  const getBorderColor = () => {
    if (isUnlocked) return '#9c27b0'      // Purple (unlocked)
    if (isResearching) return '#e91e63'   // Pink (in progress)
    if (canUnlock) return '#ab47bc'       // Light purple (available)
    return '#555'                          // Gray (locked)
  }

  const getBackgroundGradient = () => {
    if (isUnlocked) {
      return 'linear-gradient(180deg, #4a1a4d 0%, #2d102f 100%)'
    }
    if (isResearching) {
      return 'linear-gradient(180deg, #4d1a3d 0%, #2f101f 100%)'
    }
    if (canUnlock) {
      return 'linear-gradient(180deg, #3d1a4d 0%, #251030 100%)'
    }
    return 'linear-gradient(180deg, #252525 0%, #1a1a1a 100%)'
  }

  const getNameColor = () => {
    if (isUnlocked) return '#fff'
    if (isResearching) return '#fff'
    if (canUnlock) return '#fff'
    return '#888'
  }

  // Compute highlight/dim effects
  const getBoxShadow = () => {
    if (isHighlighted) {
      return '0 0 12px rgba(171, 71, 188, 0.7), 0 0 4px rgba(171, 71, 188, 0.5)'
    }
    if (isResearching) {
      return '0 0 8px rgba(233, 30, 99, 0.5)'
    }
    if (isUnlocked) {
      return '0 0 6px rgba(156, 39, 176, 0.3)'
    }
    return '0 2px 4px rgba(0,0,0,0.3)'
  }

  // Get prerequisite culture names for tooltip
  const culturePrereqNames = culture.prerequisites.cultures
    .map((id) => getCulture(id)?.name || id)

  // Get prerequisite tech names for tooltip
  const techPrereqNames = culture.prerequisites.techs
    .map((id: TechId) => getTech(id)?.name || id)

  return (
    <div style={{ position: 'absolute', ...style }}>
      <button
        onClick={() => onSelect(culture.id)}
        disabled={isUnlocked}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 10px',
          background: getBackgroundGradient(),
          border: isHighlighted ? '2px solid #ab47bc' : `2px solid ${getBorderColor()}`,
          borderRadius: '4px',
          cursor: isUnlocked ? 'default' : canUnlock || isResearching ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s ease',
          boxShadow: getBoxShadow(),
          minWidth: '140px',
          height: unlockItems.length > 0 ? '52px' : '44px',
          opacity: isDimmed ? 0.35 : 1,
        }}
        onMouseEnter={(e) => {
          setShowTooltip(true)
          onHover?.(culture.id)
          if (!isUnlocked && (canUnlock || isResearching)) {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.zIndex = '100'
          }
        }}
        onMouseLeave={(e) => {
          setShowTooltip(false)
          onHover?.(null)
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.zIndex = '1'
        }}
      >
      {/* Culture Icon */}
      <div
        style={{
          width: '32px',
          height: '32px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '4px',
          padding: '3px',
        }}
      >
        <img
          src={getCultureIcon(culture.id)}
          alt={culture.name}
          style={{
            width: '26px',
            height: '26px',
            objectFit: 'contain',
            opacity: isUnlocked || canUnlock || isResearching ? 1 : 0.4,
            filter: isUnlocked
              ? 'sepia(1) saturate(3) hue-rotate(270deg) brightness(1.2)'
              : isResearching
                ? 'sepia(0.5) saturate(2) hue-rotate(300deg)'
                : canUnlock
                  ? 'none'
                  : 'grayscale(0.8)',
          }}
        />
      </div>

      {/* Culture Info */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', overflow: 'hidden', flex: 1 }}>
        {/* Culture Name - Prominent */}
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: getNameColor(),
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '90px',
            lineHeight: 1.2,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {culture.name}
        </div>

        {/* Cost */}
        <div
          style={{
            fontSize: '10px',
            color: isUnlocked ? '#9c27b0' : '#ce93d8',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {isUnlocked ? '✓ Unlocked' : `${culture.cost} Vibes`}
        </div>

        {/* Slot Unlocks */}
        {unlockItems.length > 0 && (
          <div
            style={{
              fontSize: '9px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              maxWidth: '90px',
              display: 'flex',
              gap: '3px',
              alignItems: 'center',
            }}
          >
            {unlockItems[0] && (
              <span style={{ color: unlockItems[0].color, fontWeight: 500 }}>
                {unlockItems[0].name}
              </span>
            )}
            {unlockItems.length > 1 && (
              <span style={{ color: '#888', fontSize: '8px' }}>+{unlockItems.length - 1}</span>
            )}
          </div>
        )}
      </div>

      {/* Researching indicator */}
      {isResearching && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '12px',
            height: '12px',
            background: '#e91e63',
            borderRadius: '50%',
            border: '2px solid #fff',
            animation: 'pulse 1.5s infinite',
          }}
        />
      )}

      {/* Tech prerequisite indicator */}
      {culture.prerequisites.techs.length > 0 && !isResearching && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '14px',
            height: '14px',
            background: '#2196f3',
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          T
        </div>
      )}
      </button>

      {/* Custom Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            ...(tooltipPosition === 'above'
              ? { bottom: '100%', marginBottom: '8px' }
              : { top: '100%', marginTop: '8px' }),
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(180deg, #2d1a2e 0%, #1a0d1a 100%)',
            border: '1px solid #6a3070',
            borderRadius: '6px',
            padding: '10px 12px',
            minWidth: '200px',
            maxWidth: '280px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {/* Culture Name */}
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <img
              src={getCultureIcon(culture.id)}
              alt=""
              style={{ width: '20px', height: '20px' }}
            />
            {culture.name}
          </div>

          {/* Era & Cost */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#aaa',
            marginBottom: '8px',
            paddingBottom: '6px',
            borderBottom: '1px solid #4a3050',
          }}>
            <span>Era {culture.era}</span>
            <span style={{ color: isUnlocked ? '#9c27b0' : '#ce93d8', fontWeight: 600 }}>
              {isUnlocked ? '✓ Unlocked' : `${culture.cost} Vibes`}
            </span>
          </div>

          {/* Prerequisites */}
          {(culturePrereqNames.length > 0 || techPrereqNames.length > 0) && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '3px' }}>
                Prerequisites
              </div>
              {culturePrereqNames.length > 0 && (
                <div style={{ fontSize: '11px', color: '#ce93d8', marginBottom: '2px' }}>
                  {culturePrereqNames.join(', ')}
                </div>
              )}
              {techPrereqNames.length > 0 && (
                <div style={{ fontSize: '11px', color: '#64b5f6' }}>
                  {techPrereqNames.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Slot Unlocks */}
          {unlockItems.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '3px' }}>
                Unlocks Slot
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {unlockItems.map((item, i) => (
                  <div key={i} style={{ fontSize: '11px', color: item.color, fontWeight: 500 }}>
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policy Choices */}
          <div>
            <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '3px' }}>
              Policy Choices
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {culture.policyChoices.map((policy, i) => (
                <div key={i} style={{ fontSize: '10px' }}>
                  <span style={{ color: SLOT_COLORS[policy.slotType] || '#aaa', fontWeight: 600 }}>
                    [{policy.slotType.charAt(0).toUpperCase()}]
                  </span>
                  <span style={{ color: '#e0e0e0', marginLeft: '4px' }}>
                    {policy.name}
                  </span>
                  <span style={{ color: '#888', marginLeft: '4px', fontSize: '9px' }}>
                    - {policy.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reason why can't unlock */}
          {reason && !isUnlocked && (
            <div style={{
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px solid #4a3050',
              fontSize: '10px',
              color: '#ef5350',
              fontStyle: 'italic',
            }}>
              {reason}
            </div>
          )}

          {/* Tooltip arrow */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            ...(tooltipPosition === 'above'
              ? { bottom: '-6px', borderTop: '6px solid #6a3070' }
              : { top: '-6px', borderBottom: '6px solid #6a3070' }),
          }} />
        </div>
      )}
    </div>
  )
}
