use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, MintTo, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("SoLBoMb1111111111111111111111111111111111111");

const VIRTUAL_SOL_RESERVES: u64 = 30_000_000_000;
const GRADUATION_SOL: u64 = 85_000_000_000;
const TOTAL_SUPPLY: u64 = 1_000_000_000_000_000;
const BPS_DENOMINATOR: u64 = 10_000;

#[error_code]
pub enum SolBombError {
    #[msg("Slippage exceeded")]
    SlippageExceeded,
    #[msg("Already graduated")]
    AlreadyGraduated,
    #[msg("Insufficient SOL")]
    InsufficientSol,
    #[msg("Insufficient tokens")]
    InsufficientTokens,
    #[msg("Invalid fee")]
    InvalidFee,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Overflow")]
    Overflow,
    #[msg("Zero amount")]
    ZeroAmount,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub fee_receiver: Pubkey,
    pub fee_bps: u64,
    pub graduation_sol: u64,
    pub total_launched: u64,
    pub total_volume: u64,
    pub bump: u8,
}

#[account]
pub struct BondingCurve {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub virtual_sol: u64,
    pub virtual_tokens: u64,
    pub real_sol: u64,
    pub real_tokens: u64,
    pub total_supply: u64,
    pub graduated: bool,
    pub created_at: i64,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub curve_bump: u8,
    pub token_vault_bump: u8,
    pub sol_vault_bump: u8,
}

#[program]
pub mod solbomb {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, fee_bps: u64) -> Result<()> {
        require!(fee_bps <= 1000, SolBombError::InvalidFee);
        let c = &mut ctx.accounts.config;
        c.admin = ctx.accounts.admin.key();
        c.fee_receiver = ctx.accounts.fee_receiver.key();
        c.fee_bps = fee_bps;
        c.graduation_sol = GRADUATION_SOL;
        c.total_launched = 0;
        c.total_volume = 0;
        c.bump = ctx.bumps.config;
        msg!("SolBomb initialized");
        Ok(())
    }

    pub fn create(ctx: Context<Create>, name: String, symbol: String, uri: String) -> Result<()> {
        let clock = Clock::get()?;
        let curve = &mut ctx.accounts.bonding_curve;

        curve.mint = ctx.accounts.mint.key();
        curve.creator = ctx.accounts.creator.key();
        curve.virtual_sol = VIRTUAL_SOL_RESERVES;
        curve.virtual_tokens = TOTAL_SUPPLY;
        curve.real_sol = 0;
        curve.real_tokens = 0;
        curve.total_supply = TOTAL_SUPPLY;
        curve.graduated = false;
        curve.created_at = clock.unix_timestamp;
        curve.name = name.clone();
        curve.symbol = symbol.clone();
        curve.uri = uri;
        curve.curve_bump = ctx.bumps.bonding_curve;
        curve.token_vault_bump = ctx.bumps.token_vault;
        curve.sol_vault_bump = ctx.bumps.sol_vault;

        // Mint all tokens to token vault
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[b"token_vault".as_ref(), mint_key.as_ref(), &[ctx.bumps.token_vault]];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.token_vault.to_account_info(),
                },
                signer,
            ),
            TOTAL_SUPPLY,
        )?;

        ctx.accounts.config.total_launched = ctx.accounts.config.total_launched
            .checked_add(1).ok_or(SolBombError::Overflow)?;

        msg!("Created: {} ({})", name, symbol);
        Ok(())
    }

    pub fn buy(ctx: Context<Buy>, sol_amount: u64, min_tokens: u64) -> Result<()> {
        require!(sol_amount > 0, SolBombError::ZeroAmount);
        let curve = &mut ctx.accounts.bonding_curve;
        require!(!curve.graduated, SolBombError::AlreadyGraduated);

        let fee_bps = ctx.accounts.config.fee_bps;
        let grad_sol = ctx.accounts.config.graduation_sol;

        // Fee calculation
        let fee = sol_amount.checked_mul(fee_bps).ok_or(SolBombError::Overflow)?
            .checked_div(BPS_DENOMINATOR).ok_or(SolBombError::Overflow)?;
        let sol_net = sol_amount.checked_sub(fee).ok_or(SolBombError::Overflow)?;

        // AMM: tokens_out = token_reserves * sol_net / (sol_reserves + sol_net)
        let sol_reserves = curve.virtual_sol.checked_add(curve.real_sol).ok_or(SolBombError::Overflow)?;
        let token_reserves = curve.virtual_tokens.checked_sub(curve.real_tokens).ok_or(SolBombError::Overflow)?;

        let tokens_out = (token_reserves as u128)
            .checked_mul(sol_net as u128).ok_or(SolBombError::Overflow)?
            .checked_div((sol_reserves as u128).checked_add(sol_net as u128).ok_or(SolBombError::Overflow)?)
            .ok_or(SolBombError::Overflow)? as u64;

        require!(tokens_out >= min_tokens, SolBombError::SlippageExceeded);
        require!(tokens_out > 0, SolBombError::InsufficientTokens);

        // SOL: buyer → sol_vault
        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.sol_vault.key(),
                sol_net,
            ),
            &[ctx.accounts.buyer.to_account_info(), ctx.accounts.sol_vault.to_account_info(), ctx.accounts.system_program.to_account_info()],
        )?;

        // Fee: buyer → fee_receiver
        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.buyer.key(),
                &ctx.accounts.fee_receiver.key(),
                fee,
            ),
            &[ctx.accounts.buyer.to_account_info(), ctx.accounts.fee_receiver.to_account_info(), ctx.accounts.system_program.to_account_info()],
        )?;

        // Tokens: token_vault → buyer
        let mint_key = curve.mint;
        let tvb = curve.token_vault_bump;
        let seeds = &[b"token_vault".as_ref(), mint_key.as_ref(), &[tvb]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.buyer_ata.to_account_info(),
                    authority: ctx.accounts.token_vault.to_account_info(),
                },
                signer,
            ),
            tokens_out,
        )?;

        curve.real_sol = curve.real_sol.checked_add(sol_net).ok_or(SolBombError::Overflow)?;
        curve.real_tokens = curve.real_tokens.checked_add(tokens_out).ok_or(SolBombError::Overflow)?;
        ctx.accounts.config.total_volume = ctx.accounts.config.total_volume
            .checked_add(sol_amount).ok_or(SolBombError::Overflow)?;

        msg!("Buy: {} sol → {} tokens", sol_amount, tokens_out);

        if curve.real_sol >= grad_sol {
            curve.graduated = true;
            msg!("GRADUATED!");
        }
        Ok(())
    }

    pub fn sell(ctx: Context<Sell>, token_amount: u64, min_sol: u64) -> Result<()> {
        require!(token_amount > 0, SolBombError::ZeroAmount);
        let curve = &mut ctx.accounts.bonding_curve;
        require!(!curve.graduated, SolBombError::AlreadyGraduated);

        let fee_bps = ctx.accounts.config.fee_bps;

        // AMM: sol_out = real_sol * tokens / (token_reserves + tokens)
        let token_reserves = curve.virtual_tokens
            .checked_sub(curve.real_tokens).ok_or(SolBombError::Overflow)?
            .checked_add(token_amount).ok_or(SolBombError::Overflow)?;

        let sol_gross = (curve.real_sol as u128)
            .checked_mul(token_amount as u128).ok_or(SolBombError::Overflow)?
            .checked_div(token_reserves as u128).ok_or(SolBombError::Overflow)? as u64;

        let fee = sol_gross.checked_mul(fee_bps).ok_or(SolBombError::Overflow)?
            .checked_div(BPS_DENOMINATOR).ok_or(SolBombError::Overflow)?;
        let sol_out = sol_gross.checked_sub(fee).ok_or(SolBombError::Overflow)?;

        require!(sol_out >= min_sol, SolBombError::SlippageExceeded);
        require!(sol_out > 0, SolBombError::InsufficientSol);
        require!(sol_out <= curve.real_sol, SolBombError::InsufficientSol);

        // Tokens: seller → token_vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.seller_ata.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            token_amount,
        )?;

        // SOL: sol_vault → seller
        **ctx.accounts.sol_vault.try_borrow_mut_lamports()? -= sol_out;
        **ctx.accounts.seller.try_borrow_mut_lamports()? += sol_out;

        // Fee: sol_vault → fee_receiver
        **ctx.accounts.sol_vault.try_borrow_mut_lamports()? -= fee;
        **ctx.accounts.fee_receiver.try_borrow_mut_lamports()? += fee;

        curve.real_sol = curve.real_sol.checked_sub(sol_gross).ok_or(SolBombError::Overflow)?;
        curve.real_tokens = curve.real_tokens.checked_sub(token_amount).ok_or(SolBombError::Overflow)?;
        ctx.accounts.config.total_volume = ctx.accounts.config.total_volume
            .checked_add(sol_gross).ok_or(SolBombError::Overflow)?;

        msg!("Sell: {} tokens → {} sol", token_amount, sol_out);
        Ok(())
    }

    pub fn update_config(ctx: Context<UpdateConfig>, new_fee_bps: u64) -> Result<()> {
        require!(ctx.accounts.admin.key() == ctx.accounts.config.admin, SolBombError::Unauthorized);
        require!(new_fee_bps <= 1000, SolBombError::InvalidFee);
        ctx.accounts.config.fee_bps = new_fee_bps;
        Ok(())
    }
}

// ── Account Structs ────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8+32+32+8+8+8+8+1, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: fee receiver
    pub fee_receiver: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct Create<'info> {
    #[account(
        init, payer = creator,
        space = 8+32+32+8+8+8+8+8+1+8+4+64+4+16+4+200+1+1+1,
        seeds = [b"curve", mint.key().as_ref()], bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// Token vault — holds all 1B tokens
    #[account(
        init, payer = creator,
        associated_token::mint = mint,
        associated_token::authority = token_vault,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// SOL vault — holds real SOL from buys
    /// CHECK: PDA for holding SOL
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut, seeds = [b"curve", bonding_curve.mint.as_ref()], bump = bonding_curve.curve_bump)]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// CHECK: token vault PDA
    #[account(mut, seeds = [b"token_vault", mint.key().as_ref()], bump = bonding_curve.token_vault_bump)]
    pub token_vault: AccountInfo<'info>,

    /// CHECK: sol vault PDA
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump = bonding_curve.sol_vault_bump)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(init_if_needed, payer = buyer, associated_token::mint = mint, associated_token::authority = buyer)]
    pub buyer_ata: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// CHECK: fee receiver
    #[account(mut, address = config.fee_receiver)]
    pub fee_receiver: AccountInfo<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Sell<'info> {
    #[account(mut, seeds = [b"curve", bonding_curve.mint.as_ref()], bump = bonding_curve.curve_bump)]
    pub bonding_curve: Account<'info, BondingCurve>,

    /// CHECK: token vault PDA
    #[account(mut, seeds = [b"token_vault", mint.key().as_ref()], bump = bonding_curve.token_vault_bump)]
    pub token_vault: AccountInfo<'info>,

    /// CHECK: sol vault PDA
    #[account(mut, seeds = [b"sol_vault", mint.key().as_ref()], bump = bonding_curve.sol_vault_bump)]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut, associated_token::mint = mint, associated_token::authority = seller)]
    pub seller_ata: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    /// CHECK: fee receiver
    #[account(mut, address = config.fee_receiver)]
    pub fee_receiver: AccountInfo<'info>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
}
