use crate::{InitializeAdmin, dlmm};
use anchor_lang::{Bump, prelude::*};

#[derive(Accounts)]
pub struct InitializePostion<'info> {
    #[account(mut)]
    /// CHECK: The pool account
    pub lb_pair: UncheckedAccount<'info>,

    #[account(mut)]
    ///CHECK:tHE pOSTIION
     pub position:Signer<'info>,    
     pub rent: Sysvar<'info, Rent>, 
    /// CHECK: User who's executing the swap
    #[account(
        mut,
        seeds = [b"escrow", escrow.admin.key().as_ref(), &escrow.seed.to_le_bytes()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, InitializeAdmin>,
    #[account(mut,seeds=[b"vault",escrow.key().as_ref()],bump)]
   pub vault:SystemAccount<'info>,

    // #[account(mut)]
    // pub  creator:Signer<'info>,
    #[account(address = dlmm::ID)]
    /// CHECK: DLMM program
    pub dlmm_program: UncheckedAccount<'info>,

    /// CHECK: DLMM program event authority for event CPI
    pub event_authority: UncheckedAccount<'info>,
    /// CHECK: Token program of mint X
    pub system_program:Program<'info,System>,
}

impl<'info>  InitializePostion <'info>{
pub fn add_position(
      &mut self,
      lower_bin_id  :i32,
    width: i32,
    bumps: &InitializePostionBumps
) -> Result<()> {
    let accounts = dlmm::cpi::accounts::InitializePosition{
       lb_pair:self.lb_pair.to_account_info(),
        owner:self.vault.to_account_info(),
        event_authority:self.event_authority.to_account_info(),
        payer:self.vault.to_account_info(),
        position:self.position.to_account_info(),
        program:self.dlmm_program.to_account_info(),
        system_program:self.system_program.to_account_info(),
        rent:self.rent.to_account_info(),
    };
 
    let escrow_key = self.escrow.key();
    
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"vault",
        escrow_key.as_ref(),
        &[bumps.vault],
    ]];


    let cpi_context = CpiContext::new_with_signer(self.dlmm_program.to_account_info(), accounts,signer_seeds);
    dlmm::cpi::initialize_position(cpi_context, lower_bin_id, width)
}
}