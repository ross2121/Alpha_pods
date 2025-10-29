use crate::{dlmm::{self, types::LiquidityParameter}};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    /// CHECK: The pool account
    pub lb_pair: UncheckedAccount<'info>,
    #[account(mut)]
    ///CHECK:POSITION
    pub position:UncheckedAccount<'info>,
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

    /// CHECK: User who's executing the swap
    pub user: Signer<'info>,

    #[account(address = dlmm::ID)]
    /// CHECK: DLMM program
    pub dlmm_program: UncheckedAccount<'info>,

    /// CHECK: DLMM program event authority for event CPI
    pub event_authority: UncheckedAccount<'info>,

    /// CHECK: Token program of mint X
    pub token_x_program: UncheckedAccount<'info>,
    /// CHECK: Token program of mint Y
    pub token_y_program: UncheckedAccount<'info>,
    // Bin arrays need to be passed using remaining accounts via ctx.remaining_accounts
}

impl<'info> AddLiquidity<'info>{
pub fn add_liquidity(
      &mut self,
      remaining_accounts: &[AccountInfo<'info>],
    liqudity_parameter:LiquidityParameter
) -> Result<()> {
    // Extract bin arrays from remaining accounts
    // Expected order: [binArrayLower, binArrayUpper (if different)]
    let bin_array_lower = &remaining_accounts[0];
    let bin_array_upper = if remaining_accounts.len() > 1 {
        &remaining_accounts[1]
    } else {
        &remaining_accounts[0] // Use same if only one provided
    };

    let accounts = dlmm::cpi::accounts::AddLiquidity{
        lb_pair: self.lb_pair.to_account_info(),
        bin_array_bitmap_extension: self
            .bin_array_bitmap_extension
            .as_ref()
            .map(|account| account.to_account_info()),
        reserve_x: self.reserve_x.to_account_info(),
        reserve_y:self.reserve_y.to_account_info(),
        user_token_x: self.user_token_in.to_account_info(),
        user_token_y: self.user_token_out.to_account_info(),
        token_x_mint:self.token_x_mint.to_account_info(),
        token_y_mint: self.token_y_mint.to_account_info(),
        bin_array_lower: bin_array_lower.clone(),
        bin_array_upper: bin_array_upper.clone(),
        position:self.position.to_account_info(),
        sender: self.user.to_account_info(),
        token_x_program:self.token_x_program.to_account_info(),
        token_y_program: self.token_y_program.to_account_info(),
        event_authority: self.event_authority.to_account_info(),
        program: self.dlmm_program.to_account_info(),
    };

    let cpi_context = CpiContext::new(self.dlmm_program.to_account_info(), accounts);
    dlmm::cpi::add_liquidity(cpi_context, liqudity_parameter)
}
}
