// Main menu with tribe selection — Solanart NFT marketplace aesthetic

import { useState, useEffect } from 'react'
import type { TribeName } from '@tribes/game-core'
import { TRIBE_DEFINITIONS, PLAYABLE_TRIBES } from '@tribes/game-core'
import { WalletButton } from '../wallet/WalletButton'
import { LeaderboardPanel } from './LeaderboardPanel'
import type { SOARService } from '../magicblock/soar'

// Tribe flavor text
const TRIBE_LORE: Record<string, string> = {
  monkes: 'Masters of chaos and commerce. Where others see risk, Monkes see opportunity.',
  geckos: 'Cold-blooded strategists who thrive in silence. Technology is their weapon.',
  degods: 'Forged in fire and fury. Every kill feeds the war machine.',
  cets: 'Patient builders who turn stone into empire. Slow and inevitable.',
  gregs: 'Cunning merchants with eyes everywhere. Gold flows where Foxes tread.',
  dragonz: 'Ancient warriors wreathed in flame. Their rage shakes the earth.',
}

// Tribe sigil symbols
const TRIBE_SIGILS: Record<string, string> = {
  monkes: '\u{1F34C}',
  geckos: '\u{1F98E}',
  degods: '\u{1F480}',
  cets: '\u{1F431}',
  gregs: '\u{1F98A}',
  dragonz: '\u{1F409}',
}

function formatBonusKey(key: string): string {
  return key
    .replace(/Percent$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function formatBonusValue(value: number): string {
  if (value < 1) return `+${Math.round(value * 100)}%`
  return `+${value}`
}

function formatId(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Tribe Card ───────────────────────────────────────────────────────────────

interface TribeCardProps {
  tribe: typeof TRIBE_DEFINITIONS[TribeName]
  available: boolean
  selected: boolean
  onSelect: () => void
  index: number
}

function TribeCard({ tribe, available, selected, onSelect, index }: TribeCardProps): JSX.Element {
  const [hovered, setHovered] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [btnHovered, setBtnHovered] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80 * index)
    return () => clearTimeout(t)
  }, [index])

  const bonusEntries = Object.entries(tribe.bonuses).filter(
    ([, v]) => v !== undefined && v !== 0
  )
  const playableTribeNames = PLAYABLE_TRIBES.map(t => t.name)
  const hasSprite = playableTribeNames.includes(tribe.name)
  const active = hovered && available
  const lore = TRIBE_LORE[tribe.name] ?? ''
  const sigil = TRIBE_SIGILS[tribe.name] ?? '?'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        background: selected
          ? `linear-gradient(170deg, ${tribe.color}20 0%, #16112b 50%, #110d22 100%)`
          : active
            ? 'linear-gradient(170deg, #1e1840 0%, #16112b 100%)'
            : '#16112b',
        border: selected
          ? `2px solid ${tribe.color}`
          : active
            ? '2px solid #7c3aed'
            : '2px solid #2a2050',
        borderRadius: '12px',
        cursor: available ? 'pointer' : 'default',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: mounted ? 'translateY(0)' : 'translateY(16px)',
        opacity: mounted ? (available ? 1 : 0.4) : 0,
        overflow: 'hidden',
        minHeight: '340px',
        boxShadow: selected
          ? `0 0 40px ${tribe.color}30, 0 8px 32px rgba(0,0,0,0.6)`
          : active
            ? '0 0 30px #7c3aed25, 0 4px 20px rgba(0,0,0,0.4)'
            : '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Portrait area — larger for NFT collection feel */}
      <div
        style={{
          position: 'relative',
          height: '160px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: `radial-gradient(ellipse at center, ${tribe.color}10 0%, transparent 70%)`,
          borderBottom: `1px solid #2a205060`,
        }}
      >
        {hasSprite ? (
          <img
            src={`/assets/menu/${tribe.name}.png`}
            alt={tribe.displayName}
            style={{
              height: '100%',
              objectFit: 'cover',
              filter: selected ? 'brightness(1.15)' : active ? 'brightness(1.08)' : 'brightness(0.9)',
              transition: 'filter 0.3s ease, transform 0.4s ease',
              transform: active ? 'scale(1.04)' : 'scale(1)',
            }}
          />
        ) : (
          <span style={{ fontSize: '64px', filter: 'grayscale(0.8)', opacity: 0.4 }}>
            {sigil}
          </span>
        )}
        {/* Bottom vignette into card body */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 50%, #16112b 100%)',
            pointerEvents: 'none',
          }}
        />
        {/* Selected check */}
        {selected && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: tribe.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              color: '#000',
              fontWeight: 700,
              boxShadow: `0 0 14px ${tribe.color}70`,
              zIndex: 2,
            }}
          >
            ✓
          </div>
        )}
      </div>

      {/* Info section */}
      <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Name row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: selected ? tribe.color : '#e2e0f0',
              letterSpacing: '0.02em',
              transition: 'color 0.3s ease',
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}
          >
            {tribe.displayName}
          </span>
        </div>

        {/* Strengths pills */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <span
            style={{
              padding: '2px 10px',
              background: `${tribe.color}18`,
              border: `1px solid ${tribe.color}35`,
              borderRadius: '20px',
              fontSize: '10px',
              color: tribe.color,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            {tribe.primaryStrength}
          </span>
          <span
            style={{
              padding: '2px 10px',
              background: '#8b5cf610',
              border: '1px solid #8b5cf620',
              borderRadius: '20px',
              fontSize: '10px',
              color: '#8b8ba0',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {tribe.secondaryStrength}
          </span>
        </div>

        {/* Lore text */}
        {available && (
          <p
            style={{
              fontSize: '11px',
              color: '#7a789a',
              lineHeight: 1.55,
              margin: '0 0 10px',
              fontStyle: 'italic',
              minHeight: '33px',
            }}
          >
            {lore}
          </p>
        )}

        {/* Unique unit / building */}
        {available && (
          <div style={{ fontSize: '11px', color: '#5a5878', marginBottom: '8px' }}>
            {tribe.uniqueUnitType !== 'warrior' && (
              <div style={{ marginBottom: '2px' }}>
                <span style={{ color: '#6a6888' }}>Unit </span>
                <span style={{ color: '#9a98b8' }}>{formatId(tribe.uniqueUnitType)}</span>
              </div>
            )}
            {!['library', 'barracks'].includes(tribe.uniqueBuildingId as string) && (
              <div>
                <span style={{ color: '#6a6888' }}>Bldg </span>
                <span style={{ color: '#9a98b8' }}>{formatId(tribe.uniqueBuildingId as string)}</span>
              </div>
            )}
          </div>
        )}

        {/* Bonuses */}
        {available && bonusEntries.length > 0 && (
          <div style={{ marginTop: 'auto', borderTop: '1px solid #2a2050', paddingTop: '8px' }}>
            {bonusEntries.map(([key, value]) => (
              <div
                key={key}
                style={{
                  fontSize: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '2px',
                }}
              >
                <span style={{ color: '#6a6888' }}>{formatBonusKey(key)}</span>
                <span style={{ color: tribe.color, fontWeight: 600, fontFamily: 'monospace' }}>
                  {formatBonusValue(value as number)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Coming Soon badge */}
        {!available && (
          <div
            style={{
              marginTop: 'auto',
              padding: '6px 0',
              textAlign: 'center',
              fontSize: '11px',
              color: '#4a4868',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              borderTop: '1px solid #2a2050',
            }}
          >
            Coming Soon
          </div>
        )}

        {/* Select button at card bottom */}
        {available && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect() }}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              marginTop: bonusEntries.length > 0 ? '10px' : 'auto',
              padding: '7px 0',
              width: '100%',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: selected ? '#000' : btnHovered ? '#fff' : '#c4b5fd',
              background: selected
                ? tribe.color
                : btnHovered
                  ? '#7c3aed'
                  : 'transparent',
              border: selected
                ? `1px solid ${tribe.color}`
                : `1px solid #7c3aed80`,
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: selected
                ? `0 0 16px ${tribe.color}40`
                : btnHovered
                  ? '0 0 16px #7c3aed30'
                  : 'none',
            }}
          >
            {selected ? 'Selected' : 'Select'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Menu ────────────────────────────────────────────────────────────────

interface MainMenuProps {
  onStartGame: (tribe: TribeName) => void
  soarService: SOARService
}

export function MainMenu({ onStartGame, soarService }: MainMenuProps): JSX.Element {
  const [selectedTribe, setSelectedTribe] = useState<TribeName | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [titleVisible, setTitleVisible] = useState(false)
  const [startHovered, setStartHovered] = useState(false)

  const tribes = Object.values(TRIBE_DEFINITIONS)
  const playableTribeNames = PLAYABLE_TRIBES.map(t => t.name)

  useEffect(() => {
    const t = setTimeout(() => setTitleVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleStart = () => {
    if (selectedTribe) onStartGame(selectedTribe)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        maxHeight: '100vh',
        color: '#fff',
        overflowY: 'auto',
        boxSizing: 'border-box',
        position: 'relative',
        // Solanart deep purple radial gradient
        background: 'radial-gradient(ellipse at 50% 30%, #1a1035 0%, #130e24 40%, #08050f 100%)',
      }}
    >
      {/* Purple glow orb — top left */}
      <div
        style={{
          position: 'fixed',
          top: '-15%',
          left: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #7c3aed18 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {/* Purple glow orb — bottom right */}
      <div
        style={{
          position: 'fixed',
          bottom: '-20%',
          right: '-10%',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #8b5cf615 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Subtle noise texture overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top bar — purple tinted */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '12px 20px',
          zIndex: 20,
          background: 'linear-gradient(180deg, #08050fee 0%, transparent 100%)',
          borderBottom: '1px solid #2a205030',
          gap: '8px',
        }}
      >
        <button
          onClick={() => setShowLeaderboard(true)}
          style={{
            padding: '6px 14px',
            background: 'transparent',
            border: '1px solid #3a2860',
            borderRadius: '8px',
            color: '#8b8ba0',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#c4b5fd' }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = '#3a2860'; e.currentTarget.style.color = '#8b8ba0' }}
        >
          Leaderboard
        </button>
        <WalletButton />
      </div>

      {/* Hero section */}
      <div
        style={{
          textAlign: 'center',
          padding: '20px 20px 30px',
          maxWidth: '720px',
          zIndex: 1,
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: titleVisible ? 1 : 0,
          transform: titleVisible ? 'translateY(0)' : 'translateY(-12px)',
        }}
      >
        <img
          src="/assets/moon-or-dust-logo.svg"
          alt="Moon or Dust"
          style={{
            height: '120px',
            marginBottom: '16px',
            filter: 'drop-shadow(0 0 40px rgba(139,92,246,0.2))',
          }}
        />
        <p
          style={{
            color: '#9090a8',
            fontSize: '14px',
            lineHeight: 1.7,
            margin: 0,
            maxWidth: '540px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Relive the Golden Age of Solana NFTs. Build your empire, research technology,
          develop culture, and vanquish your enemies. Will you reach the moon — or crumble to dust?
        </p>
      </div>

      {/* Section divider — "Top collections" style */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          width: '100%',
          maxWidth: '960px',
          padding: '0 20px',
          marginBottom: '28px',
          zIndex: 1,
        }}
      >
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #3a285060)' }} />
        <span
          style={{
            fontSize: '13px',
            color: '#8b8ba0',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            textShadow: '0 0 20px #7c3aed30',
          }}
        >
          Choose Your Tribe
        </span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #3a285060, transparent)' }} />
      </div>

      {/* Tribe grid — wider cards, more gap */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 240px)',
          gap: '16px',
          padding: '0 20px',
          marginBottom: '32px',
          zIndex: 1,
        }}
      >
        {tribes.map((tribe, i) => (
          <TribeCard
            key={tribe.name}
            tribe={tribe}
            available={playableTribeNames.includes(tribe.name)}
            selected={selectedTribe === tribe.name}
            onSelect={() => setSelectedTribe(tribe.name)}
            index={i}
          />
        ))}
      </div>

      {/* Start game area — green CTA like Solanart "EXPLORE COLLECTIONS" */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 10,
          background: 'linear-gradient(180deg, transparent 0%, #08050f 40%)',
        }}
      >
        <button
          onClick={handleStart}
          disabled={!selectedTribe}
          onMouseEnter={() => setStartHovered(true)}
          onMouseLeave={() => setStartHovered(false)}
          style={{
            padding: '14px 48px',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: selectedTribe ? '#fff' : '#4a4868',
            background: selectedTribe
              ? startHovered
                ? 'linear-gradient(135deg, #059669, #10b981)'
                : 'linear-gradient(135deg, #10b981, #059669)'
              : '#16112b',
            border: selectedTribe ? 'none' : '1px solid #2a2050',
            borderRadius: '28px',
            cursor: selectedTribe ? 'pointer' : 'default',
            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: selectedTribe
              ? startHovered
                ? '0 0 40px #10b98140, 0 8px 30px rgba(0,0,0,0.5)'
                : '0 0 24px #10b98130, 0 4px 20px rgba(0,0,0,0.4)'
              : 'none',
            minWidth: '260px',
            transform: startHovered && selectedTribe ? 'translateY(-2px)' : 'translateY(0)',
          }}
        >
          {selectedTribe ? `Lead the ${TRIBE_DEFINITIONS[selectedTribe]?.displayName ?? ''}` : 'Select a Tribe'}
        </button>
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
