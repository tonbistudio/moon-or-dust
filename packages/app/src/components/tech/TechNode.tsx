// Civ 4 style tech node component

import { useState } from 'react'
import type { Tech, TechId, Player, CultureId } from '@tribes/game-core'
import { getTech, canResearchTech, ALL_WONDERS, getCulture } from '@tribes/game-core'

interface TechNodeProps {
  tech: Tech
  player: Player
  isResearching: boolean
  onSelect: (techId: TechId) => void
  onHover?: (techId: TechId | null) => void
  isHighlighted?: boolean
  isDimmed?: boolean
  style?: React.CSSProperties
}

// Get icon path for a tech
function getTechIcon(techId: TechId): string {
  return `/assets/icons/techs/${techId}.svg`
}

// Unlock type with color info
interface UnlockItem {
  name: string
  color: string
}

// Get colored unlock items from tech
function getUnlockItems(tech: Tech): UnlockItem[] {
  const unlocks: UnlockItem[] = []

  if (tech.unlocks.units && tech.unlocks.units.length > 0) {
    tech.unlocks.units.forEach(u => {
      const name = u.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      unlocks.push({ name, color: '#ef5350' }) // Red for units
    })
  }

  if (tech.unlocks.buildings && tech.unlocks.buildings.length > 0) {
    tech.unlocks.buildings.forEach(b => {
      const name = String(b).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      unlocks.push({ name, color: '#8b4513' }) // Chocolate brown for buildings
    })
  }

  if (tech.unlocks.improvements && tech.unlocks.improvements.length > 0) {
    tech.unlocks.improvements.forEach(i => {
      const name = i.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      unlocks.push({ name, color: '#ff9800' }) // Orange for improvements
    })
  }

  if (tech.unlocks.resources && tech.unlocks.resources.length > 0) {
    tech.unlocks.resources.forEach(r => {
      unlocks.push({ name: r.charAt(0).toUpperCase() + r.slice(1), color: '#66bb6a' }) // Green for resources
    })
  }

  // Find wonders that have this tech as a prerequisite
  const wondersUnlocked = ALL_WONDERS.filter(w => w.techPrereq === tech.id)
  if (wondersUnlocked.length > 0) {
    wondersUnlocked.forEach(w => {
      unlocks.push({ name: w.name, color: '#ffd700' }) // Radiant gold for wonders
    })
  }

  return unlocks
}

export function TechNode({
  tech,
  player,
  isResearching,
  onSelect,
  onHover,
  isHighlighted,
  isDimmed,
  style,
}: TechNodeProps): JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false)
  const isResearched = player.researchedTechs.includes(tech.id)
  const { canResearch, reason } = canResearchTech(player, tech.id)
  const unlockItems = getUnlockItems(tech)

  // State-based colors (Civ 4 style)
  const getBorderColor = () => {
    if (isResearched) return '#c9a227' // Gold
    if (isResearching) return '#e67e22' // Orange
    if (canResearch) return '#27ae60' // Green
    return '#555' // Gray locked
  }

  const getBackgroundGradient = () => {
    if (isResearched) {
      return 'linear-gradient(180deg, #3d3520 0%, #2a2515 100%)'
    }
    if (isResearching) {
      return 'linear-gradient(180deg, #3d2a15 0%, #2a1d0f 100%)'
    }
    if (canResearch) {
      return 'linear-gradient(180deg, #1a3320 0%, #0f2015 100%)'
    }
    return 'linear-gradient(180deg, #252525 0%, #1a1a1a 100%)'
  }

  const getNameColor = () => {
    if (isResearched) return '#fff'
    if (isResearching) return '#fff'
    if (canResearch) return '#fff'
    return '#888'
  }

  // Compute highlight/dim effects
  const getBoxShadow = () => {
    if (isHighlighted) {
      return '0 0 12px rgba(100, 181, 246, 0.7), 0 0 4px rgba(100, 181, 246, 0.5)'
    }
    if (isResearching) {
      return '0 0 8px rgba(230, 126, 34, 0.5)'
    }
    if (isResearched) {
      return '0 0 6px rgba(201, 162, 39, 0.3)'
    }
    return '0 2px 4px rgba(0,0,0,0.3)'
  }

  // Get prerequisite tech names for tooltip
  const techPrereqNames = tech.prerequisites.techs
    .map((id) => getTech(id)?.name || id)

  return (
    <div style={{ position: 'absolute', ...style }}>
      <button
        onClick={() => onSelect(tech.id)}
        disabled={isResearched}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 10px',
          background: getBackgroundGradient(),
          border: isHighlighted ? '2px solid #64b5f6' : `2px solid ${getBorderColor()}`,
          borderRadius: '4px',
          cursor: isResearched ? 'default' : canResearch || isResearching ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s ease',
          boxShadow: getBoxShadow(),
          minWidth: '140px',
          height: unlockItems.length > 0 ? '52px' : '44px',
          opacity: isDimmed ? 0.35 : 1,
        }}
        onMouseEnter={(e) => {
          setShowTooltip(true)
          onHover?.(tech.id)
          if (!isResearched && (canResearch || isResearching)) {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.zIndex = '100'
          }
        }}
        onMouseLeave={(e) => {
          setShowTooltip(false)
          onHover?.(null)
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.zIndex = '1'
        }}
      >
      {/* Tech Icon */}
      <div
        style={{
          width: '32px',
          height: '32px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '4px',
          padding: '3px',
        }}
      >
        <img
          src={getTechIcon(tech.id)}
          alt={tech.name}
          style={{
            width: '26px',
            height: '26px',
            objectFit: 'contain',
            opacity: isResearched || canResearch || isResearching ? 1 : 0.4,
            filter: isResearched
              ? 'sepia(1) saturate(2) hue-rotate(10deg) brightness(1.2)'
              : isResearching
                ? 'sepia(0.5) saturate(1.5) hue-rotate(350deg)'
                : canResearch
                  ? 'none'
                  : 'grayscale(0.8)',
          }}
        />
      </div>

      {/* Tech Info */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', overflow: 'hidden', flex: 1 }}>
        {/* Tech Name - Prominent */}
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: getNameColor(),
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '90px',
            lineHeight: 1.2,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {tech.name}
        </div>

        {/* Cost */}
        <div
          style={{
            fontSize: '10px',
            color: isResearched ? '#c9a227' : '#64b5f6',
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {isResearched ? '✓ Researched' : `${tech.cost} Alpha`}
        </div>

        {/* Unlocks */}
        {unlockItems.length > 0 && (
          <div
            style={{
              fontSize: '9px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              maxWidth: '90px',
              display: 'flex',
              gap: '3px',
              alignItems: 'center',
            }}
          >
            {unlockItems[0] && (
              <span style={{ color: unlockItems[0].color, fontWeight: 500 }}>
                +{unlockItems[0].name}
              </span>
            )}
            {unlockItems.length > 1 && (
              <span style={{ color: '#888', fontSize: '8px' }}>+{unlockItems.length - 1}</span>
            )}
          </div>
        )}
      </div>

      {/* Researching indicator */}
      {isResearching && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '12px',
            height: '12px',
            background: '#e67e22',
            borderRadius: '50%',
            border: '2px solid #fff',
            animation: 'pulse 1.5s infinite',
          }}
        />
      )}

      {/* Culture prerequisite indicator */}
      {tech.prerequisites.cultures.length > 0 && !isResearching && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
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
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        >
          C
        </div>
      )}
      </button>

      {/* Custom Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
            border: '1px solid #444',
            borderRadius: '6px',
            padding: '10px 12px',
            minWidth: '180px',
            maxWidth: '250px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {/* Tech Name */}
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <img
              src={`/assets/icons/techs/${tech.id}.svg`}
              alt=""
              style={{ width: '20px', height: '20px' }}
            />
            {tech.name}
          </div>

          {/* Era & Cost */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#aaa',
            marginBottom: '8px',
            paddingBottom: '6px',
            borderBottom: '1px solid #333',
          }}>
            <span>Era {tech.era}</span>
            <span style={{ color: isResearched ? '#c9a227' : '#64b5f6', fontWeight: 600 }}>
              {isResearched ? '✓ Researched' : `${tech.cost} Alpha`}
            </span>
          </div>

          {/* Prerequisites */}
          {(techPrereqNames.length > 0 || tech.prerequisites.cultures.length > 0) && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '3px' }}>
                Prerequisites
              </div>
              {techPrereqNames.length > 0 && (
                <div style={{ fontSize: '11px', color: '#64b5f6', marginBottom: '2px' }}>
                  {techPrereqNames.join(', ')}
                </div>
              )}
              {tech.prerequisites.cultures.length > 0 && (
                <div style={{ fontSize: '11px', color: '#ce93d8' }}>
                  {tech.prerequisites.cultures.map((id: CultureId) => getCulture(id)?.name || id).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Unlocks */}
          {unlockItems.length > 0 && (
            <div>
              <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '3px' }}>
                Unlocks
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {unlockItems.map((item, i) => (
                  <div key={i} style={{ fontSize: '11px', color: item.color, fontWeight: 500 }}>
                    + {item.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reason why can't research */}
          {reason && !isResearched && (
            <div style={{
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px solid #333',
              fontSize: '10px',
              color: '#ef5350',
              fontStyle: 'italic',
            }}>
              {reason}
            </div>
          )}

          {/* Tooltip arrow */}
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '6px solid #444',
          }} />
        </div>
      )}
    </div>
  )
}
