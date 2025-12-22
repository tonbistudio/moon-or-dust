// Popup for showing lootbox rewards when claimed

import type { LootboxRewardInfo } from '../context/GameContext'

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

export function LootboxRewardPopup({
  reward,
  onDismiss,
}: LootboxRewardPopupProps): JSX.Element {
  const rewardName = REWARD_NAMES[reward.reward] ?? 'Mystery Reward'
  const rewardIcon = REWARD_ICONS[reward.reward] ?? '\u{1F381}' // gift box

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
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 1000,
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          padding: '32px',
          minWidth: '300px',
          maxWidth: '400px',
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          border: '2px solid #d946ef',
          animation: 'popIn 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lootbox icon */}
        <div
          style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}
        >
          {'\u{1F381}'} {/* gift box */}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#d946ef',
          }}
        >
          Lootbox Opened!
        </div>

        {/* Reward type */}
        <div
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>{rewardIcon}</span>
          <span>{rewardName}</span>
        </div>

        {/* Reward details */}
        <div
          style={{
            fontSize: '14px',
            color: '#9ca3af',
            marginBottom: '24px',
          }}
        >
          {reward.details}
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          style={{
            background: '#d946ef',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 32px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#c026d3')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#d946ef')}
        >
          Collect
        </button>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes popIn {
          0% {
            transform: scale(0.8);
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
