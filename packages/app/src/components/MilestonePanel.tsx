// Milestone selection panel - shown when a settlement levels up to a milestone level

import type { Settlement } from '@tribes/game-core'
import { getMilestoneForLevel, getPendingMilestones } from '@tribes/game-core'

interface MilestonePanelProps {
  settlement: Settlement
  onSelect: (level: number, choice: 'a' | 'b') => void
  onDismiss: () => void
}

export function MilestonePanel({
  settlement,
  onSelect,
  onDismiss,
}: MilestonePanelProps): JSX.Element | null {
  const pendingLevels = getPendingMilestones(settlement)

  if (pendingLevels.length === 0) return null

  // Show the first pending milestone
  const level = pendingLevels[0]!
  const milestone = getMilestoneForLevel(level)

  if (!milestone) return null

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
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 1000,
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          padding: '32px',
          minWidth: '400px',
          maxWidth: '500px',
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '2px solid #4ade80',
          animation: 'popIn 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Level up icon */}
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {'\u2B50'} {/* star */}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#4ade80',
          }}
        >
          Level {level} Milestone!
        </div>

        {/* Settlement name */}
        <div
          style={{
            fontSize: '14px',
            color: '#9ca3af',
            marginBottom: '24px',
          }}
        >
          {settlement.name} has reached level {level}
        </div>

        {/* Options */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
          }}
        >
          {/* Option A */}
          <button
            onClick={() => onSelect(level, 'a')}
            style={{
              flex: 1,
              background: 'rgba(74, 222, 128, 0.1)',
              border: '2px solid #4ade80',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: '#fff',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)'
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(74, 222, 128, 0.1)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#4ade80',
              }}
            >
              {milestone.optionA.name}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              {milestone.optionA.description}
            </div>
          </button>

          {/* Option B */}
          <button
            onClick={() => onSelect(level, 'b')}
            style={{
              flex: 1,
              background: 'rgba(96, 165, 250, 0.1)',
              border: '2px solid #60a5fa',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: '#fff',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(96, 165, 250, 0.2)'
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <div
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '8px',
                color: '#60a5fa',
              }}
            >
              {milestone.optionB.name}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              {milestone.optionB.description}
            </div>
          </button>
        </div>

        {/* Pending count */}
        {pendingLevels.length > 1 && (
          <div
            style={{
              marginTop: '16px',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            +{pendingLevels.length - 1} more milestone{pendingLevels.length > 2 ? 's' : ''} pending
          </div>
        )}
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes popIn {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
