// Card component for displaying a culture

import type { Culture, CultureId, Player } from '@tribes/game-core'
import { getCulture, canUnlockCulture } from '@tribes/game-core'

interface CultureCardProps {
  culture: Culture
  player: Player
  isResearching: boolean
  onSelect: (cultureId: CultureId) => void
}

export function CultureCard({
  culture,
  player,
  isResearching,
  onSelect,
}: CultureCardProps): JSX.Element {
  const isUnlocked = player.unlockedCultures.includes(culture.id)
  const { canUnlock, reason } = canUnlockCulture(player, culture.id)

  // Era colors
  const eraColors: Record<number, string> = {
    1: '#4caf50', // Green for Era 1
    2: '#2196f3', // Blue for Era 2
    3: '#9c27b0', // Purple for Era 3
  }

  const borderColor = isUnlocked
    ? '#ffd700' // Gold for unlocked
    : isResearching
      ? '#ff9800' // Orange for in-progress
      : canUnlock
        ? eraColors[culture.era] || '#666'
        : '#333' // Gray for locked

  const bgColor = isUnlocked
    ? '#2a3a2a'
    : isResearching
      ? '#3a2a1a'
      : '#2a2a3a'

  // Get prerequisite names for display
  const culturePrereqs = culture.prerequisites.cultures
    .map((id) => getCulture(id)?.name || id)
    .join(', ')
  const techPrereqs = culture.prerequisites.techs.join(', ')

  // Format slot unlocks
  const slotUnlocks = culture.slotUnlocks
    ? Object.entries(culture.slotUnlocks)
        .filter(([_, count]) => count && count > 0)
        .map(([type, count]) => `+${count} ${type}`)
        .join(', ')
    : null

  return (
    <button
      onClick={() => onSelect(culture.id)}
      disabled={isUnlocked || (!canUnlock && !isResearching)}
      title={reason || (isUnlocked ? 'Already unlocked' : undefined)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '10px',
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        color: isUnlocked || canUnlock || isResearching ? '#fff' : '#666',
        cursor: isUnlocked ? 'default' : canUnlock ? 'pointer' : 'not-allowed',
        textAlign: 'left',
        transition: 'all 0.2s',
        opacity: isUnlocked ? 0.8 : 1,
        minWidth: '140px',
        maxWidth: '170px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '12px',
            lineHeight: 1.2,
          }}
        >
          {culture.name}
        </div>
        {isUnlocked && (
          <span style={{ fontSize: '12px' }}>✓</span>
        )}
        {isResearching && (
          <span style={{ fontSize: '10px', color: '#ff9800' }}>...</span>
        )}
      </div>

      {/* Cost */}
      <div
        style={{
          fontSize: '11px',
          color: '#ba68c8',
          marginTop: '4px',
        }}
      >
        {culture.cost} Vibes
      </div>

      {/* Slot Unlocks */}
      {slotUnlocks && (
        <div
          style={{
            fontSize: '10px',
            color: '#4caf50',
            marginTop: '4px',
          }}
        >
          {slotUnlocks} slot
        </div>
      )}

      {/* Prerequisites */}
      {(culturePrereqs || techPrereqs) && !isUnlocked && (
        <div
          style={{
            fontSize: '9px',
            color: '#888',
            marginTop: '4px',
            lineHeight: 1.2,
          }}
        >
          {culturePrereqs && <div>Requires: {culturePrereqs}</div>}
          {techPrereqs && <div style={{ color: '#64b5f6' }}>Tech: {techPrereqs}</div>}
        </div>
      )}

      {/* Policy Choices */}
      {culture.policyChoices && culture.policyChoices.length > 0 && (
        <div
          style={{
            fontSize: '9px',
            color: '#888',
            marginTop: '4px',
            borderTop: '1px solid #333',
            paddingTop: '4px',
          }}
        >
          <div style={{ color: '#aaa' }}>Policies:</div>
          <div style={{ color: '#f97316' }}>{culture.policyChoices[0]?.name}</div>
          <div style={{ color: '#60a5fa' }}>{culture.policyChoices[1]?.name}</div>
        </div>
      )}
    </button>
  )
}
