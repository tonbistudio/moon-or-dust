// Panel showing diplomatic relationships between tribes with node-based visualization

import { useState } from 'react'
import type { Player, DiplomaticStance, TribeId } from '@tribes/game-core'
import { getStance, canDeclareWar, canProposePeace, canProposeAlliance } from '@tribes/game-core'
import { useGame } from '../hooks/useGame'
import { Tooltip } from './Tooltip'

interface DiplomacyPanelProps {
  currentPlayer: Player
}

// Colors for each diplomatic stance
const STANCE_COLORS: Record<DiplomaticStance, string> = {
  war: '#ef4444',      // Red
  hostile: '#f97316',  // Orange
  neutral: '#6b7280',  // Gray
  friendly: '#22c55e', // Green
  allied: '#fbbf24',   // Gold
}

const STANCE_LABELS: Record<DiplomaticStance, string> = {
  war: 'War',
  hostile: 'Hostile',
  neutral: 'Neutral',
  friendly: 'Friendly',
  allied: 'Allied',
}

// Descriptions for each stance
const STANCE_DESCRIPTIONS: Record<DiplomaticStance, string> = {
  war: 'Open conflict. Units can attack freely. Declaring war on allies damages reputation.',
  hostile: 'Tense relations. Cannot enter territory. Can improve with time and no conflict.',
  neutral: 'Default relations. Open borders with cost. Can form friendships through diplomacy.',
  friendly: 'Positive relations. Free open borders. Can propose alliance.',
  allied: 'Full partnership. Shared capital vision. +10% yields when trading.',
}

// Tribe display colors (matching their theme colors)
const TRIBE_COLORS: Record<string, string> = {
  monkes: '#fbbf24',   // Gold
  geckos: '#22c55e',   // Green
  degods: '#ef4444',   // Red
  cets: '#3b82f6',     // Blue
}

// Node positions for 4 tribes (percentage based, centered layout)
// Positions: top, right, bottom, left
const NODE_POSITIONS = [
  { x: 50, y: 12 },   // top
  { x: 88, y: 50 },   // right
  { x: 50, y: 88 },   // bottom
  { x: 12, y: 50 },   // left
]

export function DiplomacyPanel({ currentPlayer }: DiplomacyPanelProps): JSX.Element {
  const { state, dispatch } = useGame()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTribe, setSelectedTribe] = useState<TribeId | null>(null)

  if (!state) return <></>

  // Get all players and assign positions
  const allPlayers = state.players
  const currentPlayerIndex = allPlayers.findIndex(p => p.tribeId === currentPlayer.tribeId)

  // Reorder so current player is always at bottom
  const orderedPlayers = [
    ...allPlayers.slice(currentPlayerIndex),
    ...allPlayers.slice(0, currentPlayerIndex),
  ]
  // Rotate positions so current player is at bottom (index 2)
  const positionOffset = 2

  // Get relationships between all pairs
  const relationships: { from: number; to: number; stance: DiplomaticStance }[] = []
  for (let i = 0; i < orderedPlayers.length; i++) {
    for (let j = i + 1; j < orderedPlayers.length; j++) {
      const stance = getStance(state, orderedPlayers[i]!.tribeId, orderedPlayers[j]!.tribeId)
      relationships.push({ from: i, to: j, stance })
    }
  }

  const handleDeclareWar = (targetId: TribeId) => {
    dispatch({ type: 'DECLARE_WAR', target: targetId })
    setSelectedTribe(null)
  }

  const handleProposePeace = (targetId: TribeId) => {
    dispatch({ type: 'PROPOSE_PEACE', target: targetId })
    setSelectedTribe(null)
  }

  const handleProposeAlliance = (targetId: TribeId) => {
    dispatch({ type: 'PROPOSE_ALLIANCE', target: targetId })
    setSelectedTribe(null)
  }

  // Count relationships for button badge (exclude eliminated tribes)
  const atWar = state.players.filter(p =>
    p.tribeId !== currentPlayer.tribeId &&
    p.eliminatedOnTurn === undefined &&
    getStance(state, currentPlayer.tribeId, p.tribeId) === 'war'
  ).length
  const allied = state.players.filter(p =>
    p.tribeId !== currentPlayer.tribeId &&
    p.eliminatedOnTurn === undefined &&
    getStance(state, currentPlayer.tribeId, p.tribeId) === 'allied'
  ).length

  // Get selected tribe info (clear selection if tribe is eliminated)
  const selectedPlayer = selectedTribe
    ? orderedPlayers.find(p => p.tribeId === selectedTribe && p.eliminatedOnTurn === undefined)
    : null
  const selectedStance = selectedTribe && selectedPlayer
    ? getStance(state, currentPlayer.tribeId, selectedTribe)
    : null
  const canWar = selectedTribe && selectedPlayer ? canDeclareWar(state, currentPlayer.tribeId, selectedTribe).canDeclare : false
  const canPeace = selectedTribe && selectedPlayer ? canProposePeace(state, currentPlayer.tribeId, selectedTribe).canPropose : false
  const canAlly = selectedTribe && selectedPlayer ? canProposeAlliance(state, currentPlayer.tribeId, selectedTribe).canPropose : false

  return (
    <>
      {/* Diplomacy Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          background: atWar > 0 ? '#3a1a1a' : '#2a2a3a',
          border: `1px solid ${atWar > 0 ? '#ef4444' : allied > 0 ? '#fbbf24' : '#6b7280'}`,
          borderRadius: '4px',
          color: atWar > 0 ? '#ef4444' : allied > 0 ? '#fbbf24' : '#9ca3af',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        <span>Diplomacy</span>
        {atWar > 0 && (
          <span style={{
            background: '#ef4444',
            color: '#fff',
            padding: '1px 6px',
            borderRadius: '10px',
            fontSize: '11px'
          }}>
            {atWar} War
          </span>
        )}
      </button>

      {/* Diplomacy Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setIsOpen(false)
            setSelectedTribe(null)
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '600px',
              background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
              borderRadius: '16px',
              border: '2px solid #333',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid #333',
                background: 'rgba(0, 0, 0, 0.3)',
              }}
            >
              <div>
                <h2 style={{
                  margin: 0,
                  color: '#fff',
                  fontSize: '20px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '24px' }}>🤝</span>
                  Diplomatic Relations
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#888' }}>
                  Click a tribe to view actions
                </p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setSelectedTribe(null)
                }}
                style={{
                  width: '36px',
                  height: '36px',
                  background: 'transparent',
                  border: '1px solid #444',
                  borderRadius: '50%',
                  color: '#888',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Main Content - Node Visualization */}
            <div style={{ padding: '24px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '320px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  border: '1px solid #222',
                }}
              >
                {/* SVG for connection lines */}
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
                  {relationships.map(({ from, to, stance }, idx) => {
                    const fromPlayer = orderedPlayers[from]!
                    const toPlayer = orderedPlayers[to]!
                    // Hide lines to/from eliminated tribes
                    if (fromPlayer.eliminatedOnTurn !== undefined || toPlayer.eliminatedOnTurn !== undefined) {
                      return null
                    }
                    const fromPos = NODE_POSITIONS[(from + positionOffset) % 4]!
                    const toPos = NODE_POSITIONS[(to + positionOffset) % 4]!
                    const color = STANCE_COLORS[stance]
                    const isSelected = selectedTribe && (
                      fromPlayer.tribeId === selectedTribe ||
                      toPlayer.tribeId === selectedTribe
                    )

                    return (
                      <line
                        key={idx}
                        x1={`${fromPos.x}%`}
                        y1={`${fromPos.y}%`}
                        x2={`${toPos.x}%`}
                        y2={`${toPos.y}%`}
                        stroke={color}
                        strokeWidth={isSelected ? 3 : 2}
                        strokeOpacity={isSelected ? 1 : 0.5}
                        strokeDasharray={stance === 'war' ? '8,4' : stance === 'hostile' ? '4,4' : 'none'}
                      />
                    )
                  })}
                </svg>

                {/* Tribe Nodes */}
                {orderedPlayers.map((player, idx) => {
                  const pos = NODE_POSITIONS[(idx + positionOffset) % 4]!
                  const isCurrentPlayer = player.tribeId === currentPlayer.tribeId
                  const isSelected = player.tribeId === selectedTribe
                  const isEliminated = player.eliminatedOnTurn !== undefined
                  const tribeColor = isEliminated ? '#444' : (TRIBE_COLORS[player.tribeName] || '#6b7280')

                  // Get stance with current player (for non-current players)
                  const stanceWithPlayer = !isCurrentPlayer && !isEliminated
                    ? getStance(state, currentPlayer.tribeId, player.tribeId)
                    : null

                  return (
                    <div
                      key={player.tribeId}
                      onClick={() => {
                        if (!isCurrentPlayer && !isEliminated) {
                          setSelectedTribe(isSelected ? null : player.tribeId)
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: 'translate(-50%, -50%)',
                        cursor: isCurrentPlayer || isEliminated ? 'default' : 'pointer',
                        zIndex: isSelected ? 10 : 1,
                        opacity: isEliminated ? 0.4 : 1,
                      }}
                    >
                      {/* Node rectangle */}
                      <div
                        style={{
                          padding: isCurrentPlayer ? '10px 20px' : '8px 16px',
                          borderRadius: '8px',
                          background: isEliminated
                            ? '#222'
                            : `linear-gradient(135deg, ${tribeColor} 0%, ${tribeColor}cc 100%)`,
                          border: isSelected
                            ? '2px solid #fff'
                            : isCurrentPlayer
                              ? `2px solid ${tribeColor}`
                              : `2px solid ${tribeColor}88`,
                          boxShadow: isSelected
                            ? `0 0 20px ${tribeColor}88, 0 0 8px rgba(255,255,255,0.3)`
                            : isCurrentPlayer
                              ? `0 0 12px ${tribeColor}44`
                              : 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{
                          color: isEliminated ? '#666' : '#000',
                          fontWeight: 600,
                          fontSize: isCurrentPlayer ? '14px' : '13px',
                          textTransform: 'capitalize',
                          textDecoration: isEliminated ? 'line-through' : 'none',
                        }}>
                          {player.tribeName}
                        </div>
                        {isEliminated ? (
                          <div style={{ color: '#555', fontSize: '10px', fontStyle: 'italic' }}>Destroyed</div>
                        ) : isCurrentPlayer ? (
                          <div style={{ color: 'rgba(0,0,0,0.5)', fontSize: '10px' }}>You</div>
                        ) : stanceWithPlayer && (
                          <div style={{
                            color: stanceWithPlayer === 'war' || stanceWithPlayer === 'hostile'
                              ? '#000'
                              : 'rgba(0,0,0,0.7)',
                            fontSize: '10px',
                            fontWeight: 600,
                            background: 'rgba(255,255,255,0.3)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            marginTop: '2px',
                          }}>
                            {STANCE_LABELS[stanceWithPlayer]}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Center label */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: '#444',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                  }}
                >
                  Relations
                </div>
              </div>

              {/* Action Panel - shows when a tribe is selected */}
              {selectedPlayer && selectedStance && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: `1px solid ${TRIBE_COLORS[selectedPlayer.tribeName] || '#333'}44`,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: `${TRIBE_COLORS[selectedPlayer.tribeName] || '#6b7280'}22`,
                          border: `1px solid ${TRIBE_COLORS[selectedPlayer.tribeName] || '#6b7280'}`,
                          color: TRIBE_COLORS[selectedPlayer.tribeName] || '#6b7280',
                          fontWeight: 600,
                          fontSize: '13px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {selectedPlayer.tribeName}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>
                        Status: <span style={{ color: STANCE_COLORS[selectedStance], fontWeight: 600 }}>{STANCE_LABELS[selectedStance]}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {canWar && (
                        <button
                          onClick={() => handleDeclareWar(selectedTribe!)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.5)',
                            borderRadius: '4px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Declare War
                        </button>
                      )}
                      {canPeace && (
                        <button
                          onClick={() => handleProposePeace(selectedTribe!)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.5)',
                            borderRadius: '4px',
                            color: '#22c55e',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Propose Peace
                        </button>
                      )}
                      {canAlly && (
                        <button
                          onClick={() => handleProposeAlliance(selectedTribe!)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(251, 191, 36, 0.15)',
                            border: '1px solid rgba(251, 191, 36, 0.5)',
                            borderRadius: '4px',
                            color: '#fbbf24',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Propose Alliance
                        </button>
                      )}
                      {!canWar && !canPeace && !canAlly && (
                        <span style={{ color: '#555', fontSize: '11px', fontStyle: 'italic' }}>
                          No actions available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Legend */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
                padding: '12px 24px',
                borderTop: '1px solid #333',
                background: 'rgba(0, 0, 0, 0.3)',
                fontSize: '10px',
                flexWrap: 'wrap',
              }}
            >
              {(Object.entries(STANCE_COLORS) as [DiplomaticStance, string][]).map(([stance, color]) => (
                <Tooltip
                  key={stance}
                  content={
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '4px', color, textTransform: 'capitalize' }}>
                        {stance}
                      </div>
                      <div style={{ fontSize: '11px', color: '#aaa' }}>
                        {STANCE_DESCRIPTIONS[stance]}
                      </div>
                    </div>
                  }
                  position="above"
                  maxWidth={220}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'help' }}>
                    <span style={{
                      width: '16px',
                      height: '3px',
                      background: color,
                      borderRadius: '1px',
                      opacity: stance === 'neutral' ? 0.5 : 1,
                    }} />
                    <span style={{ color: '#666', textTransform: 'capitalize' }}>{stance}</span>
                  </span>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
