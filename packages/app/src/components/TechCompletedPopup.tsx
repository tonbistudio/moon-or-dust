// Popup for showing tech completion with unlocks and description

import type { TechId, Tech } from '@tribes/game-core'
import { getTech, ALL_WONDERS } from '@tribes/game-core'

interface TechCompletedPopupProps {
  techId: TechId
  onDismiss: () => void
  onViewTechTree: () => void
}

// Tech descriptions - one sentence explaining the concept
const TECH_DESCRIPTIONS: Record<string, string> = {
  // Era 1
  mining: 'Extract valuable minerals from the earth to fuel production.',
  animal_husbandry: 'Domesticate animals for labor, food, and cavalry potential.',
  farming: 'Cultivate crops to sustain growing populations.',
  coding: 'Master the fundamental language of the digital age.',
  smart_contracts: 'Enable trustless trade and automated agreements on-chain.',
  archery: 'Strike enemies from a distance with ranged weaponry.',
  minting: 'Create digital assets and establish your presence on-chain.',
  bronze_working: 'Forge stronger weapons and train disciplined soldiers.',
  pfps: 'Express identity through profile pictures and digital art.',
  horseback_riding: 'Mount swift cavalry units for rapid strikes.',

  // Era 2
  iron_working: 'Smelt iron into superior weapons for elite warriors.',
  currency: 'Establish a monetary system to facilitate complex trade.',
  discord: 'Build community platforms for coordination and governance.',
  defi: 'Unlock decentralized finance for yield generation.',
  staking: 'Lock tokens to earn rewards and secure networks.',
  priority_fees: 'Outbid competitors for faster transaction execution.',
  on_chain_gaming: 'Create immutable game experiences on the blockchain.',
  matrica: 'Verify identity and gate communities.',
  lending: 'Provide and access liquidity through borrowing protocols.',
  botting: 'Automate repetitive tasks with programmatic efficiency.',

  // Era 3
  artificial_intelligence: 'Harness machine learning for strategic advantage.',
  ponzinomics: 'Master the dark arts of unsustainable tokenomics.',
  hacking: 'Exploit vulnerabilities in enemy systems and defenses.',
  tokenomics: 'Design sustainable token economies that drive value.',
  hardware_wallets: 'Secure assets with cold storage technology.',
  siege_weapons: 'Deploy devastating siege equipment against fortifications.',
  wolf_game: 'Develop advanced game theory and predator-prey dynamics.',
  liquidity_pools: 'Create deep markets for efficient token exchange.',
  firedancer: 'Achieve maximum throughput with next-gen validators.',
  ohm: 'Build protocol-owned liquidity through bonding mechanisms.',
}

// Get unlock items from a tech (similar to TechNode but simplified)
interface UnlockItem {
  name: string
  type: 'unit' | 'building' | 'improvement' | 'resource' | 'wonder' | 'feature'
  color: string
  icon: string
}

function getUnlockItems(tech: Tech): UnlockItem[] {
  const unlocks: UnlockItem[] = []

  if (tech.unlocks.units && tech.unlocks.units.length > 0) {
    tech.unlocks.units.forEach(u => {
      const name = u.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      unlocks.push({ name, type: 'unit', color: '#ef5350', icon: '\u2694' }) // swords
    })
  }

  if (tech.unlocks.buildings && tech.unlocks.buildings.length > 0) {
    tech.unlocks.buildings.forEach(b => {
      const name = String(b).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      unlocks.push({ name, type: 'building', color: '#8b4513', icon: '\u{1F3DB}' }) // building
    })
  }

  if (tech.unlocks.improvements && tech.unlocks.improvements.length > 0) {
    tech.unlocks.improvements.forEach(i => {
      const name = i.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      unlocks.push({ name, type: 'improvement', color: '#ff9800', icon: '\u2692' }) // hammer
    })
  }

  if (tech.unlocks.resources && tech.unlocks.resources.length > 0) {
    tech.unlocks.resources.forEach(r => {
      unlocks.push({
        name: r.charAt(0).toUpperCase() + r.slice(1),
        type: 'resource',
        color: '#66bb6a',
        icon: '\u{1F48E}' // gem
      })
    })
  }

  if (tech.unlocks.features && tech.unlocks.features.length > 0) {
    tech.unlocks.features.forEach(f => {
      unlocks.push({ name: f, type: 'feature', color: '#26c6da', icon: '\u2728' }) // sparkles
    })
  }

  // Find wonders that have this tech as a prerequisite
  const wondersUnlocked = ALL_WONDERS.filter(w => w.techPrereq === tech.id)
  if (wondersUnlocked.length > 0) {
    wondersUnlocked.forEach(w => {
      unlocks.push({ name: w.name, type: 'wonder', color: '#ffd700', icon: '\u{1F3C6}' }) // trophy
    })
  }

  return unlocks
}

// Get era name
function getEraName(era: number): string {
  switch (era) {
    case 1: return 'Ancient Era'
    case 2: return 'Classical Era'
    case 3: return 'Modern Era'
    default: return `Era ${era}`
  }
}

// Era colors
const ERA_COLORS: Record<number, string> = {
  1: '#4caf50', // Green
  2: '#2196f3', // Blue
  3: '#9c27b0', // Purple
}

export function TechCompletedPopup({
  techId,
  onDismiss,
  onViewTechTree,
}: TechCompletedPopupProps): JSX.Element | null {
  const tech = getTech(techId)
  if (!tech) return null

  const description = TECH_DESCRIPTIONS[techId as string] ?? 'A new technology has been discovered.'
  const unlocks = getUnlockItems(tech)
  const eraColor = ERA_COLORS[tech.era] ?? '#666'

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
        background: 'rgba(0, 0, 0, 0.92)',
        zIndex: 1000,
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: '#0d0d1a',
          borderRadius: '12px',
          minWidth: '380px',
          maxWidth: '440px',
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '1px solid #333',
          animation: 'techPopIn 0.4s ease-out',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
            borderBottom: '1px solid #333',
          }}
        >
          {/* Era badge */}
          <div
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 600,
              color: eraColor,
              background: `${eraColor}20`,
              border: `1px solid ${eraColor}40`,
              marginBottom: '12px',
            }}
          >
            {getEraName(tech.era)}
          </div>

          {/* Tech icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2a2a40 0%, #1a1a2e 100%)',
              border: `2px solid ${eraColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 20px ${eraColor}40`,
            }}
          >
            <img
              src={`/assets/icons/techs/${techId}.svg`}
              alt={tech.name}
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'contain',
                filter: 'brightness(1.1)',
              }}
              onError={(e) => {
                // Fallback to placeholder if icon not found
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '4px',
            }}
          >
            Research Complete
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {tech.name}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px 24px' }}>
          {/* Description */}
          <div
            style={{
              fontSize: '14px',
              color: '#aaa',
              lineHeight: 1.5,
              marginBottom: unlocks.length > 0 ? '20px' : '24px',
              fontStyle: 'italic',
            }}
          >
            "{description}"
          </div>

          {/* Unlocks */}
          {unlocks.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#666',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '12px',
                }}
              >
                Unlocks
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                }}
              >
                {unlocks.map((unlock, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: `${unlock.color}15`,
                      border: `1px solid ${unlock.color}40`,
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{unlock.icon}</span>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: unlock.color,
                      }}
                    >
                      {unlock.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={onViewTechTree}
              style={{
                background: 'transparent',
                color: '#888',
                border: '1px solid #444',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#666'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#444'
                e.currentTarget.style.color = '#888'
              }}
            >
              View Tech Tree
            </button>
            <button
              onClick={onDismiss}
              style={{
                background: `linear-gradient(180deg, ${eraColor} 0%, ${eraColor}cc 100%)`,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 32px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes techPopIn {
          0% {
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
