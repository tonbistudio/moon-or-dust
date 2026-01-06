// Civ 4 style tech tree panel with horizontal layout and prerequisite lines

import { useRef, useState, useCallback } from 'react'
import type { Player, TechId } from '@tribes/game-core'
import { ALL_TECHS, getTech, getResearchProgress, getTurnsToComplete } from '@tribes/game-core'
import { TechNode } from './TechNode'

// Get all prerequisite techs recursively (full chain leading to a tech)
function getPrerequisiteChain(techId: TechId, visited: Set<TechId> = new Set()): Set<TechId> {
  if (visited.has(techId)) return visited

  const tech = getTech(techId)
  if (!tech) return visited

  for (const prereqId of tech.prerequisites.techs) {
    visited.add(prereqId)
    getPrerequisiteChain(prereqId, visited)
  }

  return visited
}

interface TechTreePanelProps {
  player: Player
  onSelectTech: (techId: TechId) => void
  onClose: () => void
}

// Node dimensions
const NODE_WIDTH = 140
const NODE_HEIGHT = 52

// Layout positions for each tech (x, y in pixels)
// Organized to flow left-to-right with minimal line crossings
// Y offset to clear era labels at top
const TOP_OFFSET = 30
const ROW_HEIGHT = 66  // Spacing between rows
const COL_WIDTH = 170  // Spacing between columns

const TECH_POSITIONS: Record<string, { x: number; y: number }> = {
  // Era 1 - Column 1
  mining:            { x: COL_WIDTH * 0, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  animal_husbandry:  { x: COL_WIDTH * 0, y: TOP_OFFSET + ROW_HEIGHT * 1 },
  coding:            { x: COL_WIDTH * 0, y: TOP_OFFSET + ROW_HEIGHT * 3 },
  minting:           { x: COL_WIDTH * 0, y: TOP_OFFSET + ROW_HEIGHT * 5 },

  // Era 1 - Column 2
  bronze_working:    { x: COL_WIDTH * 1, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  farming:           { x: COL_WIDTH * 1, y: TOP_OFFSET + ROW_HEIGHT * 1 },
  archery:           { x: COL_WIDTH * 1, y: TOP_OFFSET + ROW_HEIGHT * 2 },
  smart_contracts:   { x: COL_WIDTH * 1, y: TOP_OFFSET + ROW_HEIGHT * 3 },
  pfps:              { x: COL_WIDTH * 1, y: TOP_OFFSET + ROW_HEIGHT * 4 },

  // Era 1 - Column 3
  horseback_riding:  { x: COL_WIDTH * 2, y: TOP_OFFSET + ROW_HEIGHT * 1 },

  // Era 2 - Column 4
  iron_working:      { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  lending:           { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 2 },
  staking:           { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 3 },
  discord:           { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 4 },
  currency:          { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 5 },
  onchain_gaming:    { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 6 },

  // Era 2 - Column 5
  botting:           { x: COL_WIDTH * 4, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  matrica:           { x: COL_WIDTH * 4, y: TOP_OFFSET + ROW_HEIGHT * 4 },
  defi:              { x: COL_WIDTH * 4, y: TOP_OFFSET + ROW_HEIGHT * 5 },
  priority_fees:     { x: COL_WIDTH * 4, y: TOP_OFFSET + ROW_HEIGHT * 6 },

  // Era 3 - Column 6
  hardware_wallets:  { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  hacking:           { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 1 },
  ponzinomics:       { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 3 },
  tokenomics:        { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 5 },
  artificial_intelligence: { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 6 },
  firedancer:        { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 7 },

  // Era 3 - Column 7
  siege_weapons:     { x: COL_WIDTH * 6, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  ohm:               { x: COL_WIDTH * 6, y: TOP_OFFSET + ROW_HEIGHT * 3 },
  wolf_game:         { x: COL_WIDTH * 6, y: TOP_OFFSET + ROW_HEIGHT * 5 },
  liquidity_pools:   { x: COL_WIDTH * 6, y: TOP_OFFSET + ROW_HEIGHT * 6 },
}

// Era boundaries for background shading (based on COL_WIDTH = 170)
const ERA_BOUNDARIES = [
  { era: 1, startX: -20, endX: 500, label: 'Era 1: Exploration', color: 'rgba(76, 175, 80, 0.08)' },
  { era: 2, startX: 500, endX: 840, label: 'Era 2: Development', color: 'rgba(33, 150, 243, 0.08)' },
  { era: 3, startX: 840, endX: 1220, label: 'Era 3: Optimization', color: 'rgba(156, 39, 176, 0.08)' },
]

export function TechTreePanel({
  player,
  onSelectTech,
  onClose,
}: TechTreePanelProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredTech, setHoveredTech] = useState<TechId | null>(null)

  // Current research info
  const currentResearch = player.currentResearch ? getTech(player.currentResearch) : null
  const progress = getResearchProgress(player)
  const turnsRemaining = getTurnsToComplete(player)

  // Calculate total tree dimensions
  const treeWidth = 1200
  const treeHeight = 580

  // Get the full prerequisite chain for the hovered tech
  const highlightedChain = hoveredTech ? getPrerequisiteChain(hoveredTech) : new Set<TechId>()

  // Hover handlers
  const handleTechHover = useCallback((techId: TechId | null) => {
    setHoveredTech(techId)
  }, [])

  // Draw prerequisite lines as SVG paths
  const renderPrerequisiteLines = () => {
    const lines: JSX.Element[] = []

    ALL_TECHS.forEach((tech) => {
      const toPos = TECH_POSITIONS[tech.id]
      if (!toPos) return

      // Draw lines from tech prerequisites
      tech.prerequisites.techs.forEach((prereqId) => {
        const fromPos = TECH_POSITIONS[prereqId]
        if (!fromPos) return

        const fromX = fromPos.x + NODE_WIDTH
        const fromY = fromPos.y + NODE_HEIGHT / 2
        const toX = toPos.x
        const toY = toPos.y + NODE_HEIGHT / 2

        // Determine line color based on state
        const isPrereqResearched = player.researchedTechs.includes(prereqId)
        const isTechResearched = player.researchedTechs.includes(tech.id)
        const isTechResearching = player.currentResearch === tech.id

        // Check if this line is part of the highlighted path
        const isInHighlightedPath = hoveredTech && (
          (tech.id === hoveredTech && highlightedChain.has(prereqId)) ||
          (highlightedChain.has(tech.id) && highlightedChain.has(prereqId))
        )
        const shouldDim = hoveredTech && !isInHighlightedPath

        let strokeColor = '#333'
        let strokeWidth = 2
        let strokeOpacity = shouldDim ? 0.15 : 0.4

        if (isInHighlightedPath) {
          strokeColor = '#64b5f6'
          strokeOpacity = 1
          strokeWidth = 3
        } else if (isTechResearched) {
          strokeColor = '#c9a227'
          strokeOpacity = shouldDim ? 0.25 : 0.7
        } else if (isTechResearching) {
          strokeColor = '#e67e22'
          strokeOpacity = shouldDim ? 0.3 : 0.8
          strokeWidth = 2.5
        } else if (isPrereqResearched) {
          strokeColor = '#27ae60'
          strokeOpacity = shouldDim ? 0.2 : 0.6
        }

        // Calculate control points for bezier curve
        const controlOffset = Math.min(40, Math.abs(toX - fromX) / 3)

        const pathD = `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`

        lines.push(
          <path
            key={`${prereqId}-${tech.id}`}
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            strokeLinecap="round"
          />
        )

        // Arrow head
        const arrowSize = 5
        lines.push(
          <polygon
            key={`${prereqId}-${tech.id}-arrow`}
            points={`${toX},${toY} ${toX - arrowSize - 2},${toY - arrowSize} ${toX - arrowSize - 2},${toY + arrowSize}`}
            fill={strokeColor}
            opacity={strokeOpacity}
          />
        )
      })
    })

    return lines
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.92)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid #333',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 600 }}>
          Technology Tree
        </h2>

        {/* Current Research Progress */}
        {currentResearch && progress && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(230, 126, 34, 0.15)',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid rgba(230, 126, 34, 0.3)',
            }}
          >
            <img
              src={`/assets/icons/techs/${currentResearch.id}.svg`}
              alt={currentResearch.name}
              style={{ width: '24px', height: '24px' }}
            />
            <div>
              <div style={{ fontSize: '12px', color: '#ffb366' }}>
                Researching: <strong>{currentResearch.name}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div
                  style={{
                    width: '120px',
                    height: '4px',
                    background: '#1a1a2e',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress.percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #e67e22, #f39c12)',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <span style={{ fontSize: '10px', color: '#888' }}>
                  {progress.current}/{progress.total} ({turnsRemaining === Infinity ? '∞' : turnsRemaining} turns)
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0 8px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Main Tree Container - Scrollable */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tree Content */}
        <div
          style={{
            position: 'relative',
            width: `${treeWidth}px`,
            height: `${treeHeight}px`,
            margin: '0 auto',
          }}
        >
          {/* Era Background Shading */}
          {ERA_BOUNDARIES.map((era) => (
            <div
              key={era.era}
              style={{
                position: 'absolute',
                left: `${era.startX}px`,
                top: '-10px',
                width: `${era.endX - era.startX}px`,
                height: `${treeHeight + 20}px`,
                background: era.color,
                borderLeft: era.era > 1 ? '1px dashed rgba(255,255,255,0.1)' : 'none',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '0px',
                  left: '10px',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.3)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {era.label}
              </div>
            </div>
          ))}

          {/* SVG Layer for Prerequisite Lines */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            {renderPrerequisiteLines()}
          </svg>

          {/* Tech Nodes */}
          {ALL_TECHS.map((tech) => {
            const pos = TECH_POSITIONS[tech.id]
            if (!pos) {
              console.warn(`No position defined for tech: ${tech.id}`)
              return null
            }

            // Determine if this node is part of the highlighted path
            const isHovered = hoveredTech === tech.id
            const isInChain = highlightedChain.has(tech.id)
            const isDimmed = hoveredTech !== null && !isHovered && !isInChain

            // Show tooltip above for techs in bottom two rows (row 6+)
            const tooltipPosition = pos.y >= TOP_OFFSET + ROW_HEIGHT * 6 ? 'above' : 'below'

            return (
              <TechNode
                key={tech.id}
                tech={tech}
                player={player}
                isResearching={player.currentResearch === tech.id}
                onSelect={onSelectTech}
                onHover={handleTechHover}
                isHighlighted={isHovered || isInChain}
                isDimmed={isDimmed}
                tooltipPosition={tooltipPosition}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          padding: '10px 20px',
          borderTop: '1px solid #333',
          background: 'linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 100%)',
          fontSize: '11px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: '#c9a227', borderRadius: '2px' }} />
          <span style={{ color: '#888' }}>Researched</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: '#e67e22', borderRadius: '2px' }} />
          <span style={{ color: '#888' }}>In Progress</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: '#27ae60', borderRadius: '2px' }} />
          <span style={{ color: '#888' }}>Available</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: '#555', borderRadius: '2px' }} />
          <span style={{ color: '#888' }}>Locked</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid #444' }}>
          <span style={{
            width: '14px',
            height: '14px',
            background: '#9c27b0',
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            fontWeight: 700,
            color: '#fff',
          }}>C</span>
          <span style={{ color: '#888' }}>Requires Culture</span>
        </span>
      </div>

      {/* Pulse animation for researching indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}
