import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, BN, Program } from '@coral-xyz/anchor';
import type { UnitRarity } from '@tribes/game-core';
import {
  VRF_RARITY_PROGRAM_ID,
  RARITY_SEED,
  rarityFromIndex,
  rarityFromRoll,
} from './config';

// Anchor IDL — provides correct discriminators, account resolution, and
// instruction serialization so we don't have to construct raw instructions.
import vrfRarityIdl from './vrf_rarity.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RarityRollResult {
  player: PublicKey;
  nonce: number;
  rarity: UnitRarity;
  rollValue: number;
  fulfilled: boolean;
}

export interface VRFService {
  /** Request a VRF-backed rarity roll. Returns tx signature and the PDA to poll. */
  requestRarityRoll(nonce: number): Promise<{
    txSignature: string;
    resultPDA: PublicKey;
  }>;

  /** Fetch the current state of a rarity result PDA. Null if not yet fulfilled. */
  getRarityResult(resultPDA: PublicKey): Promise<RarityRollResult | null>;
}

// ---------------------------------------------------------------------------
// PDA derivation
// ---------------------------------------------------------------------------

export function deriveRarityResultPDA(
  player: PublicKey,
  nonce: number,
  programId: PublicKey = VRF_RARITY_PROGRAM_ID,
): [PublicKey, number] {
  const nonceBuf = new BN(nonce).toArrayLike(Buffer, 'le', 8);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(RARITY_SEED), player.toBuffer(), nonceBuf],
    programId,
  );
}

// ---------------------------------------------------------------------------
// On-chain VRF service (Anchor Program-based)
// ---------------------------------------------------------------------------

export class OnChainVRFService implements VRFService {
  private provider: AnchorProvider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private program: Program<any>;

  constructor(provider: AnchorProvider) {
    this.provider = provider;
    // Anchor reads the program address from the IDL's "address" field and
    // auto-resolves accounts with known addresses / PDA seeds.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.program = new Program(vrfRarityIdl as any, provider);
  }

  async requestRarityRoll(nonce: number): Promise<{
    txSignature: string;
    resultPDA: PublicKey;
  }> {
    const payer = this.provider.publicKey;
    if (!payer) throw new Error('Wallet not connected');

    const [resultPDA] = deriveRarityResultPDA(payer, nonce);

    // Anchor auto-resolves all accounts from the IDL:
    //   rarityResult  — PDA derived from seeds [b"rarity", payer, nonce]
    //   oracleQueue   — fixed address in IDL
    //   programIdentity — PDA derived from seeds [b"identity"]
    //   vrfProgram, slotHashes, systemProgram — fixed addresses in IDL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txSignature: string = await (this.program.methods as any)
      .rollRarity(new BN(nonce))
      .accounts({ payer })
      .rpc();

    return { txSignature, resultPDA };
  }

  async getRarityResult(resultPDA: PublicKey): Promise<RarityRollResult | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.program.account as any).rarityResult.fetchNullable(resultPDA);
      if (!result || !result.fulfilled) return null;

      return {
        player: result.player,
        nonce: BN.isBN(result.nonce) ? result.nonce.toNumber() : Number(result.nonce),
        rarity: rarityFromIndex(result.rarity),
        rollValue: result.rollValue,
        fulfilled: result.fulfilled,
      };
    } catch {
      return null;
    }
  }

  /** Poll until the VRF callback fulfills the result (or timeout). */
  async pollForResult(
    resultPDA: PublicKey,
    timeoutMs = 30_000,
    intervalMs = 2_000,
  ): Promise<RarityRollResult> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await this.getRarityResult(resultPDA);
      if (result?.fulfilled) return result;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error('VRF rarity result not fulfilled within timeout');
  }
}

// ---------------------------------------------------------------------------
// Local fallback (no wallet / offline)
// ---------------------------------------------------------------------------

export class LocalVRFService implements VRFService {
  private results = new Map<string, RarityRollResult>();

  async requestRarityRoll(nonce: number): Promise<{
    txSignature: string;
    resultPDA: PublicKey;
  }> {
    const roll = Math.floor(Math.random() * 100);
    const rarity = rarityFromRoll(roll);

    // Deterministic fake PDA so getRarityResult can find it
    const nonceBuf = new BN(nonce).toArrayLike(Buffer, 'le', 8);
    const [resultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('local-vrf'), nonceBuf],
      VRF_RARITY_PROGRAM_ID,
    );

    this.results.set(resultPDA.toBase58(), {
      player: PublicKey.default,
      nonce,
      rarity,
      rollValue: roll,
      fulfilled: true,
    });

    return { txSignature: `local-${nonce}`, resultPDA };
  }

  async getRarityResult(resultPDA: PublicKey): Promise<RarityRollResult | null> {
    return this.results.get(resultPDA.toBase58()) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/** Returns an on-chain VRF service when a wallet is connected, local fallback otherwise. */
export function createVRFService(provider?: AnchorProvider | null): VRFService {
  if (provider?.publicKey) {
    return new OnChainVRFService(provider);
  }
  return new LocalVRFService();
}
