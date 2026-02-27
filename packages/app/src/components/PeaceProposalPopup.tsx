// Popup shown at turn start when an enemy tribe proposes peace

import { useState } from 'react'

interface PeaceProposalPopupProps {
  tribeName: string
  tribeColor: string
  onAccept: () => void
  onReject: () => void
}

export function PeaceProposalPopup({
  tribeName,
  tribeColor,
  onAccept,
  onReject,
}: PeaceProposalPopupProps): JSX.Element {
  const [responded, setResponded] = useState(false)

  const handleAccept = () => {
    if (responded) return
    setResponded(true)
    onAccept()
  }

  const handleReject = () => {
    if (responded) return
    setResponded(true)
    onReject()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: '#1a1a2e',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          border: `2px solid ${tribeColor}`,
          boxShadow: `0 0 30px ${tribeColor}44`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '32px' }}>🕊️</div>
          <h2 style={{
            color: tribeColor,
            margin: 0,
            fontSize: '20px',
          }}>
            Peace Proposal
          </h2>
        </div>

        <p style={{
          color: '#d1d5db',
          fontSize: '14px',
          lineHeight: '1.5',
          margin: '0 0 8px 0',
        }}>
          The <span style={{ color: tribeColor, fontWeight: 'bold', textTransform: 'capitalize' }}>{tribeName}</span> tribe
          proposes a peace treaty to end the war.
        </p>

        <p style={{
          color: '#9ca3af',
          fontSize: '13px',
          lineHeight: '1.5',
          margin: '0 0 20px 0',
        }}>
          Accepting will transition relations to hostile (no attacks, no trade). Rejecting will continue the war.
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={handleReject}
            disabled={responded}
            style={{
              padding: '10px 20px',
              background: responded ? '#374151' : '#7f1d1d',
              border: `1px solid ${responded ? '#4b5563' : '#ef4444'}`,
              borderRadius: '6px',
              color: responded ? '#6b7280' : '#fca5a5',
              cursor: responded ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: responded ? 0.5 : 1,
            }}
          >
            Continue War
          </button>
          <button
            onClick={handleAccept}
            disabled={responded}
            style={{
              padding: '10px 20px',
              background: responded ? '#374151' : '#166534',
              border: `1px solid ${responded ? '#4b5563' : '#22c55e'}`,
              borderRadius: '6px',
              color: responded ? '#6b7280' : '#bbf7d0',
              cursor: responded ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              opacity: responded ? 0.5 : 1,
            }}
          >
            Accept Peace
          </button>
        </div>
      </div>
    </div>
  )
}
