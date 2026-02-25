import { PublicKey } from '@solana/web3.js';
import type { UnitRarity } from '@tribes/game-core';

// ---------------------------------------------------------------------------
// Program IDs
// ---------------------------------------------------------------------------

/** VRF Rarity program (devnet) */
export const VRF_RARITY_PROGRAM_ID = new PublicKey(
  '8U41n8DFkJUiyrxzCLpNQyvAAbHfnoD2GvRpCxQxiMaQ',
);

/** MagicBlock VRF program (same on devnet & mainnet) */
export const VRF_PROGRAM_ID = new PublicKey(
  'Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz',
);

/** VRF program identity PDA — used to verify callbacks */
export const VRF_PROGRAM_IDENTITY = new PublicKey(
  '9irBy75QS2BN81FUgXuHcjqceJJRuc9oDkAe8TKVvvAw',
);

/** Default oracle queue on Solana L1 */
export const DEFAULT_ORACLE_QUEUE = new PublicKey(
  'Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh',
);

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export const DEVNET_RPC = 'https://api.devnet.solana.com';

// ---------------------------------------------------------------------------
// PDA seeds
// ---------------------------------------------------------------------------

export const RARITY_SEED = 'rarity';

// ---------------------------------------------------------------------------
// Rarity helpers (mirrors on-chain logic)
// ---------------------------------------------------------------------------

const RARITY_INDEX: readonly UnitRarity[] = [
  'common',    // 0
  'uncommon',  // 1
  'rare',      // 2
  'epic',      // 3
  'legendary', // 4
];

/** Convert on-chain u8 index to UnitRarity string */
export function rarityFromIndex(index: number): UnitRarity {
  return RARITY_INDEX[index] ?? 'common';
}

/** Convert a raw roll value [0,99] to UnitRarity (same thresholds as on-chain) */
export function rarityFromRoll(roll: number): UnitRarity {
  if (roll <= 49) return 'common';
  if (roll <= 79) return 'uncommon';
  if (roll <= 94) return 'rare';
  if (roll <= 98) return 'epic';
  return 'legendary';
}

// ---------------------------------------------------------------------------
// Account layout sizes (for rent calculation / deserialization)
// ---------------------------------------------------------------------------

/** RarityResult account: 8 discriminator + 32 + 8 + 1 + 1 + 1 + 1 = 52 bytes */
export const RARITY_RESULT_SIZE = 52;

/** VRF request cost on Solana L1 (~0.0005 SOL) */
export const VRF_REQUEST_COST_LAMPORTS = 500_000;
