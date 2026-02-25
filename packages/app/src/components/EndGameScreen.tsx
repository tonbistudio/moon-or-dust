// End game screen showing final Floor Price rankings

import { useState } from 'react'
import type { GameState, TribeId, TribeName } from '@tribes/game-core'
import { calculatePolicyFloorPriceBonus } from '@tribes/game-core'
import type { SOARService } from '../magicblock/soar'
import { LeaderboardPanel } from './LeaderboardPanel'

interface EndGameScreenProps {
  state: GameState
  onPlayAgain: () => void
  soarService: SOARService
}

// Tribe display info
const TRIBE_INFO: Record<TribeName, { name: string; color: string; icon: string }> = {
  monkes: { name: 'Monkes', color: '#fbbf24', icon: '🐵' },
  geckos: { name: 'Geckos', color: '#22c55e', icon: '🦎' },
  degods: { name: 'DeGods', color: '#a855f7', icon: '💀' },
  cets: { name: 'Cets', color: '#ec4899', icon: '🐱' },
  dragonz: { name: 'Dragonz', color: '#ef4444', icon: '🐉' },
  gregs: { name: 'Gregs', color: '#3b82f6', icon: '👔' },
}

// Floor price breakdown by category
interface FloorPriceBreakdown {
  settlements: number
  territory: number
  technology: number
  culture: number
  treasury: number
  military: number
  kills: number
  wonders: number
  policies: number
}

// Calculate floor price breakdown for a tribe
function calculateFloorPriceBreakdown(state: GameState, tribeId: TribeId): FloorPriceBreakdown {
  const breakdown: FloorPriceBreakdown = {
    settlements: 0,
    territory: 0,
    technology: 0,
    culture: 0,
    treasury: 0,
    military: 0,
    kills: 0,
    wonders: 0,
    policies: 0,
  }

  // Track totals for policy bonuses
  let totalPopulation = 0

  // Settlements: 10 pts each + 5 pts per level
  for (const settlement of state.settlements.values()) {
    if (settlement.owner === tribeId) {
      breakdown.settlements += 10 + settlement.level * 5
      totalPopulation += settlement.level
    }
  }

  // Controlled tiles: 1 pt each
  for (const tile of state.map.tiles.values()) {
    if (tile.owner === tribeId) {
      breakdown.territory += 1
    }
  }

  // Find player
  const player = state.players.find((p) => p.tribeId === tribeId)
  if (player) {
    // Technologies: 5 pts each
    breakdown.technology = player.researchedTechs.length * 5

    // Cultures: 5 pts each
    breakdown.culture = player.unlockedCultures.length * 5

    // Gold: 1 pt per 10 gold
    breakdown.treasury = Math.floor(player.treasury / 10)

    // Kill count: 3 pts each
    breakdown.kills = player.killCount * 3

    // Policy bonuses for population and tiles (pop_floor_price, tile_floor_price)
    breakdown.policies = calculatePolicyFloorPriceBonus(player, totalPopulation, breakdown.territory)
  }

  // Units: 2 pts each + rarity bonus
  for (const unit of state.units.values()) {
    if (unit.owner === tribeId) {
      let unitScore = 2

      // Rarity bonuses
      switch (unit.rarity) {
        case 'rare':
          unitScore += 2
          break
        case 'epic':
          unitScore += 5
          break
        case 'legendary':
          unitScore += 10
          break
      }

      breakdown.military += unitScore
    }
  }

  // Wonders
  for (const wonder of state.wonders) {
    if (wonder.builtBy === tribeId) {
      breakdown.wonders += wonder.floorPriceBonus
    }
  }

  return breakdown
}

// Calculate total from breakdown
function getTotal(breakdown: FloorPriceBreakdown): number {
  return Object.values(breakdown).reduce((sum, val) => sum + val, 0)
}

// Category display info
const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
  settlements: { label: 'Settlements', icon: '🏰', color: '#22c55e' },
  territory: { label: 'Territory', icon: '🗺️', color: '#3b82f6' },
  technology: { label: 'Technology', icon: '🔬', color: '#60a5fa' },
  culture: { label: 'Culture', icon: '🎭', color: '#ec4899' },
  treasury: { label: 'Treasury', icon: '💰', color: '#fbbf24' },
  military: { label: 'Military', icon: '⚔️', color: '#ef4444' },
  kills: { label: 'Kills', icon: '💀', color: '#f97316' },
  wonders: { label: 'Wonders', icon: '🏛️', color: '#a855f7' },
  policies: { label: 'Policies', icon: '📜', color: '#14b8a6' },
}

export function EndGameScreen({ state, onPlayAgain, soarService }: EndGameScreenProps): JSX.Element {
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  // Calculate rankings
  const rankings = state.players
    .map((player) => {
      const breakdown = calculateFloorPriceBreakdown(state, player.tribeId)
      const total = getTotal(breakdown)
      return {
        tribeId: player.tribeId,
        tribeName: player.tribeName,
        isHuman: player.isHuman,
        total,
        breakdown,
      }
    })
    .sort((a, b) => b.total - a.total)

  const winner = rankings[0]
  const humanPlayer = rankings.find((r) => r.isHuman)
  const humanRank = rankings.findIndex((r) => r.isHuman) + 1
  const isHumanWinner = winner?.isHuman ?? false

  const tribeInfo = winner ? TRIBE_INFO[winner.tribeName] : null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.95)',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: '#0d0d1a',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'auto',
          color: '#fff',
          boxShadow: isHumanWinner
            ? '0 8px 40px rgba(251, 191, 36, 0.4)'
            : '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: isHumanWinner ? '2px solid #fbbf24' : '1px solid #333',
          animation: 'endGamePopIn 0.6s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '32px 24px 24px',
            background: isHumanWinner
              ? 'linear-gradient(180deg, rgba(251, 191, 36, 0.2) 0%, #0d0d1a 100%)'
              : 'linear-gradient(180deg, rgba(100, 100, 100, 0.2) 0%, #0d0d1a 100%)',
            borderBottom: '1px solid #333',
            textAlign: 'center',
          }}
        >
          {/* Turn count */}
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            Game Over - Turn {state.turn} / {state.maxTurns}
          </div>

          {/* Trophy icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              background: isHumanWinner
                ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)'
                : 'linear-gradient(135deg, #6b7280 0%, #4b5563 50%, #6b7280 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isHumanWinner
                ? '0 0 40px rgba(251, 191, 36, 0.5)'
                : '0 0 20px rgba(100, 100, 100, 0.3)',
              animation: isHumanWinner ? 'trophyPulse 2s ease-in-out infinite' : 'none',
            }}
          >
            <span style={{ fontSize: '40px' }}>{isHumanWinner ? '🏆' : '🎮'}</span>
          </div>

          {/* Winner announcement */}
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: isHumanWinner ? '#fbbf24' : '#9ca3af',
              marginBottom: '8px',
            }}
          >
            {isHumanWinner ? 'VICTORY!' : 'DEFEAT'}
          </div>

          {tribeInfo && (
            <div
              style={{
                fontSize: '18px',
                color: tribeInfo.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{tribeInfo.icon}</span>
              <span>{tribeInfo.name}</span>
              <span>wins with</span>
              <span style={{ fontWeight: 700 }}>{winner?.total ?? 0} Floor Price</span>
            </div>
          )}

          {!isHumanWinner && humanPlayer && (
            <div
              style={{
                fontSize: '14px',
                color: '#888',
                marginTop: '8px',
              }}
            >
              You placed #{humanRank} with {humanPlayer.total} Floor Price
            </div>
          )}
        </div>

        {/* Rankings */}
        <div style={{ padding: '24px' }}>
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '16px',
            }}
          >
            Final Rankings
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rankings.map((entry, index) => {
              const info = TRIBE_INFO[entry.tribeName]
              const isFirst = index === 0
              const isPlayer = entry.isHuman

              return (
                <div
                  key={entry.tribeId}
                  style={{
                    padding: '16px',
                    background: isPlayer
                      ? 'rgba(59, 130, 246, 0.1)'
                      : isFirst
                        ? 'rgba(251, 191, 36, 0.05)'
                        : 'rgba(255, 255, 255, 0.02)',
                    border: isPlayer
                      ? '1px solid rgba(59, 130, 246, 0.3)'
                      : isFirst
                        ? '1px solid rgba(251, 191, 36, 0.2)'
                        : '1px solid #222',
                    borderRadius: '8px',
                  }}
                >
                  {/* Rank and tribe name */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    {/* Rank badge */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background:
                          index === 0
                            ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                            : index === 1
                              ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                              : index === 2
                                ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
                                : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: '#fff',
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Tribe info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <span style={{ fontSize: '20px' }}>{info?.icon ?? '❓'}</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: info?.color ?? '#fff',
                        }}
                      >
                        {info?.name ?? entry.tribeName}
                      </span>
                      {isPlayer && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#3b82f6',
                            background: 'rgba(59, 130, 246, 0.2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Total score */}
                    <div
                      style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: isFirst ? '#fbbf24' : '#fff',
                      }}
                    >
                      {entry.total}
                    </div>
                  </div>

                  {/* Score breakdown */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    {Object.entries(entry.breakdown).map(([key, value]) => {
                      if (value === 0) return null
                      const catInfo = CATEGORY_INFO[key]
                      return (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          <span>{catInfo?.icon ?? '•'}</span>
                          <span style={{ color: '#888' }}>{catInfo?.label ?? key}:</span>
                          <span style={{ color: catInfo?.color ?? '#fff', fontWeight: 600 }}>
                            +{value}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            padding: '16px 24px 24px',
            borderTop: '1px solid #222',
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Submit Score button */}
          {humanPlayer && !scoreSubmitted && (
            <button
              onClick={async () => {
                setSubmitting(true)
                await soarService.submitScore(humanPlayer.total)
                setScoreSubmitted(true)
                setSubmitting(false)
              }}
              disabled={submitting}
              style={{
                padding: '14px 32px',
                background: submitting
                  ? '#555'
                  : 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)',
                border: 'none',
                borderRadius: '8px',
                color: submitting ? '#999' : '#000',
                fontSize: '14px',
                fontWeight: 600,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Score'}
            </button>
          )}

          {/* Score submitted confirmation */}
          {scoreSubmitted && (
            <div
              style={{
                padding: '14px 32px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '8px',
                color: '#22c55e',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Score Submitted!
            </div>
          )}

          {/* Leaderboard button */}
          <button
            onClick={() => setShowLeaderboard(true)}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(180deg, #2a2a4a 0%, #1a1a3a 100%)',
              border: '1px solid #4a4a8a',
              borderRadius: '8px',
              color: '#ccc',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Leaderboard
          </button>

          {/* Play Again button */}
          <button
            onClick={onPlayAgain}
            style={{
              padding: '14px 48px',
              background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Play Again
          </button>
        </div>
      </div>

      {/* Leaderboard overlay */}
      {showLeaderboard && (
        <LeaderboardPanel
          soarService={soarService}
          onClose={() => setShowLeaderboard(false)}
          {...(humanPlayer ? { currentScore: humanPlayer.total } : {})}
        />
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes endGamePopIn {
          0% {
            transform: scale(0.8) translateY(40px);
            opacity: 0;
          }
          50% {
            transform: scale(1.02) translateY(-10px);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes trophyPulse {
          0%, 100% {
            box-shadow: 0 0 40px rgba(251, 191, 36, 0.5);
          }
          50% {
            box-shadow: 0 0 60px rgba(251, 191, 36, 0.8);
          }
        }
      `}</style>
    </div>
  )
}
