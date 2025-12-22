// Popup for confirming war declaration when attacking a non-enemy unit

interface WarConfirmationPopupProps {
  attackerTribe: string
  defenderTribe: string
  onConfirm: () => void
  onCancel: () => void
}

export function WarConfirmationPopup({
  attackerTribe: _attackerTribe,
  defenderTribe,
  onConfirm,
  onCancel,
}: WarConfirmationPopupProps): JSX.Element {
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
      onClick={onCancel}
    >
      <div
        style={{
          background: '#1a1a2e',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          border: '2px solid #ef4444',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <div style={{
            fontSize: '32px',
          }}>
            ⚔️
          </div>
          <h2 style={{
            color: '#ef4444',
            margin: 0,
            fontSize: '20px',
          }}>
            Declare War?
          </h2>
        </div>

        <p style={{
          color: '#d1d5db',
          fontSize: '14px',
          lineHeight: '1.5',
          margin: '0 0 8px 0',
        }}>
          Attacking the <span style={{ color: '#fbbf24', fontWeight: 'bold', textTransform: 'capitalize' }}>{defenderTribe}</span> will
          declare war on their tribe.
        </p>

        <p style={{
          color: '#9ca3af',
          fontSize: '13px',
          lineHeight: '1.5',
          margin: '0 0 20px 0',
        }}>
          This action will:
        </p>

        <ul style={{
          color: '#9ca3af',
          fontSize: '12px',
          margin: '0 0 24px 0',
          paddingLeft: '20px',
        }}>
          <li style={{ marginBottom: '4px' }}>Cancel all trade routes with {defenderTribe}</li>
          <li style={{ marginBottom: '4px' }}>Cause their allies to also declare war on you</li>
          <li style={{ marginBottom: '4px' }}>Damage your reputation with other tribes</li>
        </ul>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              background: '#374151',
              border: 'none',
              borderRadius: '6px',
              color: '#d1d5db',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Declare War & Attack
          </button>
        </div>
      </div>
    </div>
  )
}
