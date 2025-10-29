use crate::dlmm;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializePostion<'info> {
    #[account(mut)]
    /// CHECK: The pool account
    pub lb_pair: UncheckedAccount<'info>,

    #[account(mut)]
    pub owner:Signer<'info>,
    #[account(mut)]
    ///CHECK:tHE pOSTIION
     pub position:Signer<'info>,    
     pub rent: Sysvar<'info, Rent>, 
    /// CHECK: User who's executing the swap
    pub user: Signer<'info>,

    #[account(address = dlmm::ID)]
    /// CHECK: DLMM program
    pub dlmm_program: UncheckedAccount<'info>,

    /// CHECK: DLMM program event authority for event CPI
    pub event_authority: UncheckedAccount<'info>,
    /// CHECK: Token program of mint X
    pub system_program:UncheckedAccount<'info>,
}

/// Executes a DLMM swap
///
/// # Arguments
///
/// * `ctx` - The context containing accounts and programs.
/// * `amount_in` - The amount of input tokens to be swapped.
/// * `min_amount_out` - The minimum amount of output tokens expected a.k.a slippage
///
/// # Returns
///
/// Returns a `Result` indicating success or failure.
impl<'info>  InitializePostion <'info>{
pub fn add_position(
      &mut self,
      lower_bin_id  :i32,
    width: i32,
) -> Result<()> {
    let accounts = dlmm::cpi::accounts::InitializePosition{
       lb_pair:self.lb_pair.to_account_info(),
        owner:self.owner.to_account_info(),
        event_authority:self.event_authority.to_account_info(),
        payer:self.user.to_account_info(),
        position:self.position.to_account_info(),
        program:self.dlmm_program.to_account_info(),
        system_program:self.system_program.to_account_info(),
        rent:self.rent.to_account_info(),
    };

    let cpi_context = CpiContext::new(self.dlmm_program.to_account_info(), accounts);
    dlmm::cpi::initialize_position(cpi_context, lower_bin_id, width)
}
}