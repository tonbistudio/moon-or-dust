// Policy selection popup - shown when a culture completes and player must choose A or B policy

import { useState } from 'react'
import type { Player, PolicyCard as PolicyCardType, PolicySlotType } from '@tribes/game-core'
import { getCulture } from '@tribes/game-core'

export type PolicyConfirmDestination = 'cultures' | 'policies'

interface PolicySelectionPopupProps {
  player: Player
  onConfirm: (choice: 'a' | 'b', navigateTo: PolicyConfirmDestination) => void
}

// Slot type colors (matching PolicyCard)
const SLOT_COLORS: Record<PolicySlotType, { primary: string; bg: string; glow: string }> = {
  military: { primary: '#ef4444', bg: 'linear-gradient(135deg, #3d1515 0%, #2a0f0f 100%)', glow: 'rgba(239, 68, 68, 0.4)' },
  economy: { primary: '#eab308', bg: 'linear-gradient(135deg, #3d3415 0%, #2a230f 100%)', glow: 'rgba(234, 179, 8, 0.4)' },
  progress: { primary: '#3b82f6', bg: 'linear-gradient(135deg, #15253d 0%, #0f1a2a 100%)', glow: 'rgba(59, 130, 246, 0.4)' },
  wildcard: { primary: '#a855f7', bg: 'linear-gradient(135deg, #2d153d 0%, #1f0f2a 100%)', glow: 'rgba(168, 85, 247, 0.4)' },
}

const SLOT_LABELS: Record<PolicySlotType, string> = {
  military: 'Military',
  economy: 'Economy',
  progress: 'Progress',
  wildcard: 'Wildcard',
}

function PolicyOption({
  policy,
  label,
  selected,
  onClick,
}: {
  policy: PolicyCardType
  label: string
  selected: boolean
  onClick: () => void
}): JSX.Element {
  const colors = SLOT_COLORS[policy.slotType]

  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: colors.bg,
        border: `3px solid ${selected ? '#4ade80' : colors.primary}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        color: '#fff',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: selected ? '0 0 20px rgba(74, 222, 128, 0.5)' : 'none',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
      }}
      onMouseOver={(e) => {
        if (!selected) {
          e.currentTarget.style.boxShadow = `0 0 20px ${colors.glow}`
          e.currentTarget.style.transform = 'scale(1.02)'
        }
      }}
      onMouseOut={(e) => {
        if (!selected) {
          e.currentTarget.style.boxShadow = 'none'
          e.currentTarget.style.transform = 'scale(1)'
        }
      }}
    >
      {/* Option label (A or B) */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: colors.primary,
          color: '#fff',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {label}
      </div>

      {/* Slot type badge */}
      <div
        style={{
          fontSize: '10px',
          fontWeight: 600,
          color: colors.primary,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '8px',
        }}
      >
        {SLOT_LABELS[policy.slotType]}
      </div>

      {/* Policy name */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#fff',
        }}
      >
        {policy.name}
      </div>

      {/* Policy description */}
      <div
        style={{
          fontSize: '13px',
          color: '#9ca3af',
          lineHeight: '1.4',
        }}
      >
        {policy.description}
      </div>
    </button>
  )
}

export function PolicySelectionPopup({
  player,
  onConfirm,
}: PolicySelectionPopupProps): JSX.Element | null {
  const [selectedChoice, setSelectedChoice] = useState<'a' | 'b' | null>(null)

  // Get current culture info
  const currentCulture = player.currentCulture ? getCulture(player.currentCulture) : null

  if (!currentCulture) return null

  const policyA = currentCulture.policyChoices.find(p => p.choice === 'a')
  const policyB = currentCulture.policyChoices.find(p => p.choice === 'b')

  if (!policyA || !policyB) return null

  // Check if culture provides slot unlocks
  const slotUnlocks = currentCulture.slotUnlocks
  const hasSlotUnlocks = slotUnlocks && Object.values(slotUnlocks).some(v => v > 0)

  const handleConfirm = (destination: PolicyConfirmDestination) => {
    if (selectedChoice) {
      onConfirm(selectedChoice, destination)
    }
  }

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
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
          borderRadius: '16px',
          padding: '32px',
          minWidth: '600px',
          maxWidth: '700px',
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '2px solid #ba68c8',
          animation: 'popIn 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Culture complete icon */}
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          {'\uD83C\uDFDB\uFE0F'} {/* classical building emoji */}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#ba68c8',
          }}
        >
          Culture Unlocked!
        </div>

        {/* Culture name */}
        <div
          style={{
            fontSize: '16px',
            color: '#fff',
            marginBottom: '8px',
          }}
        >
          {currentCulture.name}
        </div>

        {/* Slot unlock info */}
        {hasSlotUnlocks && (
          <div
            style={{
              fontSize: '13px',
              color: '#4ade80',
              marginBottom: '24px',
              padding: '8px 16px',
              background: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '8px',
              display: 'inline-block',
            }}
          >
            +{Object.entries(slotUnlocks)
              .filter(([, v]) => v > 0)
              .map(([type, count]) => `${count} ${SLOT_LABELS[type as PolicySlotType]} slot${count > 1 ? 's' : ''}`)
              .join(', ')}
          </div>
        )}

        {/* Instruction */}
        <div
          style={{
            fontSize: '14px',
            color: '#9ca3af',
            marginBottom: '24px',
          }}
        >
          Choose one policy card to add to your pool:
        </div>

        {/* Policy Options */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
          }}
        >
          <PolicyOption
            policy={policyA}
            label="A"
            selected={selectedChoice === 'a'}
            onClick={() => setSelectedChoice('a')}
          />
          <PolicyOption
            policy={policyB}
            label="B"
            selected={selectedChoice === 'b'}
            onClick={() => setSelectedChoice('b')}
          />
        </div>

        {/* Confirmation Buttons */}
        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={() => handleConfirm('cultures')}
            disabled={!selectedChoice}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              background: selectedChoice
                ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
                : '#374151',
              color: selectedChoice ? '#fff' : '#6b7280',
              fontSize: '14px',
              fontWeight: 600,
              cursor: selectedChoice ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: selectedChoice ? 1 : 0.6,
            }}
            onMouseOver={(e) => {
              if (selectedChoice) {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)'
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Confirm & View Culture Tree
          </button>
          <button
            onClick={() => handleConfirm('policies')}
            disabled={!selectedChoice}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              background: selectedChoice
                ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                : '#374151',
              color: selectedChoice ? '#fff' : '#6b7280',
              fontSize: '14px',
              fontWeight: 600,
              cursor: selectedChoice ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              opacity: selectedChoice ? 1 : 0.6,
            }}
            onMouseOver={(e) => {
              if (selectedChoice) {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.4)'
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Confirm & View Policies
          </button>
        </div>

        {/* Note about slotting */}
        <div
          style={{
            marginTop: '16px',
            fontSize: '11px',
            color: '#6b7280',
          }}
        >
          Select a policy above, then confirm to add it to your pool
        </div>
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
