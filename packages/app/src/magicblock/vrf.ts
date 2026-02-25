import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_SLOT_HASHES_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { AnchorProvider, BN } from '@coral-xyz/anchor';
import type { UnitRarity } from '@tribes/game-core';
import {
  VRF_RARITY_PROGRAM_ID,
  VRF_PROGRAM_ID,
  DEFAULT_ORACLE_QUEUE,
  RARITY_SEED,
  RARITY_RESULT_SIZE,
  rarityFromIndex,
  rarityFromRoll,
} from './config';

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

function deriveProgramIdentityPDA(
  programId: PublicKey = VRF_RARITY_PROGRAM_ID,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('identity')],
    programId,
  );
}

// ---------------------------------------------------------------------------
// Anchor discriminator helpers
// ---------------------------------------------------------------------------

async function sha256First8(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash).slice(0, 8);
}

let _rollRarityDisc: Uint8Array | null = null;

async function rollRarityDiscriminator(): Promise<Uint8Array> {
  if (!_rollRarityDisc) {
    _rollRarityDisc = await sha256First8('global:roll_rarity');
  }
  return _rollRarityDisc;
}

// ---------------------------------------------------------------------------
// Account deserialization
// ---------------------------------------------------------------------------

function deserializeRarityResult(data: Buffer): RarityRollResult | null {
  if (data.length < RARITY_RESULT_SIZE) return null;

  const player = new PublicKey(data.slice(8, 40));
  const nonce = new BN(data.slice(40, 48), 'le').toNumber();
  const rarityIdx = data[48] ?? 0;
  const fulfilled = data[49] === 1;
  const rollValue = data[50] ?? 0;

  return {
    player,
    nonce,
    rarity: rarityFromIndex(rarityIdx),
    rollValue,
    fulfilled,
  };
}

// ---------------------------------------------------------------------------
// On-chain VRF service
// ---------------------------------------------------------------------------

export class OnChainVRFService implements VRFService {
  private provider: AnchorProvider;
  private connection: Connection;

  constructor(provider: AnchorProvider) {
    this.provider = provider;
    this.connection = provider.connection;
  }

  async requestRarityRoll(nonce: number): Promise<{
    txSignature: string;
    resultPDA: PublicKey;
  }> {
    const payer = this.provider.publicKey;
    if (!payer) throw new Error('Wallet not connected');

    const [resultPDA] = deriveRarityResultPDA(payer, nonce);
    const [programIdentity] = deriveProgramIdentityPDA();
    const disc = await rollRarityDiscriminator();

    // Instruction data: discriminator (8) + nonce as u64 LE (8)
    const data = Buffer.alloc(16);
    data.set(disc, 0);
    new BN(nonce).toArrayLike(Buffer, 'le', 8).copy(data, 8);

    // Account order must match RollRarityCtx fields + #[vrf]-injected accounts
    const ix = new TransactionInstruction({
      programId: VRF_RARITY_PROGRAM_ID,
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: resultPDA, isSigner: false, isWritable: true },
        { pubkey: DEFAULT_ORACLE_QUEUE, isSigner: false, isWritable: true },
        // Injected by #[vrf] macro:
        { pubkey: programIdentity, isSigner: false, isWritable: false },
        { pubkey: VRF_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_SLOT_HASHES_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const txSignature = await this.provider.sendAndConfirm(tx);

    return { txSignature, resultPDA };
  }

  async getRarityResult(resultPDA: PublicKey): Promise<RarityRollResult | null> {
    const info = await this.connection.getAccountInfo(resultPDA);
    if (!info?.data) return null;

    const result = deserializeRarityResult(Buffer.from(info.data));
    if (!result || !result.fulfilled) return null;
    return result;
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
