// Panel showing the full technology tree organized by era

import type { Player, TechId } from '@tribes/game-core'
import { ALL_TECHS, getTech, getResearchProgress, getTurnsToComplete } from '@tribes/game-core'
import { TechCard } from './TechCard'

interface TechTreePanelProps {
  player: Player
  onSelectTech: (techId: TechId) => void
  onClose: () => void
}

export function TechTreePanel({
  player,
  onSelectTech,
  onClose,
}: TechTreePanelProps): JSX.Element {
  // Group techs by era
  const era1Techs = ALL_TECHS.filter((t) => t.era === 1)
  const era2Techs = ALL_TECHS.filter((t) => t.era === 2)
  const era3Techs = ALL_TECHS.filter((t) => t.era === 3)

  // Current research info
  const currentResearch = player.currentResearch ? getTech(player.currentResearch) : null
  const progress = getResearchProgress(player)
  const turnsRemaining = getTurnsToComplete(player)

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
            Technology Tree
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

        {/* Current Research Progress */}
        {currentResearch && progress && (
          <div
            style={{
              background: '#2a2a3a',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              border: '1px solid #ff9800',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#888', fontSize: '12px' }}>Researching: </span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{currentResearch.name}</span>
              </div>
              <span style={{ color: '#64b5f6', fontSize: '12px' }}>
                {turnsRemaining === Infinity ? '∞' : turnsRemaining} turns
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
                  background: '#64b5f6',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <div style={{ fontSize: '10px', color: '#888', marginTop: '4px', textAlign: 'right' }}>
              {progress.current} / {progress.total} Alpha
            </div>
          </div>
        )}

        {/* Era Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Era 1 */}
          <div>
            <h3 style={{ color: '#4caf50', margin: '0 0 12px 0', fontSize: '14px' }}>
              Era 1: Ancient Age (20-40 Alpha)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {era1Techs.map((tech) => (
                <TechCard
                  key={tech.id}
                  tech={tech}
                  player={player}
                  isResearching={player.currentResearch === tech.id}
                  onSelect={onSelectTech}
                />
              ))}
            </div>
          </div>

          {/* Era 2 */}
          <div>
            <h3 style={{ color: '#2196f3', margin: '0 0 12px 0', fontSize: '14px' }}>
              Era 2: Classical Age (50-80 Alpha)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {era2Techs.map((tech) => (
                <TechCard
                  key={tech.id}
                  tech={tech}
                  player={player}
                  isResearching={player.currentResearch === tech.id}
                  onSelect={onSelectTech}
                />
              ))}
            </div>
          </div>

          {/* Era 3 */}
          <div>
            <h3 style={{ color: '#9c27b0', margin: '0 0 12px 0', fontSize: '14px' }}>
              Era 3: Renaissance Age (100-150 Alpha)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {era3Techs.map((tech) => (
                <TechCard
                  key={tech.id}
                  tech={tech}
                  player={player}
                  isResearching={player.currentResearch === tech.id}
                  onSelect={onSelectTech}
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
          <span><span style={{ color: '#ffd700' }}>■</span> Researched</span>
          <span><span style={{ color: '#ff9800' }}>■</span> In Progress</span>
          <span><span style={{ color: '#4caf50' }}>■</span> Available</span>
          <span><span style={{ color: '#333' }}>■</span> Locked</span>
        </div>
      </div>
    </div>
  )
}
