// Panel showing the full culture tree organized by era

import type { Player, CultureId } from '@tribes/game-core'
import { ALL_CULTURES, getCulture, getCultureProgress, getTurnsToCompleteCulture } from '@tribes/game-core'
import { CultureCard } from './CultureCard'

interface CulturePanelProps {
  player: Player
  onSelectCulture: (cultureId: CultureId) => void
  onClose: () => void
}

export function CulturePanel({
  player,
  onSelectCulture,
  onClose,
}: CulturePanelProps): JSX.Element {
  // Group cultures by era
  const era1Cultures = ALL_CULTURES.filter((c) => c.era === 1)
  const era2Cultures = ALL_CULTURES.filter((c) => c.era === 2)
  const era3Cultures = ALL_CULTURES.filter((c) => c.era === 3)

  // Current culture info
  const currentCulture = player.currentCulture ? getCulture(player.currentCulture) : null
  const progress = getCultureProgress(player)
  const turnsRemaining = getTurnsToCompleteCulture(player)

  // Policy slots info
  const slots = player.policies.slots
  const activeCount = player.policies.active.length
  const totalSlots = slots.military + slots.economy + slots.progress + slots.wildcard

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
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a2e',
          borderRadius: '12px',
          padding: '20px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'auto',
          border: '2px solid #333',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '1px solid #333',
          }}
        >
          <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>
            Culture Tree
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Policy Slots Summary */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '16px',
            padding: '10px 14px',
            background: '#2a2a3a',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        >
          <div>
            <span style={{ color: '#888' }}>Policy Slots: </span>
            <span style={{ color: '#fff' }}>{activeCount}/{totalSlots}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ color: '#ef4444' }}>M:{slots.military}</span>
            <span style={{ color: '#fbbf24' }}>E:{slots.economy}</span>
            <span style={{ color: '#60a5fa' }}>P:{slots.progress}</span>
            <span style={{ color: '#a855f7' }}>W:{slots.wildcard}</span>
          </div>
        </div>

        {/* Current Culture Progress */}
        {currentCulture && progress && (
          <div
            style={{
              background: '#2a2a3a',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              border: '1px solid #ba68c8',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#888', fontSize: '12px' }}>Developing: </span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{currentCulture.name}</span>
              </div>
              <span style={{ color: '#ba68c8', fontSize: '12px' }}>
                {turnsRemaining === null ? '∞' : turnsRemaining} turns
              </span>
            </div>
            {/* Progress bar */}
            <div
              style={{
                marginTop: '8px',
                height: '6px',
                background: '#1a1a2e',
                borderRadius: '3px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress.percent}%`,
                  height: '100%',
                  background: '#ba68c8',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <div style={{ fontSize: '10px', color: '#888', marginTop: '4px', textAlign: 'right' }}>
              {progress.current} / {progress.total} Vibes
            </div>
          </div>
        )}

        {/* Era Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Era 1 */}
          <div>
            <h3 style={{ color: '#4caf50', margin: '0 0 12px 0', fontSize: '14px' }}>
              Era 1: Tribal Age (15-35 Vibes)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {era1Cultures.map((culture) => (
                <CultureCard
                  key={culture.id}
                  culture={culture}
                  player={player}
                  isResearching={player.currentCulture === culture.id}
                  onSelect={onSelectCulture}
                />
              ))}
            </div>
          </div>

          {/* Era 2 */}
          <div>
            <h3 style={{ color: '#2196f3', margin: '0 0 12px 0', fontSize: '14px' }}>
              Era 2: Classical Age (40-70 Vibes)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {era2Cultures.map((culture) => (
                <CultureCard
                  key={culture.id}
                  culture={culture}
                  player={player}
                  isResearching={player.currentCulture === culture.id}
                  onSelect={onSelectCulture}
                />
              ))}
            </div>
          </div>

          {/* Era 3 */}
          <div>
            <h3 style={{ color: '#9c27b0', margin: '0 0 12px 0', fontSize: '14px' }}>
              Era 3: Renaissance Age (80-120 Vibes)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {era3Cultures.map((culture) => (
                <CultureCard
                  key={culture.id}
                  culture={culture}
                  player={player}
                  isResearching={player.currentCulture === culture.id}
                  onSelect={onSelectCulture}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '20px',
            paddingTop: '12px',
            borderTop: '1px solid #333',
            fontSize: '11px',
            color: '#888',
          }}
        >
          <span><span style={{ color: '#ffd700' }}>■</span> Unlocked</span>
          <span><span style={{ color: '#ff9800' }}>■</span> In Progress</span>
          <span><span style={{ color: '#4caf50' }}>■</span> Available</span>
          <span><span style={{ color: '#333' }}>■</span> Locked</span>
        </div>
      </div>
    </div>
  )
}
