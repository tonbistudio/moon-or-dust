// Popup for showing lootbox rewards when claimed

import type { LootboxRewardInfo } from '../context/GameContext'
import { Tooltip } from './Tooltip'

interface LootboxRewardPopupProps {
  reward: LootboxRewardInfo
  onDismiss: () => void
}

// Reward display names
const REWARD_NAMES: Record<string, string> = {
  airdrop: 'Airdrop',
  alpha_leak: 'Alpha Leak',
  og_holder: 'OG Holder',
  community_growth: 'Community Growth',
  scout: 'Scout Intel',
}

// Reward icons (emoji for now, can be replaced with actual icons)
const REWARD_ICONS: Record<string, string> = {
  airdrop: '\u{1F4B0}', // money bag
  alpha_leak: '\u{1F4A1}', // light bulb
  og_holder: '\u{2694}', // swords
  community_growth: '\u{1F3D8}', // houses
  scout: '\u{1F5FA}', // map
}

// Detailed descriptions for tooltips
const REWARD_DESCRIPTIONS: Record<string, string> = {
  airdrop: 'Instant injection of gold into your treasury. Can be used immediately for purchasing or maintenance.',
  alpha_leak: 'Gain knowledge of a random technology you haven\'t researched yet. Saves multiple turns of research.',
  og_holder: 'A loyal supporter appears! A free military unit spawns at your nearest settlement.',
  community_growth: 'Your capital gains +3 population, unlocking more tiles and production capacity.',
  scout: 'Intel gathered! Reveals a large 5-hex radius area of the map, exposing terrain and enemies.',
}

export function LootboxRewardPopup({
  reward,
  onDismiss,
}: LootboxRewardPopupProps): JSX.Element {
  const rewardName = REWARD_NAMES[reward.reward] ?? 'Mystery Reward'
  const rewardIcon = REWARD_ICONS[reward.reward] ?? '\u{1F381}' // gift box
  const rewardDescription = REWARD_DESCRIPTIONS[reward.reward] ?? 'A mysterious reward from the lootbox.'

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
          minWidth: '360px',
          maxWidth: '420px',
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '1px solid #333',
          animation: 'popIn 0.3s ease-out',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)',
            borderBottom: '1px solid #333',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>
            {'\u{1F381}'}
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#d946ef',
            }}
          >
            Lootbox Opened!
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Reward type */}
          <Tooltip
            content={rewardDescription}
            position="below"
            width={220}
          >
            <div
              style={{
                fontSize: '22px',
                fontWeight: 'bold',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'help',
              }}
            >
              <span style={{ fontSize: '28px' }}>{rewardIcon}</span>
              <span style={{ borderBottom: '1px dotted #666' }}>{rewardName}</span>
            </div>
          </Tooltip>

          {/* Reward details */}
          <div
            style={{
              fontSize: '14px',
              color: '#888',
              marginBottom: '24px',
              lineHeight: 1.5,
            }}
          >
            {reward.details}
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            style={{
              background: 'linear-gradient(180deg, #d946ef 0%, #a855f7 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 40px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Collect
          </button>
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes popIn {
          0% {
            transform: scale(0.9);
            opacity: 0;
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
