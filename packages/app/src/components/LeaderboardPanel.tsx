// Leaderboard panel showing top Floor Price scores

import { useState, useEffect } from 'react'
import type { SOARService, LeaderboardEntry } from '../magicblock/soar'

interface LeaderboardPanelProps {
  soarService: SOARService
  onClose: () => void
  currentScore?: number
}

export function LeaderboardPanel({ soarService, onClose, currentScore }: LeaderboardPanelProps): JSX.Element {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    soarService.getLeaderboard(10).then((result) => {
      if (!cancelled) {
        setEntries(result)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [soarService])

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
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 900,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '420px',
          maxHeight: '80vh',
          background: '#1a1a2e',
          border: '2px solid #4a4a8a',
          borderRadius: '16px',
          padding: '24px',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
            Leaderboard
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #4a4a8a',
              borderRadius: '6px',
              color: '#888',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
          Top Floor Price scores across all games
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
            Loading...
          </div>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
            No scores yet. Play a game to submit your first score!
          </div>
        )}

        {/* Entries */}
        {!loading && entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {entries.map((entry) => (
              <div
                key={`${entry.rank}-${entry.playerFull}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: entry.rank <= 3 ? '#2a2a4a' : '#0d0d18',
                  borderRadius: '8px',
                  border: entry.rank === 1 ? '1px solid #ffd700' : '1px solid transparent',
                }}
              >
                {/* Rank */}
                <div
                  style={{
                    width: '32px',
                    fontWeight: 700,
                    fontSize: '16px',
                    color: entry.rank === 1 ? '#ffd700' : entry.rank === 2 ? '#c0c0c0' : entry.rank === 3 ? '#cd7f32' : '#555',
                  }}
                >
                  #{entry.rank}
                </div>

                {/* Player */}
                <div style={{ flex: 1, color: '#ccc', fontSize: '14px' }}>
                  {entry.player}
                </div>

                {/* Score */}
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '16px',
                    color: entry.rank === 1 ? '#ffd700' : '#fff',
                  }}
                >
                  {entry.score.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Current score */}
        {currentScore !== undefined && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#2a2a4a',
              borderRadius: '8px',
              border: '1px solid #6366f1',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}>Your Current Score</div>
            <div style={{ color: '#6366f1', fontSize: '24px', fontWeight: 700 }}>
              {currentScore.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
