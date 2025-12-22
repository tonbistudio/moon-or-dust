// Panel showing diplomatic relationships between tribes

import { useState } from 'react'
import type { Player, DiplomaticStance, TribeId } from '@tribes/game-core'
import { getStance, canDeclareWar, canProposePeace, canProposeAlliance } from '@tribes/game-core'
import { useGame } from '../hooks/useGame'

interface DiplomacyPanelProps {
  currentPlayer: Player
}

// Colors for each diplomatic stance
const STANCE_COLORS: Record<DiplomaticStance, string> = {
  war: '#ef4444',      // Red
  hostile: '#f97316',  // Orange
  neutral: '#9ca3af',  // Gray
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

// Tribe display colors (matching their theme colors)
const TRIBE_COLORS: Record<string, string> = {
  monkes: '#fbbf24',   // Gold
  geckos: '#22c55e',   // Green
  degods: '#ef4444',   // Red
  cets: '#3b82f6',     // Blue
}

export function DiplomacyPanel({ currentPlayer }: DiplomacyPanelProps): JSX.Element {
  const { state, dispatch } = useGame()
  const [isOpen, setIsOpen] = useState(false)

  if (!state) return <></>

  const otherPlayers = state.players.filter(p => p.tribeId !== currentPlayer.tribeId)

  // Get stance with each other player
  const relationships = otherPlayers.map(player => ({
    player,
    stance: getStance(state, currentPlayer.tribeId, player.tribeId),
    canWar: canDeclareWar(state, currentPlayer.tribeId, player.tribeId).canDeclare,
    canPeace: canProposePeace(state, currentPlayer.tribeId, player.tribeId).canPropose,
    canAlly: canProposeAlliance(state, currentPlayer.tribeId, player.tribeId).canPropose,
  }))

  const handleDeclareWar = (targetId: TribeId) => {
    dispatch({ type: 'DECLARE_WAR', target: targetId })
  }

  const handleProposePeace = (targetId: TribeId) => {
    dispatch({ type: 'PROPOSE_PEACE', target: targetId })
  }

  const handleProposeAlliance = (targetId: TribeId) => {
    dispatch({ type: 'PROPOSE_ALLIANCE', target: targetId })
  }

  // Count relationships for button badge
  const atWar = relationships.filter(r => r.stance === 'war').length
  const allied = relationships.filter(r => r.stance === 'allied').length

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
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              background: '#1a1a2e',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '500px',
              maxWidth: '700px',
              border: '2px solid #374151',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h2 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
                Diplomatic Relations
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '24px',
                }}
              >
                x
              </button>
            </div>

            {/* Relationship Graph */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {/* Current player header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: '#2a2a3a',
                borderRadius: '8px',
                border: `2px solid ${TRIBE_COLORS[currentPlayer.tribeName] || '#6b7280'}`,
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: TRIBE_COLORS[currentPlayer.tribeName] || '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textTransform: 'uppercase',
                }}>
                  {currentPlayer.tribeName.slice(0, 2)}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {currentPlayer.tribeName}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '12px' }}>You</div>
                </div>
              </div>

              {/* Relationships list */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {relationships.map(({ player, stance, canWar, canPeace, canAlly }) => (
                  <div
                    key={player.tribeId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#252535',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${STANCE_COLORS[stance]}`,
                    }}
                  >
                    {/* Connection line */}
                    <div style={{
                      width: '40px',
                      height: '4px',
                      background: STANCE_COLORS[stance],
                      borderRadius: '2px',
                      boxShadow: stance === 'allied' ? `0 0 8px ${STANCE_COLORS[stance]}` : 'none',
                    }} />

                    {/* Tribe icon */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: TRIBE_COLORS[player.tribeName] || '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                    }}>
                      {player.tribeName.slice(0, 2)}
                    </div>

                    {/* Tribe name */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: '#fff',
                        fontWeight: 'bold',
                        textTransform: 'capitalize'
                      }}>
                        {player.tribeName}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {canWar && (
                        <button
                          onClick={() => handleDeclareWar(player.tribeId)}
                          style={{
                            padding: '4px 10px',
                            background: '#3a1a1a',
                            border: '1px solid #ef4444',
                            borderRadius: '4px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          Declare War
                        </button>
                      )}
                      {canPeace && (
                        <button
                          onClick={() => handleProposePeace(player.tribeId)}
                          style={{
                            padding: '4px 10px',
                            background: '#1a2a1a',
                            border: '1px solid #22c55e',
                            borderRadius: '4px',
                            color: '#22c55e',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          Propose Peace
                        </button>
                      )}
                      {canAlly && (
                        <button
                          onClick={() => handleProposeAlliance(player.tribeId)}
                          style={{
                            padding: '4px 10px',
                            background: '#2a2a1a',
                            border: '1px solid #fbbf24',
                            borderRadius: '4px',
                            color: '#fbbf24',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                          }}
                        >
                          Propose Alliance
                        </button>
                      )}
                    </div>

                    {/* Stance badge */}
                    <div style={{
                      padding: '4px 12px',
                      background: `${STANCE_COLORS[stance]}22`,
                      border: `1px solid ${STANCE_COLORS[stance]}`,
                      borderRadius: '12px',
                      color: STANCE_COLORS[stance],
                      fontSize: '12px',
                      fontWeight: 'bold',
                      minWidth: '70px',
                      textAlign: 'center',
                    }}>
                      {STANCE_LABELS[stance]}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                paddingTop: '16px',
                borderTop: '1px solid #374151',
              }}>
                {(Object.entries(STANCE_COLORS) as [DiplomaticStance, string][]).map(([stance, color]) => (
                  <div key={stance} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <div style={{
                      width: '20px',
                      height: '4px',
                      background: color,
                      borderRadius: '2px',
                    }} />
                    <span style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'capitalize' }}>
                      {stance}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
