// Card component for displaying a buildable item (unit, building, or wonder)

interface ItemCardProps {
  type: 'unit' | 'building' | 'wonder'
  id: string
  name: string
  cost: number
  turnsRemaining: number | null
  category?: string
  description?: string
  onClick: () => void
  disabled?: boolean
}

export function ItemCard({
  type,
  name,
  cost,
  turnsRemaining,
  category,
  description,
  onClick,
  disabled = false,
}: ItemCardProps): JSX.Element {
  // Color coding by type
  const typeColors: Record<string, string> = {
    unit: '#4caf50',
    building: '#2196f3',
    wonder: '#ffc107',
  }

  const categoryColors: Record<string, string> = {
    tech: '#64b5f6',
    economy: '#ffd54f',
    vibes: '#ba68c8',
    military: '#ef5350',
    production: '#ff9800',
  }

  const borderColor = typeColors[type] || '#666'
  const categoryColor = category ? categoryColors[category] || '#888' : undefined

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '12px',
        background: disabled ? '#1a1a1a' : '#2a2a3a',
        border: `2px solid ${disabled ? '#333' : borderColor}`,
        borderRadius: '8px',
        color: disabled ? '#666' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
        opacity: disabled ? 0.6 : 1,
        minWidth: '140px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '14px',
            marginBottom: '4px',
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            background: borderColor,
            borderRadius: '4px',
            color: '#fff',
            textTransform: 'uppercase',
          }}
        >
          {type}
        </div>
      </div>

      {/* Category badge (for wonders) */}
      {categoryColor && (
        <div
          style={{
            fontSize: '10px',
            color: categoryColor,
            marginBottom: '4px',
          }}
        >
          {category}
        </div>
      )}

      {/* Description */}
      {description && (
        <div
          style={{
            fontSize: '11px',
            color: '#888',
            marginBottom: '8px',
            lineHeight: 1.3,
          }}
        >
          {description}
        </div>
      )}

      {/* Footer - cost and turns */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
          paddingTop: '8px',
          borderTop: '1px solid #333',
        }}
      >
        <span style={{ fontSize: '12px', color: '#ff9800' }}>
          {cost} prod
        </span>
        <span style={{ fontSize: '12px', color: '#aaa' }}>
          {turnsRemaining === null ? '---' : `${turnsRemaining} turns`}
        </span>
      </div>
    </button>
  )
}
