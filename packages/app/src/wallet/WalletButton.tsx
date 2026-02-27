// Wallet connect/disconnect button styled for the game theme

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

interface WalletButtonProps {
  style?: React.CSSProperties
}

export function WalletButton({ style }: WalletButtonProps): JSX.Element {
  return (
    <div
      style={{
        // Override wallet adapter styles to match game theme
        ...style,
      }}
      className="tribes-wallet-button"
    >
      <style>{`
        .tribes-wallet-button .wallet-adapter-button {
          max-width: 160px !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
        }
      `}</style>
      <WalletMultiButton
        style={{
          backgroundColor: '#2a2a4a',
          border: '1px solid #4a4a8a',
          borderRadius: '8px',
          fontSize: '13px',
          height: '36px',
          padding: '0 16px',
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
}
