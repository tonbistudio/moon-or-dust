// Empty policy slot component - shows where a card can be placed

import type { PolicySlotType } from '@tribes/game-core'

interface PolicySlotProps {
  slotType: PolicySlotType
  isHighlighted?: boolean
  onClick?: () => void
}

// Slot type colors
const SLOT_COLORS: Record<PolicySlotType, { primary: string; border: string; bg: string }> = {
  military: {
    primary: '#ef4444',
    border: '#7f1d1d',
    bg: 'rgba(127, 29, 29, 0.3)',
  },
  economy: {
    primary: '#eab308',
    border: '#713f12',
    bg: 'rgba(113, 63, 18, 0.3)',
  },
  progress: {
    primary: '#3b82f6',
    border: '#1e3a5f',
    bg: 'rgba(30, 58, 95, 0.3)',
  },
  wildcard: {
    primary: '#a855f7',
    border: '#581c87',
    bg: 'rgba(88, 28, 135, 0.3)',
  },
}

// Slot type labels
const SLOT_NAMES: Record<PolicySlotType, string> = {
  military: 'Military',
  economy: 'Economy',
  progress: 'Progress',
  wildcard: 'Wildcard',
}

// Slot type icons
const SLOT_ICONS: Record<PolicySlotType, string> = {
  military: '⚔️',
  economy: '💰',
  progress: '🔬',
  wildcard: '⭐',
}

export function PolicySlot({
  slotType,
  isHighlighted = false,
  onClick,
}: PolicySlotProps): JSX.Element {
  const colors = SLOT_COLORS[slotType]

  return (
    <button
      onClick={onClick}
      style={{
        width: '180px',
        minHeight: '100px',
        padding: '10px 12px',
        background: colors.bg,
        border: `2px dashed ${isHighlighted ? colors.primary : colors.border}`,
        borderRadius: '8px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: isHighlighted ? `0 0 12px ${colors.primary}40` : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '24px', opacity: 0.5 }}>
        {SLOT_ICONS[slotType]}
      </span>
      <span
        style={{
          fontSize: '11px',
          color: colors.primary,
          opacity: 0.7,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}
      >
        {SLOT_NAMES[slotType]} Slot
      </span>
      <span
        style={{
          fontSize: '10px',
          color: '#666',
        }}
      >
        Empty
      </span>
    </button>
  )
}
