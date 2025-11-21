use crate::{InitializeAdmin, dlmm::{self, types::BinLiquidityReduction}};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
#[derive(Accounts)]
pub struct Removeliquidity<'info> {
    #[account(mut)]
    /// CHECK: The pool account
    pub lb_pair: UncheckedAccount<'info>,

    /// CHECK: Bin array extension account of the pool
    pub bin_array_bitmap_extension: Option<UncheckedAccount<'info>>,
   #[account(mut)]
   ///CHECK:Default
   pub position:UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Reserve account of token X
    pub reserve_x: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Reserve account of token Y
    pub reserve_y: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"escrow", escrow.admin.key().as_ref(), &escrow.seed.to_le_bytes()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, InitializeAdmin>,
    #[account(mut,seeds=[b"vault",escrow.key().as_ref()],bump)]
    /// CHECK: PDA that owns the position
    pub vault: SystemAccount<'info>,
    #[account(mut)]
  /// CHECK: Reserve account of token Y
    pub vaulta:UncheckedAccount<'info>,
    #[account(mut)]
   /// CHECK: Reserve account of token Y
    pub vaultb:UncheckedAccount<'info>,
    /// CHECK: Mint account of token X
    pub token_x_mint: UncheckedAccount<'info>,
    /// CHECK: Mint account of token Y
    pub token_y_mint: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Oracle account of the pool
    pub bin_array_lower: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Referral fee account
    pub bin_array_upper: Option<UncheckedAccount<'info>>,
    #[account(address = dlmm::ID)]
    /// CHECK: DLMM program
    pub dlmm_program: UncheckedAccount<'info>,

    /// CHECK: DLMM program event authority for event CPI
    pub event_authority: UncheckedAccount<'info>,

    /// CHECK: Token program of mint X
    pub token_x_program: UncheckedAccount<'info>,
    /// CHECK: Token program of mint Y
    pub token_y_program: UncheckedAccount<'info>,
    pub token_program:Program<'info,Token>
    // Bin arrays need to be passed using remaining accounts via ctx.remaining_accounts
}

impl<'info> Removeliquidity<'info>{
pub fn remove_liqudity(
      &mut self,
      remaining_accounts: &[AccountInfo<'info>],
      bumps: &RemoveliquidityBumps,
      binreduction:Vec<BinLiquidityReduction>
) -> Result<()> {
    let bin_array_lower_ai = self.bin_array_lower.to_account_info();
    let bin_array_upper_ai = self
        .bin_array_upper
        .as_ref()
        .map(|account| account.to_account_info())
        .unwrap_or_else(|| bin_array_lower_ai.clone());
    let accounts = dlmm::cpi::accounts::RemoveLiquidity {
        lb_pair: self.lb_pair.to_account_info(),
        bin_array_bitmap_extension: self
            .bin_array_bitmap_extension
            .as_ref()
            .map(|account| account.to_account_info()),
        reserve_x: self.reserve_x.to_account_info(),
        reserve_y:self.reserve_y.to_account_info(),
        user_token_x: self.vaulta.to_account_info(),
        user_token_y: self.vaultb.to_account_info(),
        token_x_mint:self.token_x_mint.to_account_info(),
        token_y_mint: self.token_y_mint.to_account_info(),
        sender: self.escrow.to_account_info(),
        token_x_program:self.token_x_program.to_account_info(),
        token_y_program: self.token_y_program.to_account_info(),
        event_authority: self.event_authority.to_account_info(),
        program: self.dlmm_program.to_account_info(),
        bin_array_lower:bin_array_lower_ai,
        bin_array_upper:bin_array_upper_ai,
        position:self.position.to_account_info()
    };
    let admin_key = self.escrow.admin.key();
    let seed_bytes = self.escrow.seed.to_le_bytes();
    let bump = &[self.escrow.bump];
    
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"escrow",
        admin_key.as_ref(),
        &seed_bytes,
        bump,
    ]];
  
    let cpi_context: CpiContext<'_, '_, '_, '_, dlmm::cpi::accounts::RemoveLiquidity<'_>> = CpiContext::new_with_signer(self.dlmm_program.to_account_info(), accounts,signer_seeds)
        .with_remaining_accounts(remaining_accounts.to_vec());
    dlmm::cpi::remove_liquidity(cpi_context, binreduction)
}
}