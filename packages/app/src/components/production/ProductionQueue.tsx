// Display of current production queue

import type { ProductionItem } from '@tribes/game-core'

interface ProductionQueueProps {
  items: readonly ProductionItem[]
  currentProduction: number
}

export function ProductionQueue({ items, currentProduction }: ProductionQueueProps): JSX.Element {
  if (items.length === 0) {
    return (
      <div style={{ color: '#666', fontStyle: 'italic', padding: '12px 0' }}>
        Nothing in production queue
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, index) => {
        const isFirst = index === 0
        const effectiveProgress = isFirst ? item.progress + currentProduction : item.progress
        const progressPercent = Math.min(100, Math.round((effectiveProgress / item.cost) * 100))

        return (
          <div
            key={`${item.type}-${item.id}-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              background: isFirst ? '#2a3a4a' : '#1a2a3a',
              borderRadius: '6px',
              border: isFirst ? '1px solid #3a5a7a' : '1px solid #2a3a4a',
            }}
          >
            {/* Queue position */}
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: isFirst ? '#4caf50' : '#444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#fff',
              }}
            >
              {index + 1}
            </div>

            {/* Item info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span
                  style={{
                    fontWeight: isFirst ? 'bold' : 'normal',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                >
                  {formatItemName(item.id)}
                </span>
                <span style={{ color: '#888', fontSize: '12px' }}>
                  {effectiveProgress}/{item.cost}
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: '6px',
                  background: '#1a1a2a',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: isFirst
                      ? 'linear-gradient(90deg, #4caf50, #8bc34a)'
                      : '#666',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>

            {/* Type badge */}
            <div
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: getTypeBadgeColor(item.type),
                borderRadius: '4px',
                color: '#fff',
                textTransform: 'uppercase',
              }}
            >
              {item.type}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function formatItemName(id: string): string {
  // Capitalize and format item names
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getTypeBadgeColor(type: string): string {
  switch (type) {
    case 'unit':
      return '#4caf50'
    case 'building':
      return '#2196f3'
    case 'wonder':
      return '#ffc107'
    default:
      return '#666'
  }
}
