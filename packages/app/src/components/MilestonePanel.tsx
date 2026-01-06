// Milestone selection panel - shown when a settlement levels up to a milestone level

import type { Settlement } from '@tribes/game-core'
import { getMilestoneForLevel, getPendingMilestones } from '@tribes/game-core'
import { Tooltip } from './Tooltip'

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
        background: 'rgba(0, 0, 0, 0.92)',
        zIndex: 1000,
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: '#0d0d1a',
          borderRadius: '12px',
          minWidth: '480px',
          maxWidth: '560px',
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '1px solid #333',
          animation: 'popIn 0.3s ease-out',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
            borderBottom: '1px solid #333',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>
            {'\u2B50'}
          </div>
          <Tooltip
            content="Settlements gain levels through population growth. Each milestone grants a permanent reward choice."
            position="below"
            width={200}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#4ade80',
                cursor: 'help',
              }}
            >
              Level {level} Milestone!
            </div>
          </Tooltip>
          <div
            style={{
              fontSize: '13px',
              color: '#888',
              marginTop: '4px',
            }}
          >
            {settlement.name} has reached level {level}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <Tooltip
            content="This choice is permanent. The unchosen reward is lost forever for this settlement."
            position="below"
            width={200}
          >
            <div
              style={{
                fontSize: '13px',
                color: '#888',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'help',
              }}
            >
              Choose Your Reward
            </div>
          </Tooltip>

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
                background: 'rgba(74, 222, 128, 0.08)',
                border: '1px solid rgba(74, 222, 128, 0.3)',
                borderRadius: '8px',
                padding: '20px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: '#fff',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(74, 222, 128, 0.15)'
                e.currentTarget.style.borderColor = '#4ade80'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(74, 222, 128, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.3)'
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#4ade80',
                }}
              >
                {milestone.optionA.name}
              </div>
              <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.4 }}>
                {milestone.optionA.description}
              </div>
            </button>

            {/* Option B */}
            <button
              onClick={() => onSelect(level, 'b')}
              style={{
                flex: 1,
                background: 'rgba(96, 165, 250, 0.08)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                borderRadius: '8px',
                padding: '20px 16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: '#fff',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(96, 165, 250, 0.15)'
                e.currentTarget.style.borderColor = '#60a5fa'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(96, 165, 250, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)'
              }}
            >
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#60a5fa',
                }}
              >
                {milestone.optionB.name}
              </div>
              <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.4 }}>
                {milestone.optionB.description}
              </div>
            </button>
          </div>

          {/* Pending count */}
          {pendingLevels.length > 1 && (
            <div
              style={{
                marginTop: '16px',
                fontSize: '11px',
                color: '#666',
              }}
            >
              +{pendingLevels.length - 1} more milestone{pendingLevels.length > 2 ? 's' : ''} pending
            </div>
          )}
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes popIn {
          0% {
            transform: scale(0.9);
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
