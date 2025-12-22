// Settlement info panel shown when a settlement is selected (side panel)

import { useState } from 'react'
import type { Settlement } from '@tribes/game-core'
import { calculateSettlementYields, getLevelProgress } from '@tribes/game-core'
import { useGame } from '../hooks/useGame'
import { ProductionPanel } from './production'
import { YieldIcon } from './YieldIcon'

interface SettlementPanelProps {
  settlement: Settlement
}

export function SettlementPanel({ settlement }: SettlementPanelProps): JSX.Element {
  const { state } = useGame()
  const [showProductionPanel, setShowProductionPanel] = useState(false)

  // Calculate settlement yields
  const yields = state ? calculateSettlementYields(state, settlement) : null

  // Calculate level progress
  const levelProgress = getLevelProgress(settlement.population)

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
          width: '280px',
          height: '100%',
          padding: '12px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.9) 100%)',
          borderRight: '1px solid #2a2a4a',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Settlement Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', flex: 1 }}>
              {settlement.name}
            </h3>
            {settlement.isCapital && (
              <span
                style={{
                  fontSize: '9px',
                  padding: '2px 5px',
                  background: '#ffc107',
                  color: '#000',
                  borderRadius: '3px',
                  fontWeight: 'bold',
                }}
              >
                CAPITAL
              </span>
            )}
          </div>
        </div>

        {/* Population Level Progress */}
        <div
          style={{
            padding: '10px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '13px' }}>
              Pop. Level {settlement.level}
            </span>
            {levelProgress.nextLevelPop !== null && (
              <span style={{ color: '#888', fontSize: '11px' }}>
                {settlement.population}/{levelProgress.nextLevelPop}
              </span>
            )}
          </div>
          {/* Level progress bar */}
          {levelProgress.nextLevelPop !== null ? (
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
                  width: `${levelProgress.progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2e7d32, #4caf50)',
                  transition: 'width 0.3s',
                }}
              />
            </div>
          ) : (
            <div style={{ color: '#4caf50', fontSize: '11px' }}>Max level reached</div>
          )}
          {yields && yields.growth > 0 && (
            <div style={{ color: '#666', fontSize: '10px', marginTop: '4px' }}>
              +{yields.growth} growth/turn
            </div>
          )}
        </div>

        {/* Settlement Yields */}
        {yields && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              padding: '10px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '6px',
            }}
          >
            <YieldIcon type="gold" value={yields.gold} size={16} />
            <YieldIcon type="production" value={yields.production} size={16} />
            <YieldIcon type="alpha" value={yields.alpha} size={16} />
            <YieldIcon type="vibes" value={yields.vibes} size={16} />
          </div>
        )}

        {/* Current Production */}
        <div
          style={{
            padding: '10px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px',
            }}
          >
            <span style={{ color: '#aaa', fontSize: '11px', textTransform: 'uppercase' }}>Production</span>
            {currentItem && (
              <span style={{ color: '#888', fontSize: '10px' }}>
                {currentItem.progress + settlement.currentProduction}/{currentItem.cost}
              </span>
            )}
          </div>

          {currentItem ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px' }}>
                  {formatItemName(currentItem.id)}
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    padding: '1px 4px',
                    background: getTypeBadgeColor(currentItem.type),
                    borderRadius: '3px',
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
                    background: 'linear-gradient(90deg, #ff9800, #ffb74d)',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ color: '#666', fontStyle: 'italic', fontSize: '12px' }}>
              Nothing in production
            </div>
          )}
        </div>

        {/* Queue preview if more items */}
        {settlement.productionQueue.length > 1 && (
          <div style={{ color: '#666', fontSize: '11px', textAlign: 'center' }}>
            +{settlement.productionQueue.length - 1} more in queue
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => setShowProductionPanel(true)}
          style={{
            padding: '10px',
            background: '#2196f3',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
          }}
        >
          {currentItem ? 'Change Production' : 'Select Production'}
        </button>
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
