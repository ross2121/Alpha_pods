use crate::{InitializeAdmin, dlmm};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct DlmmSwap<'info> {
    #[account(mut)]
    /// CHECK: The pool account
    pub lb_pair: UncheckedAccount<'info>,
    #[account(mut,associated_token::mint=token_x_mint,associated_token::authority=escrow,associated_token::token_program=token_program)]
    pub vaulta:Account<'info,TokenAccount>,
    #[account(mut,associated_token::mint=token_y_mint,associated_token::authority=escrow,associated_token::token_program=token_program)]
    pub vaultb:Account<'info,TokenAccount>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump=escrow.bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    /// CHECK: Bin array extension account of the pool
    pub bin_array_bitmap_extension: Option<UncheckedAccount<'info>>,

    #[account(mut)]
    /// CHECK: Reserve account of token X
    pub reserve_x: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Reserve account of token Y
    pub reserve_y: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: User token account to sell token
    pub user_token_in: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: User token account to buy token
    pub user_token_out: UncheckedAccount<'info>,

    /// CHECK: Mint account of token X
    pub token_x_mint: UncheckedAccount<'info>,
    /// CHECK: Mint account of token Y
    pub token_y_mint: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Oracle account of the pool
    pub oracle: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Referral fee account
    pub host_fee_in: Option<UncheckedAccount<'info>>,

    // /// CHECK: User who's executing the swap
    // pub user: Signer<'info>,

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


impl<'info> DlmmSwap<'info>{
pub fn handle_dlmm_swap(
      &mut self,
      remaining_accounts: &[AccountInfo<'info>],
    amount_in: u64,
    min_amount_out: u64,
) -> Result<()> {
    let accounts = dlmm::cpi::accounts::Swap {
        lb_pair: self.lb_pair.to_account_info(),
        bin_array_bitmap_extension: self
            .bin_array_bitmap_extension
            .as_ref()
            .map(|account| account.to_account_info()),
        reserve_x: self.reserve_x.to_account_info(),
        reserve_y:self.reserve_y.to_account_info(),
        user_token_in: self.vaulta.to_account_info(),
        user_token_out: self.vaultb.to_account_info(),
        token_x_mint:self.token_x_mint.to_account_info(),
        token_y_mint: self.token_y_mint.to_account_info(),
        oracle: self.oracle.to_account_info(),
        host_fee_in: self
            .host_fee_in
            .as_ref()
            .map(|account| account.to_account_info()),
        user: self.escrow.to_account_info(),
        token_x_program:self.token_x_program.to_account_info(),
        token_y_program: self.token_y_program.to_account_info(),
        event_authority: self.event_authority.to_account_info(),
        program: self.dlmm_program.to_account_info(),
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


    let cpi_context = CpiContext::new_with_signer(self.dlmm_program.to_account_info(), accounts,signer_seeds)
        .with_remaining_accounts(remaining_accounts.to_vec());
    dlmm::cpi::swap(cpi_context, amount_in, min_amount_out)
}
}