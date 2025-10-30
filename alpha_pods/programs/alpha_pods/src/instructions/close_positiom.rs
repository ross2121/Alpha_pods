use crate::{InitializeAdmin, dlmm};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ClosePostion<'info> {
    #[account(mut)]
    /// CHECK: The pool account
    pub lb_pair: UncheckedAccount<'info>,

    #[account(mut)]
    ///CHECK:POSITION
    pub bin_array_lower:UncheckedAccount<'info>,
    #[account(mut)]
        ///CHECK:POSITION
    pub rent_reciver:UncheckedAccount<'info>,
    #[account(mut)]
    ///CHECK:POSITON
    pub bin_array_upper:UncheckedAccount<'info>,
    #[account(mut)]
    ///CHECK:tHE pOSTIION
     pub position:UncheckedAccount<'info>,    
     #[account(
        mut,
        seeds = [b"escrow", escrow.admin.key().as_ref(), &escrow.seed.to_le_bytes()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, InitializeAdmin>,
    #[account(mut,seeds=[b"vault",escrow.key().as_ref()],bump)]
    pub vault:SystemAccount<'info>,

    #[account(address = dlmm::ID)]
    /// CHECK: DLMM program
    pub dlmm_program: UncheckedAccount<'info>,

    /// CHECK: DLMM program event authority for event CPI
    pub event_authority: UncheckedAccount<'info>,

}

impl<'info>  ClosePostion <'info>{
pub fn close_positiom(
      &mut self,
     bumps:&ClosePostionBumps
) -> Result<()> {
    let accounts = dlmm::cpi::accounts::ClosePosition{
       lb_pair:self.lb_pair.to_account_info(),
        sender:self.vault.to_account_info(),
        event_authority:self.event_authority.to_account_info(),
        rent_receiver:self.rent_reciver.to_account_info(),
        position:self.position.to_account_info(),
        program:self.dlmm_program.to_account_info(),
        bin_array_lower:self.bin_array_lower.to_account_info(),
        bin_array_upper:self.bin_array_upper.to_account_info()
    };
    let escrow_key = self.escrow.key();
    
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"vault",
        escrow_key.as_ref(),
        &[bumps.vault],
    ]];

    let cpi_context = CpiContext::new_with_signer(self.dlmm_program.to_account_info(), accounts,signer_seeds);
    dlmm::cpi::close_position(cpi_context)
}
}