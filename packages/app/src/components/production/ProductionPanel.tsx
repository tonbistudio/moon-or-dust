// Main settlement production UI panel

import { useMemo } from 'react'
import type { Settlement } from '@tribes/game-core'
import { getAvailableProduction, type AvailableProductionItem } from '@tribes/game-core'
import { useGame, useGameActions, useCurrentPlayer } from '../../hooks/useGame'
import { ProductionQueue } from './ProductionQueue'
import { AvailableItems } from './AvailableItems'

interface ProductionPanelProps {
  settlement: Settlement
  onClose: () => void
}

export function ProductionPanel({ settlement, onClose }: ProductionPanelProps): JSX.Element {
  const { state } = useGame()
  const { startProduction, cancelProduction, purchase } = useGameActions()
  const currentPlayer = useCurrentPlayer()

  // Get available production items for this settlement
  const availableItems = useMemo(() => {
    if (!state) return []
    return getAvailableProduction(state, settlement.id)
  }, [state, settlement.id])

  const handleSelectItem = (item: AvailableProductionItem) => {
    startProduction(settlement.id, item.type, item.id, item.cost)
  }

  const handleCancelItem = (queueIndex: number) => {
    cancelProduction(settlement.id, queueIndex)
  }

  const handlePurchaseItem = (item: AvailableProductionItem) => {
    if (item.type !== 'wonder') {
      purchase(settlement.id, item.type, item.id)
    }
  }

  const treasury = currentPlayer?.treasury ?? 0

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '400px',
        height: '100%',
        background: '#1a1a2e',
        borderLeft: '2px solid #2a2a4a',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          borderBottom: '1px solid #2a2a4a',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
            Production - {settlement.name}
          </h2>
          <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
            Level {settlement.level}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Production Queue Section */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #2a2a4a',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', color: '#aaa', fontSize: '14px' }}>
          Production Queue
        </h3>
        <ProductionQueue
          items={settlement.productionQueue}
          currentProduction={settlement.currentProduction}
          onCancel={handleCancelItem}
        />
      </div>

      {/* Available Items Section */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', color: '#aaa', fontSize: '14px' }}>
          Available Production
        </h3>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <AvailableItems
            items={availableItems}
            onSelectItem={handleSelectItem}
            onPurchaseItem={handlePurchaseItem}
            treasury={treasury}
          />
        </div>
      </div>

      {/* Footer - Production info */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #2a2a4a',
          background: '#141422',
        }}
      >
        <div style={{ color: '#888', fontSize: '12px' }}>
          Production output: <span style={{ color: '#ff9800' }}>+{settlement.currentProduction}/turn</span>
        </div>
      </div>
    </div>
  )
}
