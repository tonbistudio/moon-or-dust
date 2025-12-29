// Grid of available production items

import { useState } from 'react'
import { ItemCard } from './ItemCard'
import type { AvailableProductionItem } from '@tribes/game-core'

type FilterType = 'all' | 'unit' | 'building' | 'wonder'

interface AvailableItemsProps {
  items: AvailableProductionItem[]
  onSelectItem: (item: AvailableProductionItem) => void
}

export function AvailableItems({ items, onSelectItem }: AvailableItemsProps): JSX.Element {
  const [filter, setFilter] = useState<FilterType>('all')

  const filteredItems =
    filter === 'all' ? items : items.filter((item) => item.type === filter)

  const filters: { type: FilterType; label: string }[] = [
    { type: 'all', label: 'All' },
    { type: 'unit', label: 'Units' },
    { type: 'building', label: 'Buildings' },
    { type: 'wonder', label: 'Wonders' },
  ]

  return (
    <div>
      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        {filters.map(({ type, label }) => {
          const count =
            type === 'all' ? items.length : items.filter((i) => i.type === type).length
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '6px 12px',
                background: filter === type ? '#4a4a6a' : '#2a2a3a',
                border: '1px solid',
                borderColor: filter === type ? '#6a6a9a' : '#3a3a4a',
                borderRadius: '4px',
                color: filter === type ? '#fff' : '#888',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <div style={{ color: '#666', fontStyle: 'italic', padding: '20px 0' }}>
          No items available
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {filteredItems.map((item) => (
            <ItemCard
              key={`${item.type}-${item.id}`}
              type={item.type}
              id={item.id}
              name={item.name}
              cost={item.cost}
              turnsRemaining={item.turnsRemaining}
              description={item.description}
              onClick={() => onSelectItem(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
