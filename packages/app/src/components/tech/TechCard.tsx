// Card component for displaying a technology

import type { Tech, TechId, Player } from '@tribes/game-core'
import { getTech, canResearchTech } from '@tribes/game-core'

interface TechCardProps {
  tech: Tech
  player: Player
  isResearching: boolean
  onSelect: (techId: TechId) => void
}

export function TechCard({
  tech,
  player,
  isResearching,
  onSelect,
}: TechCardProps): JSX.Element {
  const isResearched = player.researchedTechs.includes(tech.id)
  const { canResearch, reason } = canResearchTech(player, tech.id)

  // Era colors
  const eraColors: Record<number, string> = {
    1: '#4caf50', // Green for Era 1
    2: '#2196f3', // Blue for Era 2
    3: '#9c27b0', // Purple for Era 3
  }

  const borderColor = isResearched
    ? '#ffd700' // Gold for researched
    : isResearching
      ? '#ff9800' // Orange for in-progress
      : canResearch
        ? eraColors[tech.era] || '#666'
        : '#333' // Gray for locked

  const bgColor = isResearched
    ? '#2a3a2a'
    : isResearching
      ? '#3a2a1a'
      : '#2a2a3a'

  // Get prerequisite names for tooltip
  const techPrereqs = tech.prerequisites.techs
    .map((id) => getTech(id)?.name || id)
    .join(', ')
  const culturePrereqs = tech.prerequisites.cultures.join(', ')

  return (
    <button
      onClick={() => onSelect(tech.id)}
      disabled={isResearched || (!canResearch && !isResearching)}
      title={reason || (isResearched ? 'Already researched' : undefined)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '10px',
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '6px',
        color: isResearched || canResearch || isResearching ? '#fff' : '#666',
        cursor: isResearched ? 'default' : canResearch ? 'pointer' : 'not-allowed',
        textAlign: 'left',
        transition: 'all 0.2s',
        opacity: isResearched ? 0.8 : 1,
        minWidth: '120px',
        maxWidth: '150px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '12px',
            lineHeight: 1.2,
          }}
        >
          {tech.name}
        </div>
        {isResearched && (
          <span style={{ fontSize: '12px' }}>✓</span>
        )}
        {isResearching && (
          <span style={{ fontSize: '10px', color: '#ff9800' }}>...</span>
        )}
      </div>

      {/* Cost */}
      <div
        style={{
          fontSize: '11px',
          color: '#64b5f6',
          marginTop: '4px',
        }}
      >
        {tech.cost} Alpha
      </div>

      {/* Prerequisites */}
      {(techPrereqs || culturePrereqs) && !isResearched && (
        <div
          style={{
            fontSize: '9px',
            color: '#888',
            marginTop: '4px',
            lineHeight: 1.2,
          }}
        >
          {techPrereqs && <div>Requires: {techPrereqs}</div>}
          {culturePrereqs && <div style={{ color: '#ba68c8' }}>Culture: {culturePrereqs}</div>}
        </div>
      )}

      {/* Unlocks (simplified) */}
      {tech.unlocks && (
        <div
          style={{
            fontSize: '9px',
            color: '#4caf50',
            marginTop: '4px',
          }}
        >
          {tech.unlocks.units && tech.unlocks.units.length > 0 && (
            <span>Units: {tech.unlocks.units.join(', ')}</span>
          )}
          {tech.unlocks.buildings && tech.unlocks.buildings.length > 0 && (
            <span>Buildings +{tech.unlocks.buildings.length}</span>
          )}
        </div>
      )}
    </button>
  )
}
