// Main menu with tribe selection

import { useState } from 'react'
import type { TribeName } from '@tribes/game-core'
import { TRIBE_DEFINITIONS, PLAYABLE_TRIBES } from '@tribes/game-core'
import { WalletButton } from '../wallet/WalletButton'
import { LeaderboardPanel } from './LeaderboardPanel'
import type { SOARService } from '../magicblock/soar'

interface TribeCardProps {
  tribe: typeof TRIBE_DEFINITIONS[TribeName]
  available: boolean
  onSelect: () => void
}

// Format bonus key to readable text
function formatBonusKey(key: string): string {
  const formatted = key
    .replace(/Percent$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
  return formatted
}

// Format bonus value
function formatBonusValue(value: number): string {
  if (value < 1) {
    return `+${Math.round(value * 100)}%`
  }
  return `+${value}`
}

// Format unit/building ID to display name
function formatId(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function TribeCard({ tribe, available, onSelect }: TribeCardProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false)

  const bonusEntries = Object.entries(tribe.bonuses).filter(
    ([, value]) => value !== undefined && value !== 0
  )

  const playableTribeNames = PLAYABLE_TRIBES.map(t => t.name)
  const hasSprite = playableTribeNames.includes(tribe.name)

  return (
    <div
      onClick={available ? onSelect : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px',
        background: available ? '#2a2a4a' : '#1a1a2a',
        border: '3px solid',
        borderColor: isHovered && available ? tribe.color : (available ? '#4a4a8a' : '#333'),
        borderRadius: '12px',
        cursor: available ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s ease',
        transform: isHovered && available ? 'scale(1.03)' : 'scale(1)',
        boxShadow: isHovered && available
          ? `0 0 20px ${tribe.color}40, 0 4px 12px rgba(0,0,0,0.3)`
          : '0 2px 8px rgba(0,0,0,0.2)',
        opacity: available ? 1 : 0.6,
        position: 'relative',
        minHeight: '210px',
      }}
    >
      {/* Portrait */}
      <div
        style={{
          width: '100px',
          height: '100px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          border: `3px solid ${tribe.color}80`,
          overflow: 'hidden',
          background: '#1a1a2e',
        }}
      >
        {hasSprite ? (
          <img
            src={`/assets/menu/${tribe.name}.png`}
            alt={tribe.displayName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              fontSize: '48px',
              color: '#444',
            }}
          >
            ?
          </div>
        )}
      </div>

      {/* Name with color bar */}
      <div
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: '4px',
        }}
      >
        {tribe.displayName}
      </div>
      <div
        style={{
          width: '60px',
          height: '3px',
          background: tribe.color,
          borderRadius: '2px',
          marginBottom: '12px',
        }}
      />

      {/* Strengths */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            padding: '2px 8px',
            background: '#3a3a5a',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#aaa',
            textTransform: 'capitalize',
          }}
        >
          {tribe.primaryStrength}
        </span>
        <span
          style={{
            padding: '2px 8px',
            background: '#3a3a5a',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#888',
            textTransform: 'capitalize',
          }}
        >
          {tribe.secondaryStrength}
        </span>
      </div>

      {/* Unique unit */}
      {available && tribe.uniqueUnitType !== 'warrior' && (
        <div
          style={{
            fontSize: '12px',
            color: '#8a8aaa',
            marginBottom: '4px',
          }}
        >
          Unique Unit: <span style={{ color: '#ccc' }}>{formatId(tribe.uniqueUnitType)}</span>
        </div>
      )}

      {/* Unique building */}
      {available && !['library', 'barracks'].includes(tribe.uniqueBuildingId as string) && (
        <div
          style={{
            fontSize: '12px',
            color: '#8a8aaa',
            marginBottom: '8px',
          }}
        >
          Unique Building: <span style={{ color: '#ccc' }}>{formatId(tribe.uniqueBuildingId as string)}</span>
        </div>
      )}

      {/* Bonuses */}
      {available && bonusEntries.length > 0 && (
        <div
          style={{
            fontSize: '11px',
            color: '#6a6a8a',
            textAlign: 'center',
            lineHeight: '1.4',
          }}
        >
          {bonusEntries.map(([key, value]) => (
            <div key={key} style={{ color: '#7a7aaa' }}>
              {formatBonusValue(value as number)} {formatBonusKey(key)}
            </div>
          ))}
        </div>
      )}

      {/* Coming Soon overlay */}
      {!available && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 12px',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#666',
            whiteSpace: 'nowrap',
          }}
        >
          Coming Soon
        </div>
      )}
    </div>
  )
}

interface MainMenuProps {
  onStartGame: (tribe: TribeName) => void
  soarService: SOARService
}

export function MainMenu({ onStartGame, soarService }: MainMenuProps): JSX.Element {
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const tribes = Object.values(TRIBE_DEFINITIONS)

  const playableTribeNames = PLAYABLE_TRIBES.map(t => t.name)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: '100vh',
        maxHeight: '100vh',
        color: '#fff',
        padding: '20px',
        paddingTop: '20px',
        paddingBottom: '40px',
        overflowY: 'auto',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Wallet button and leaderboard */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 10,
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => setShowLeaderboard(true)}
          style={{
            padding: '8px 16px',
            background: '#2a2a4a',
            border: '1px solid #4a4a8a',
            borderRadius: '6px',
            color: '#ccc',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Leaderboard
        </button>
        <WalletButton />
      </div>

      {/* Logo */}
      <img
        src="/assets/moon-or-dust-logo.svg"
        alt="Moon or Dust"
        style={{
          height: '140px',
          marginBottom: '1rem',
        }}
      />
      <p
        style={{
          color: '#fff',
          marginBottom: '1.5rem',
          fontSize: '0.95rem',
          maxWidth: '850px',
          textAlign: 'center',
          lineHeight: '1.5',
        }}
      >
        Relive the Golden Age of Solana NFTs! Build your empire, research technology, develop culture, and vanquish enemies in this on-chain turn-based strategy game. Will you reach the moon or crumple to dust?
      </p>

      {/* Section title */}
      <h2
        style={{
          fontSize: '1rem',
          marginBottom: '1rem',
          color: '#aaa',
          fontWeight: 'normal',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        Select Your Tribe
      </h2>

      {/* Tribe grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 240px)',
          gap: '16px',
        }}
      >
        {tribes.map((tribe) => (
          <TribeCard
            key={tribe.name}
            tribe={tribe}
            available={playableTribeNames.includes(tribe.name)}
            onSelect={() => onStartGame(tribe.name)}
          />
        ))}
      </div>

      {/* Leaderboard overlay */}
      {showLeaderboard && (
        <LeaderboardPanel
          soarService={soarService}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
