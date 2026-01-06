// Card component for displaying a buildable item (unit, building, or wonder)

import { Tooltip, TooltipHeader, TooltipSection, TooltipRow, TooltipDivider } from '../Tooltip'

interface ItemCardProps {
  type: 'unit' | 'building' | 'wonder'
  id: string
  name: string
  cost: number
  turnsRemaining: number | null
  category?: string | undefined
  description?: string | undefined
  onClick: () => void
  disabled?: boolean | undefined
  goldCost?: number | null
  canPurchase?: boolean
  onPurchase?: () => void
}

// Type descriptions
const TYPE_INFO: Record<string, { label: string; desc: string }> = {
  unit: { label: 'Unit', desc: 'Mobile entity that can move, explore, and fight.' },
  building: { label: 'Building', desc: 'Permanent structure providing yield bonuses.' },
  wonder: { label: 'Wonder', desc: 'Unique global structure. Only one can exist!' },
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
  goldCost = null,
  canPurchase = false,
  onPurchase,
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
  const typeInfo = TYPE_INFO[type]

  const tooltipContent = (
    <div>
      <TooltipHeader title={name} subtitle={typeInfo?.label} />
      <TooltipDivider />
      <TooltipSection label="Production Cost">
        <TooltipRow label="Cost" value={`${cost} production`} valueColor="#ff9800" />
        {turnsRemaining !== null && (
          <TooltipRow label="ETA" value={`${turnsRemaining} turn${turnsRemaining !== 1 ? 's' : ''}`} valueColor="#aaa" />
        )}
      </TooltipSection>
      {goldCost !== null && (
        <TooltipSection label="Gold Purchase">
          <TooltipRow label="Buy Now" value={`${goldCost} gold`} valueColor="#fbbf24" />
        </TooltipSection>
      )}
      {description && (
        <TooltipSection label="Effect">
          <div style={{ fontSize: '11px', color: '#ccc', lineHeight: 1.4 }}>{description}</div>
        </TooltipSection>
      )}
      {typeInfo && (
        <div style={{ fontSize: '10px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
          {typeInfo.desc}
        </div>
      )}
    </div>
  )

  return (
    <Tooltip content={tooltipContent} position="left" maxWidth={260}>
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
          width: '100%',
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

      {/* Gold purchase button */}
      {goldCost !== null && onPurchase && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPurchase()
          }}
          disabled={!canPurchase}
          style={{
            marginTop: '8px',
            padding: '6px 0',
            width: '100%',
            background: canPurchase ? 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)' : '#333',
            border: 'none',
            borderRadius: '4px',
            color: canPurchase ? '#000' : '#666',
            fontSize: '11px',
            fontWeight: 600,
            cursor: canPurchase ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          Buy: {goldCost} gold
        </button>
      )}
      </button>
    </Tooltip>
  )
}
