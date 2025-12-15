// Settlement info panel shown when a settlement is selected

import { useState } from 'react'
import type { Settlement } from '@tribes/game-core'
import { ProductionPanel } from './production'

interface SettlementPanelProps {
  settlement: Settlement
}

export function SettlementPanel({ settlement }: SettlementPanelProps): JSX.Element {
  const [showProductionPanel, setShowProductionPanel] = useState(false)

  const currentItem = settlement.productionQueue[0]
  const progressPercent = currentItem
    ? Math.min(
        100,
        Math.round(((currentItem.progress + settlement.currentProduction) / currentItem.cost) * 100)
      )
    : 0

  return (
    <>
      <div
        style={{
          padding: '16px',
          background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 100%)',
          borderTop: '1px solid #2a2a4a',
        }}
      >
        {/* Settlement Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
              {settlement.name}
              {settlement.isCapital && (
                <span
                  style={{
                    marginLeft: '8px',
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: '#ffc107',
                    color: '#000',
                    borderRadius: '4px',
                    verticalAlign: 'middle',
                  }}
                >
                  CAPITAL
                </span>
              )}
            </h3>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
              Level {settlement.level} | Population {settlement.population}
            </div>
          </div>
        </div>

        {/* Current Production */}
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span style={{ color: '#aaa', fontSize: '12px' }}>Current Production</span>
            {currentItem && (
              <span style={{ color: '#888', fontSize: '11px' }}>
                {currentItem.progress + settlement.currentProduction}/{currentItem.cost}
              </span>
            )}
          </div>

          {currentItem ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>
                  {formatItemName(currentItem.id)}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: getTypeBadgeColor(currentItem.type),
                    borderRadius: '4px',
                    color: '#fff',
                    textTransform: 'uppercase',
                  }}
                >
                  {currentItem.type}
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: '8px',
                  background: '#1a1a2a',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #4caf50, #8bc34a)',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              Nothing in production
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowProductionPanel(true)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#2196f3',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
            }}
          >
            {currentItem ? 'Change Production' : 'Select Production'}
          </button>
        </div>

        {/* Queue preview if more items */}
        {settlement.productionQueue.length > 1 && (
          <div style={{ marginTop: '12px', color: '#666', fontSize: '12px' }}>
            +{settlement.productionQueue.length - 1} more in queue
          </div>
        )}
      </div>

      {/* Production Panel Overlay */}
      {showProductionPanel && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowProductionPanel(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 99,
            }}
          />
          <ProductionPanel
            settlement={settlement}
            onClose={() => setShowProductionPanel(false)}
          />
        </>
      )}
    </>
  )
}

function formatItemName(id: string): string {
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
