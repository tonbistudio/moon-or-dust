use anchor_lang::prelude::*;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

declare_id!("8U41n8DFkJUiyrxzCLpNQyvAAbHfnoD2GvRpCxQxiMaQ");

pub const RARITY_SEED: &[u8] = b"rarity";

#[program]
pub mod vrf_rarity {
    use super::*;

    /// Request a provably-fair rarity roll via MagicBlock VRF.
    /// Creates a PDA to store the result and CPIs into the VRF oracle.
    pub fn roll_rarity(ctx: Context<RollRarityCtx>, nonce: u64) -> Result<()> {
        let result = &mut ctx.accounts.rarity_result;
        result.player = ctx.accounts.payer.key();
        result.nonce = nonce;
        result.rarity = 0;
        result.fulfilled = false;
        result.roll_value = 0;
        result.bump = ctx.bumps.rarity_result;

        // Pad nonce into a 32-byte caller seed
        let mut caller_seed = [0u8; 32];
        caller_seed[..8].copy_from_slice(&nonce.to_le_bytes());

        let ix = create_request_randomness_ix(RequestRandomnessParams {
            payer: ctx.accounts.payer.key(),
            oracle_queue: ctx.accounts.oracle_queue.key(),
            callback_program_id: ID,
            callback_discriminator: instruction::CallbackRollRarity::DISCRIMINATOR.to_vec(),
            caller_seed,
            accounts_metas: Some(vec![SerializableAccountMeta {
                pubkey: ctx.accounts.rarity_result.key(),
                is_signer: false,
                is_writable: true,
            }]),
            ..Default::default()
        });

        ctx.accounts
            .invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;

        Ok(())
    }

    /// Callback invoked by the MagicBlock VRF program with verified randomness.
    /// Maps the random byte to a rarity tier and stores the result in the PDA.
    pub fn callback_roll_rarity(
        ctx: Context<CallbackRollRarityCtx>,
        randomness: [u8; 32],
    ) -> Result<()> {
        // Random value in [0, 99]
        let roll = ephemeral_vrf_sdk::rnd::random_u8_with_range(&randomness, 0, 99);

        // Rarity mapping:
        //   0-49  = Common     (50%)
        //   50-79 = Uncommon   (30%)
        //   80-94 = Rare       (15%)
        //   95-98 = Epic       (4%)
        //   99    = Legendary  (1%)
        let rarity = if roll <= 49 {
            0
        } else if roll <= 79 {
            1
        } else if roll <= 94 {
            2
        } else if roll <= 98 {
            3
        } else {
            4
        };

        msg!("VRF rarity roll: {} -> rarity {}", roll, rarity);

        let result = &mut ctx.accounts.rarity_result;
        result.rarity = rarity;
        result.roll_value = roll;
        result.fulfilled = true;

        Ok(())
    }
}

// ---- Account Contexts ----

#[vrf]
#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct RollRarityCtx<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + RarityResult::INIT_SPACE,
        seeds = [RARITY_SEED, payer.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub rarity_result: Account<'info, RarityResult>,

    /// CHECK: MagicBlock oracle queue
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CallbackRollRarityCtx<'info> {
    /// The VRF program identity PDA — proves this CPI originates from the VRF program
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,

    #[account(mut)]
    pub rarity_result: Account<'info, RarityResult>,
}

// ---- State ----

#[account]
#[derive(InitSpace)]
pub struct RarityResult {
    pub player: Pubkey,  // 32 — wallet that requested the roll
    pub nonce: u64,      //  8 — unique roll identifier
    pub rarity: u8,      //  1 — 0=Common 1=Uncommon 2=Rare 3=Epic 4=Legendary
    pub fulfilled: bool, //  1 — true after VRF callback
    pub roll_value: u8,  //  1 — raw random value [0, 99]
    pub bump: u8,        //  1 — PDA bump seed
}
