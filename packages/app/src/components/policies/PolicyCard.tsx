// Civ 6 style policy card component

import type { PolicyCard as PolicyCardType, PolicySlotType } from '@tribes/game-core'

interface PolicyCardProps {
  policy: PolicyCardType
  isActive?: boolean
  isSelected?: boolean
  isDragging?: boolean
  onClick?: () => void
  size?: 'small' | 'normal' | 'large'
}

// Slot type colors matching Civ 6 style
const SLOT_COLORS: Record<PolicySlotType, { primary: string; secondary: string; bg: string; glow: string }> = {
  military: {
    primary: '#ef4444',
    secondary: '#dc2626',
    bg: 'linear-gradient(135deg, #3d1515 0%, #2a0f0f 100%)',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
  economy: {
    primary: '#eab308',
    secondary: '#ca8a04',
    bg: 'linear-gradient(135deg, #3d3415 0%, #2a230f 100%)',
    glow: 'rgba(234, 179, 8, 0.4)',
  },
  progress: {
    primary: '#3b82f6',
    secondary: '#2563eb',
    bg: 'linear-gradient(135deg, #15253d 0%, #0f1a2a 100%)',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
  wildcard: {
    primary: '#a855f7',
    secondary: '#9333ea',
    bg: 'linear-gradient(135deg, #2d153d 0%, #1f0f2a 100%)',
    glow: 'rgba(168, 85, 247, 0.4)',
  },
}

// Slot type icons/symbols
const SLOT_ICONS: Record<PolicySlotType, string> = {
  military: '⚔️',
  economy: '💰',
  progress: '🔬',
  wildcard: '⭐',
}

// Slot type short labels
const SLOT_LABELS: Record<PolicySlotType, string> = {
  military: 'MIL',
  economy: 'ECO',
  progress: 'PRG',
  wildcard: 'ANY',
}

export function PolicyCard({
  policy,
  isActive = false,
  isSelected = false,
  isDragging = false,
  onClick,
  size = 'normal',
}: PolicyCardProps): JSX.Element {
  const colors = SLOT_COLORS[policy.slotType]
  const icon = SLOT_ICONS[policy.slotType]

  // Size configurations
  const sizes = {
    small: { width: 140, height: 80, nameSize: 11, descSize: 9, iconSize: 14 },
    normal: { width: 180, height: 100, nameSize: 13, descSize: 10, iconSize: 16 },
    large: { width: 220, height: 120, nameSize: 15, descSize: 12, iconSize: 20 },
  }
  const s = sizes[size]

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: `${s.width}px`,
        minHeight: `${s.height}px`,
        padding: '10px 12px',
        background: colors.bg,
        border: `2px solid ${isSelected ? '#fff' : isActive ? colors.primary : colors.secondary}`,
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: isSelected
          ? `0 0 16px ${colors.glow}, 0 0 8px ${colors.glow}`
          : isActive
            ? `0 4px 12px rgba(0,0,0,0.4), 0 0 8px ${colors.glow}`
            : '0 2px 8px rgba(0,0,0,0.3)',
        opacity: 1,
        transform: isSelected ? 'scale(1.05)' : isDragging ? 'scale(1.05)' : 'scale(1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        textAlign: 'left',
      }}
    >
      {/* Slot Type Badge */}
      <div
        style={{
          position: 'absolute',
          top: '-1px',
          right: '-1px',
          background: colors.primary,
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: '0 6px 0 6px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        {SLOT_LABELS[policy.slotType]}
      </div>

      {/* Policy Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: `${s.iconSize}px` }}>{icon}</span>
        <span
          style={{
            fontSize: `${s.nameSize}px`,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.2,
          }}
        >
          {policy.name}
        </span>
      </div>

      {/* Policy Description */}
      <div
        style={{
          fontSize: `${s.descSize}px`,
          color: '#ccc',
          lineHeight: 1.3,
          flex: 1,
        }}
      >
        {policy.description}
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            right: '6px',
            fontSize: '10px',
            color: colors.primary,
            fontWeight: 600,
          }}
        >
          ACTIVE
        </div>
      )}
    </button>
  )
}
