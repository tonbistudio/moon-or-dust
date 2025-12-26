// Civ 4 style culture tree panel with horizontal layout and prerequisite lines

import { useRef, useState, useCallback } from 'react'
import type { Player, CultureId } from '@tribes/game-core'
import { ALL_CULTURES, getCulture, getCultureProgress, getTurnsToCompleteCulture } from '@tribes/game-core'
import { CultureNode } from './CultureNode'

interface CultureTreePanelProps {
  player: Player
  onSelectCulture: (cultureId: CultureId) => void
  onClose: () => void
}

// Get all prerequisite cultures recursively (full chain leading to a culture)
function getPrerequisiteChain(cultureId: CultureId, visited: Set<CultureId> = new Set()): Set<CultureId> {
  if (visited.has(cultureId)) return visited

  const culture = getCulture(cultureId)
  if (!culture) return visited

  for (const prereqId of culture.prerequisites.cultures) {
    visited.add(prereqId)
    getPrerequisiteChain(prereqId, visited)
  }

  return visited
}

// Node dimensions
const NODE_WIDTH = 140
const NODE_HEIGHT = 52

// Layout positions for each culture (x, y in pixels)
// Organized to flow left-to-right with minimal line crossings
const TOP_OFFSET = 30
const ROW_HEIGHT = 66
const COL_WIDTH = 170

const CULTURE_POSITIONS: Record<string, { x: number; y: number }> = {
  // Era 1 - Column 1 (roots)
  community:       { x: COL_WIDTH * 0, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  influence:       { x: COL_WIDTH * 0, y: TOP_OFFSET + ROW_HEIGHT * 3 },
  otc_trading:     { x: COL_WIDTH * 0, y: TOP_OFFSET + ROW_HEIGHT * 6 },

  // Era 1 - Column 2
  builder_culture: { x: COL_WIDTH * 1, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  degen_culture:   { x: COL_WIDTH * 1, y: TOP_OFFSET + ROW_HEIGHT * 1 },
  social_media:    { x: COL_WIDTH * 1, y: TOP_OFFSET + ROW_HEIGHT * 3 },
  memeing:         { x: COL_WIDTH * 1, y: TOP_OFFSET + ROW_HEIGHT * 4 },
  early_adopters:  { x: COL_WIDTH * 1, y: TOP_OFFSET + ROW_HEIGHT * 6 },

  // Era 1 - Column 3
  diamond_hands:   { x: COL_WIDTH * 2, y: TOP_OFFSET + ROW_HEIGHT * 6 },

  // Era 2 - Column 4
  gm:              { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  whitelisting:    { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 2 },
  fudding:         { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 3 },
  virality:        { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 4 },
  memecoin_mania:  { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 5 },
  alpha_daos:      { x: COL_WIDTH * 3, y: TOP_OFFSET + ROW_HEIGHT * 7 },

  // Era 2 - Column 5
  follow_for_follow: { x: COL_WIDTH * 4, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  raiding:           { x: COL_WIDTH * 4, y: TOP_OFFSET + ROW_HEIGHT * 1 },
  defensive_tactics: { x: COL_WIDTH * 4, y: TOP_OFFSET + ROW_HEIGHT * 3 },
  degen_minting:     { x: COL_WIDTH * 4, y: TOP_OFFSET + ROW_HEIGHT * 7 },

  // Era 3 - Column 6
  innovation:      { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 1 },
  one_of_ones:     { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 2 },
  hard_shilling:   { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 4 },
  trenching:       { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 5 },
  auctions:        { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 6 },
  presales:        { x: COL_WIDTH * 5, y: TOP_OFFSET + ROW_HEIGHT * 7 },

  // Era 3 - Column 7
  delisting:       { x: COL_WIDTH * 6, y: TOP_OFFSET + ROW_HEIGHT * 0 },
  rugging:         { x: COL_WIDTH * 6, y: TOP_OFFSET + ROW_HEIGHT * 3 },
  sweeping:        { x: COL_WIDTH * 6, y: TOP_OFFSET + ROW_HEIGHT * 7 },
}

// Era boundaries for background shading (purple theme)
const ERA_BOUNDARIES = [
  { era: 1, startX: -20, endX: 500, label: 'Era 1: Exploration', color: 'rgba(156, 39, 176, 0.08)' },
  { era: 2, startX: 500, endX: 840, label: 'Era 2: Development', color: 'rgba(233, 30, 99, 0.08)' },
  { era: 3, startX: 840, endX: 1220, label: 'Era 3: Optimization', color: 'rgba(103, 58, 183, 0.08)' },
]

export function CultureTreePanel({
  player,
  onSelectCulture,
  onClose,
}: CultureTreePanelProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredCulture, setHoveredCulture] = useState<CultureId | null>(null)

  // Current research info
  const currentCulture = player.currentCulture ? getCulture(player.currentCulture) : null
  const progress = getCultureProgress(player)
  const turnsRemaining = getTurnsToCompleteCulture(player)

  // Calculate total tree dimensions
  const treeWidth = 1220
  const treeHeight = 650

  // Get the full prerequisite chain for the hovered culture
  const highlightedChain = hoveredCulture ? getPrerequisiteChain(hoveredCulture) : new Set<CultureId>()

  // Hover handlers
  const handleCultureHover = useCallback((cultureId: CultureId | null) => {
    setHoveredCulture(cultureId)
  }, [])

  // Draw prerequisite lines as SVG paths
  const renderPrerequisiteLines = () => {
    const lines: JSX.Element[] = []

    ALL_CULTURES.forEach((culture) => {
      const toPos = CULTURE_POSITIONS[culture.id]
      if (!toPos) return

      // Draw lines from culture prerequisites
      culture.prerequisites.cultures.forEach((prereqId) => {
        const fromPos = CULTURE_POSITIONS[prereqId]
        if (!fromPos) return

        const fromX = fromPos.x + NODE_WIDTH
        const fromY = fromPos.y + NODE_HEIGHT / 2
        const toX = toPos.x
        const toY = toPos.y + NODE_HEIGHT / 2

        // Determine line color based on state
        const isPrereqUnlocked = player.unlockedCultures.includes(prereqId)
        const isCultureUnlocked = player.unlockedCultures.includes(culture.id)
        const isCultureResearching = player.currentCulture === culture.id

        // Check if this line is part of the highlighted path
        const isInHighlightedPath = hoveredCulture && (
          (culture.id === hoveredCulture && highlightedChain.has(prereqId)) ||
          (highlightedChain.has(culture.id) && highlightedChain.has(prereqId))
        )
        const shouldDim = hoveredCulture && !isInHighlightedPath

        let strokeColor = '#444'
        let strokeWidth = 2
        let strokeOpacity = shouldDim ? 0.15 : 0.4

        if (isInHighlightedPath) {
          strokeColor = '#ab47bc'
          strokeOpacity = 1
          strokeWidth = 3
        } else if (isCultureUnlocked) {
          strokeColor = '#9c27b0'
          strokeOpacity = shouldDim ? 0.25 : 0.7
        } else if (isCultureResearching) {
          strokeColor = '#e91e63'
          strokeOpacity = shouldDim ? 0.3 : 0.8
          strokeWidth = 2.5
        } else if (isPrereqUnlocked) {
          strokeColor = '#ab47bc'
          strokeOpacity = shouldDim ? 0.2 : 0.6
        }

        // Calculate control points for bezier curve
        const controlOffset = Math.min(40, Math.abs(toX - fromX) / 3)

        const pathD = `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`

        lines.push(
          <path
            key={`${prereqId}-${culture.id}`}
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
            key={`${prereqId}-${culture.id}-arrow`}
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
          borderBottom: '1px solid #4a3050',
          background: 'linear-gradient(180deg, #2d1a2e 0%, #1a0d1a 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 600 }}>
          Culture Tree
        </h2>

        {/* Current Culture Progress */}
        {currentCulture && progress && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(233, 30, 99, 0.15)',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid rgba(233, 30, 99, 0.3)',
            }}
          >
            <img
              src={`/assets/icons/cultures/${String(currentCulture.id).replace(/_/g, '')}.svg`}
              alt={currentCulture.name}
              style={{ width: '24px', height: '24px' }}
            />
            <div>
              <div style={{ fontSize: '12px', color: '#f48fb1' }}>
                Researching: <strong>{currentCulture.name}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div
                  style={{
                    width: '120px',
                    height: '4px',
                    background: '#2d1a2e',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress.percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #e91e63, #f48fb1)',
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

          {/* Culture Nodes */}
          {ALL_CULTURES.map((culture) => {
            const pos = CULTURE_POSITIONS[culture.id]
            if (!pos) {
              console.warn(`No position defined for culture: ${culture.id}`)
              return null
            }

            // Determine if this node is part of the highlighted path
            const isHovered = hoveredCulture === culture.id
            const isInChain = highlightedChain.has(culture.id)
            const isDimmed = hoveredCulture !== null && !isHovered && !isInChain

            // Show tooltip above for cultures in lower rows (row 5+)
            const tooltipPosition = pos.y >= TOP_OFFSET + ROW_HEIGHT * 5 ? 'above' : 'below'

            return (
              <CultureNode
                key={culture.id}
                culture={culture}
                player={player}
                isResearching={player.currentCulture === culture.id}
                onSelect={onSelectCulture}
                onHover={handleCultureHover}
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
          borderTop: '1px solid #4a3050',
          background: 'linear-gradient(180deg, #1a0d1a 0%, #2d1a2e 100%)',
          fontSize: '11px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: '#9c27b0', borderRadius: '2px' }} />
          <span style={{ color: '#888' }}>Unlocked</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: '#e91e63', borderRadius: '2px' }} />
          <span style={{ color: '#888' }}>In Progress</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: '#ab47bc', borderRadius: '2px' }} />
          <span style={{ color: '#888' }}>Available</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '12px', background: '#555', borderRadius: '2px' }} />
          <span style={{ color: '#888' }}>Locked</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid #4a3050' }}>
          <span style={{
            width: '14px',
            height: '14px',
            background: '#2196f3',
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            fontWeight: 700,
            color: '#fff',
          }}>T</span>
          <span style={{ color: '#888' }}>Requires Tech</span>
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
