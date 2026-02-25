// Hook for wallet-aware VRF service

import { useMemo, useRef } from 'react'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { AnchorProvider } from '@coral-xyz/anchor'
import { createVRFService, type VRFService } from '../magicblock/vrf'

/**
 * Returns a VRF service that uses on-chain VRF when a wallet is connected,
 * or falls back to local randomness when no wallet is available.
 */
export function useVRF(): { vrfService: VRFService; isOnChain: boolean } {
  const wallet = useAnchorWallet()
  const { connection } = useConnection()

  const provider = useMemo(() => {
    if (!wallet) return null
    return new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    })
  }, [wallet, connection])

  const vrfService = useMemo(() => createVRFService(provider), [provider])
  const isOnChain = !!provider?.publicKey

  return { vrfService, isOnChain }
}

/**
 * Returns a unique nonce for each VRF request within this session.
 */
export function useVRFNonce(): () => number {
  const nonceRef = useRef(0)
  return () => ++nonceRef.current
}
