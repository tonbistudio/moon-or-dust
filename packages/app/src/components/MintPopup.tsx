// Popup for the unit minting experience - NFT-style rarity reveal

import { useState, useCallback } from 'react'
import type { PendingMint, Unit, UnitRarity } from '@tribes/game-core'
import { RARITY_BONUSES } from '@tribes/game-core'

interface MintPopupProps {
  pendingMint: PendingMint
  index: number
  totalPending: number
  onMint: () => Promise<Unit | null> // Returns the minted unit (async for VRF)
  onComplete: () => void // Called when user clicks Continue
  /** True when wallet is connected and on-chain VRF is active */
  isOnChainVRF?: boolean
}

type MintState = 'ready' | 'anticipation' | 'reveal' | 'celebration'

// Rarity colors matching CLAUDE.md
const RARITY_COLORS: Record<UnitRarity, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#ffd700',
}

const RARITY_BG_COLORS: Record<UnitRarity, string> = {
  common: '#374151',
  uncommon: '#14532d',
  rare: '#1e3a5f',
  epic: '#4c1d95',
  legendary: '#78350f',
}

const RARITY_NAMES: Record<UnitRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
}

// Rarity drop chances for display
const RARITY_CHANCES: Record<UnitRarity, string> = {
  common: '50%',
  uncommon: '30%',
  rare: '15%',
  epic: '4%',
  legendary: '1%',
}

// Get unit category icon based on unit type
function getUnitIcon(unitType: string): string {
  // Melee units
  if (['warrior', 'swordsman', 'bot_fighter', 'deadgod', 'stuckers'].includes(unitType)) {
    return '⚔️'
  }
  // Ranged units
  if (['archer', 'sniper', 'rocketer', 'banana_slinger', 'neon_geck'].includes(unitType)) {
    return '🏹'
  }
  // Cavalry units
  if (['horseman', 'knight', 'tank'].includes(unitType)) {
    return '🐎'
  }
  // Siege units
  if (['social_engineer', 'bombard'].includes(unitType)) {
    return '💣'
  }
  // Recon
  if (unitType === 'scout') {
    return '👁'
  }
  // Civilian
  if (unitType === 'settler') {
    return '🏠'
  }
  if (unitType === 'builder') {
    return '🔨'
  }
  return '⚔️'
}

export function MintPopup({
  pendingMint,
  index,
  totalPending,
  onMint,
  onComplete,
  isOnChainVRF = false,
}: MintPopupProps): JSX.Element {
  const [mintState, setMintState] = useState<MintState>('ready')
  const [mintedUnit, setMintedUnit] = useState<Unit | null>(null)
  const [vrfError, setVrfError] = useState<string | null>(null)

  // Create display name from unit type (e.g., 'warrior' -> 'Warrior')
  const unitName = pendingMint.unitType.charAt(0).toUpperCase() + pendingMint.unitType.slice(1).replace(/_/g, ' ')
  const unitIcon = getUnitIcon(pendingMint.unitType)

  const handleMintClick = useCallback(() => {
    if (mintState !== 'ready') return
    setVrfError(null)

    // Start anticipation animation
    setMintState('anticipation')

    // Await the (potentially async) mint — VRF polling happens during anticipation
    const doMint = async () => {
      try {
        const unit = await onMint()
        setMintedUnit(unit)
        setMintState('reveal')

        // After reveal animation, show celebration with Continue button
        setTimeout(() => {
          setMintState('celebration')
        }, 1000)
      } catch (err) {
        console.error('VRF mint error:', err)
        setVrfError(err instanceof Error ? err.message : 'Mint failed')
        setMintState('ready')
      }
    }

    // Small delay so the anticipation animation is visible even for instant (local) mints
    setTimeout(() => { doMint() }, 800)
  }, [mintState, onMint])

  const handleContinueClick = useCallback(() => {
    onComplete()
  }, [onComplete])

  const rarityColor = mintedUnit ? RARITY_COLORS[mintedUnit.rarity] : '#666'
  const rarityBgColor = mintedUnit ? RARITY_BG_COLORS[mintedUnit.rarity] : '#1a1a2e'
  const rarityBonus = mintedUnit ? RARITY_BONUSES[mintedUnit.rarity] : null
  const isRevealed = mintState === 'reveal' || mintState === 'celebration'

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
        zIndex: 1000,
      }}
    >
      {/* Main Card Container */}
      <div
        style={{
          width: '340px',
          animation: 'mintPopIn 0.4s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* NFT Card */}
        <div
          style={{
            position: 'relative',
            background: isRevealed
              ? `linear-gradient(145deg, ${rarityBgColor} 0%, #0a0a15 100%)`
              : 'linear-gradient(145deg, #1a1a2e 0%, #0a0a15 100%)',
            borderRadius: '16px',
            padding: '4px',
            boxShadow: isRevealed
              ? `0 0 40px ${rarityColor}40, 0 20px 60px rgba(0,0,0,0.8)`
              : '0 20px 60px rgba(0,0,0,0.8)',
            transition: 'all 0.5s ease',
          }}
        >
          {/* Holographic overlay for rare+ */}
          {isRevealed && mintedUnit && mintedUnit.rarity !== 'common' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '16px',
                background: mintedUnit.rarity === 'legendary'
                  ? 'linear-gradient(135deg, transparent 0%, rgba(255,215,0,0.1) 25%, transparent 50%, rgba(255,215,0,0.15) 75%, transparent 100%)'
                  : 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
                animation: mintedUnit.rarity === 'legendary' ? 'holoShine 3s ease-in-out infinite' : undefined,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Inner card */}
          <div
            style={{
              background: '#0d0d18',
              borderRadius: '12px',
              border: `2px solid ${isRevealed ? rarityColor : '#2a2a4a'}`,
              overflow: 'hidden',
              transition: 'border-color 0.5s ease',
            }}
          >
            {/* Card Art Area */}
            <div
              style={{
                position: 'relative',
                height: '180px',
                background: isRevealed
                  ? `radial-gradient(ellipse at center, ${rarityColor}20 0%, transparent 70%)`
                  : 'radial-gradient(ellipse at center, #3a3a5a20 0%, transparent 70%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: `1px solid ${isRevealed ? rarityColor + '40' : '#2a2a4a'}`,
                overflow: 'hidden',
                transition: 'all 0.5s ease',
              }}
            >
              {/* Background pattern */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0.1,
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                }}
              />

              {/* Card Icon */}
              {mintState === 'ready' && (
                <div
                  style={{
                    fontSize: '80px',
                    opacity: 0.3,
                    filter: 'grayscale(100%)',
                  }}
                >
                  {unitIcon}
                </div>
              )}

              {mintState === 'anticipation' && (
                <div
                  style={{
                    fontSize: '80px',
                    animation: 'mintShake 0.1s ease-in-out infinite',
                    filter: 'grayscale(50%)',
                  }}
                >
                  {unitIcon}
                </div>
              )}

              {isRevealed && mintedUnit && (
                <div
                  style={{
                    fontSize: '90px',
                    animation: mintState === 'reveal'
                      ? 'mintReveal 0.6s ease-out'
                      : mintedUnit.rarity === 'legendary'
                      ? 'mintLegendaryPulse 2s ease-in-out infinite'
                      : 'mintGlow 3s ease-in-out infinite',
                    filter: mintedUnit.rarity === 'legendary' ? 'drop-shadow(0 0 20px gold)' : undefined,
                  }}
                >
                  {unitIcon}
                </div>
              )}

              {/* Rarity badge (top right corner) */}
              {isRevealed && mintedUnit && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: rarityColor,
                    color: mintedUnit.rarity === 'legendary' || mintedUnit.rarity === 'common' ? '#000' : '#fff',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: `0 2px 10px ${rarityColor}60`,
                    animation: 'badgePop 0.3s ease-out 0.3s both',
                  }}
                >
                  {RARITY_NAMES[mintedUnit.rarity]}
                </div>
              )}

              {/* "?" overlay for ready state */}
              {mintState === 'ready' && (
                <div
                  style={{
                    position: 'absolute',
                    fontSize: '120px',
                    fontWeight: 900,
                    color: '#fff',
                    opacity: 0.15,
                    textShadow: '0 0 40px rgba(99, 102, 241, 0.5)',
                  }}
                >
                  ?
                </div>
              )}
            </div>

            {/* Card Name Plate */}
            <div
              style={{
                padding: '16px 20px',
                background: isRevealed
                  ? `linear-gradient(180deg, ${rarityBgColor}80 0%, #0d0d18 100%)`
                  : 'linear-gradient(180deg, #1a1a2e 0%, #0d0d18 100%)',
                borderBottom: `1px solid ${isRevealed ? rarityColor + '30' : '#2a2a4a'}`,
                transition: 'all 0.5s ease',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#fff',
                  textAlign: 'center',
                  textShadow: isRevealed ? `0 0 20px ${rarityColor}60` : undefined,
                }}
              >
                {unitName}
              </div>
              {mintState === 'ready' && (
                <div style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginTop: '4px' }}>
                  Tap to reveal rarity
                </div>
              )}
              {mintState === 'anticipation' && (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#888',
                    textAlign: 'center',
                    marginTop: '4px',
                    animation: 'mintPulseText 0.5s ease-in-out infinite',
                  }}
                >
                  {isOnChainVRF ? 'Verifying on-chain...' : 'Rolling...'}
                </div>
              )}
            </div>

            {/* Stats / Rarity Info Section */}
            <div style={{ padding: '16px 20px' }}>
              {/* Pre-mint: Show rarity chances and potential bonuses */}
              {mintState === 'ready' && (
                <div>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                    Possible Rarities
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(['legendary', 'epic', 'rare', 'uncommon', 'common'] as UnitRarity[]).map((rarity) => {
                      const bonus = RARITY_BONUSES[rarity]
                      const bonusText = []
                      if (bonus.combat > 0) bonusText.push(`+${bonus.combat} Combat`)
                      if (bonus.movement > 0) bonusText.push(`+${bonus.movement} Move`)
                      if (bonus.vision > 0) bonusText.push(`+${bonus.vision} Vision`)
                      return (
                        <div
                          key={rarity}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: '#0a0a12',
                            borderRadius: '6px',
                            borderLeft: `3px solid ${RARITY_COLORS[rarity]}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: RARITY_COLORS[rarity], fontWeight: 600, fontSize: '12px' }}>
                              {RARITY_NAMES[rarity]}
                            </span>
                            <span style={{ color: '#555', fontSize: '11px' }}>
                              {RARITY_CHANCES[rarity]}
                            </span>
                          </div>
                          <span style={{ color: bonusText.length > 0 ? '#4ade80' : '#444', fontSize: '11px' }}>
                            {bonusText.length > 0 ? bonusText.join(', ') : 'Base stats'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Anticipation: Show spinner */}
              {mintState === 'anticipation' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '10px' }}>
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      border: '3px solid #222',
                      borderTopColor: isOnChainVRF ? '#14f195' : '#6366f1',
                      borderRadius: '50%',
                      animation: 'mintSpin 0.8s linear infinite',
                    }}
                  />
                  {isOnChainVRF && (
                    <div style={{ fontSize: '11px', color: '#14f195', opacity: 0.7 }}>
                      MagicBlock VRF
                    </div>
                  )}
                </div>
              )}

              {/* VRF error message */}
              {vrfError && mintState === 'ready' && (
                <div style={{ padding: '8px 12px', background: '#3b1010', borderRadius: '6px', border: '1px solid #ef4444', marginBottom: '8px' }}>
                  <div style={{ color: '#ef4444', fontSize: '12px' }}>{vrfError}</div>
                  <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>Tap Mint to retry</div>
                </div>
              )}

              {/* Post-mint: Show final stats with bonuses highlighted */}
              {mintState === 'celebration' && mintedUnit && (
                <div>
                  {/* Stats Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <StatCard
                      icon="⚔️"
                      label="ATK"
                      value={mintedUnit.combatStrength}
                      bonus={rarityBonus?.combat ?? 0}
                      color="#ef4444"
                    />
                    <StatCard
                      icon="🧡"
                      label="HP"
                      value={mintedUnit.maxHealth}
                      bonus={0}
                      color="#3b82f6"
                    />
                    <StatCard
                      icon="👣"
                      label="MOV"
                      value={mintedUnit.maxMovement}
                      bonus={rarityBonus?.movement ?? 0}
                      color="#22c55e"
                    />
                    <StatCard
                      icon="👁"
                      label="VIS"
                      value={2 + (rarityBonus?.vision ?? 0)}
                      bonus={rarityBonus?.vision ?? 0}
                      color="#fbbf24"
                    />
                  </div>

                  {/* Rarity bonus callout */}
                  {mintedUnit.rarity !== 'common' ? (
                    <div
                      style={{
                        padding: '12px 14px',
                        background: `linear-gradient(135deg, ${rarityColor}15 0%, ${rarityColor}05 100%)`,
                        borderRadius: '8px',
                        border: `1px solid ${rarityColor}40`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '16px' }}>
                          {mintedUnit.rarity === 'legendary' ? '👑' :
                           mintedUnit.rarity === 'epic' ? '💎' :
                           mintedUnit.rarity === 'rare' ? '⭐' : '✨'}
                        </span>
                        <span style={{ color: rarityColor, fontWeight: 700, fontSize: '13px' }}>
                          {RARITY_NAMES[mintedUnit.rarity]} Bonus!
                        </span>
                      </div>
                      <div style={{ color: '#aaa', fontSize: '12px', lineHeight: 1.5 }}>
                        {rarityBonus && rarityBonus.combat > 0 && (
                          <span style={{ color: '#4ade80' }}>+{rarityBonus.combat} Combat Strength </span>
                        )}
                        {rarityBonus && rarityBonus.movement > 0 && (
                          <span style={{ color: '#4ade80' }}>+{rarityBonus.movement} Movement </span>
                        )}
                        {rarityBonus && rarityBonus.vision > 0 && (
                          <span style={{ color: '#4ade80' }}>+{rarityBonus.vision} Vision Range</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '12px 14px',
                        background: '#0a0a12',
                        borderRadius: '8px',
                        border: '1px solid #2a2a4a',
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ color: '#666', fontSize: '12px' }}>
                        Base stats - no rarity bonus
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div style={{ padding: '0 20px 20px' }}>
              {mintState === 'ready' && (
                <button
                  onClick={handleMintClick}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '14px 32px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    transition: 'transform 0.1s, box-shadow 0.2s',
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)'
                    e.currentTarget.style.boxShadow = '0 6px 30px rgba(99, 102, 241, 0.6), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                >
                  Mint
                </button>
              )}

              {mintState === 'celebration' && (
                <button
                  onClick={handleContinueClick}
                  style={{
                    width: '100%',
                    background: `linear-gradient(180deg, ${rarityColor} 0%, ${rarityColor}cc 100%)`,
                    color: mintedUnit?.rarity === 'legendary' || mintedUnit?.rarity === 'common' ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '14px 32px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'transform 0.1s, opacity 0.2s',
                    boxShadow: `0 4px 20px ${rarityColor}40`,
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)'
                    e.currentTarget.style.opacity = '0.9'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pending count indicator */}
        {totalPending > 1 && (
          <div
            style={{
              textAlign: 'center',
              padding: '12px',
              fontSize: '13px',
              color: mintState === 'celebration' ? '#4caf50' : '#666',
            }}
          >
            {mintState === 'celebration'
              ? `${totalPending - 1} more unit${totalPending > 2 ? 's' : ''} to mint`
              : `${index + 1} of ${totalPending} units`}
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes mintPopIn {
          0% {
            transform: scale(0.9) translateY(20px);
            opacity: 0;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes mintShake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-4px) rotate(-2deg); }
          75% { transform: translateX(4px) rotate(2deg); }
        }
        @keyframes mintPulseText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes mintReveal {
          0% {
            transform: scale(0.3) rotateY(180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotateY(90deg);
          }
          100% {
            transform: scale(1) rotateY(0deg);
            opacity: 1;
          }
        }
        @keyframes mintGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
        @keyframes mintLegendaryPulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 20px gold) brightness(1);
          }
          50% {
            transform: scale(1.05);
            filter: drop-shadow(0 0 40px gold) brightness(1.1);
          }
        }
        @keyframes mintSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes holoShine {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        @keyframes badgePop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

// Compact stat card component
function StatCard({
  icon,
  label,
  value,
  bonus,
  color,
}: {
  icon: string
  label: string
  value: number
  bonus: number
  color: string
}): JSX.Element {
  return (
    <div
      style={{
        background: '#0a0a12',
        borderRadius: '8px',
        padding: '10px 6px',
        textAlign: 'center',
        border: bonus > 0 ? `1px solid ${color}40` : '1px solid #1a1a2e',
        position: 'relative',
      }}
    >
      <div style={{ fontSize: '16px', marginBottom: '2px' }}>{icon}</div>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: bonus > 0 ? color : '#fff',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {label}
      </div>
      {bonus > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: '#22c55e',
            color: '#000',
            fontSize: '9px',
            fontWeight: 700,
            padding: '2px 4px',
            borderRadius: '4px',
          }}
        >
          +{bonus}
        </div>
      )}
    </div>
  )
}
