use anchor_lang::{ prelude::*, solana_program::native_token::LAMPORTS_PER_SOL, system_program::{Transfer, transfer}};
use crate::InitializeAdmin;
#[derive(Accounts)]
//
pub struct Withdraw<'info> {
    #[account(mut)]
    pub member:Signer<'info>,
    #[account(mut,seeds=[b"vault",escrow.key().as_ref()],bump)]
    pub vault:SystemAccount<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    pub system_program: Program<'info, System>,

}
impl <'info> Withdraw<'info>{
    pub fn withdraw(&mut self, amount: u64, bumps: &WithdrawBumps) -> Result<()> {
       let account = Transfer {
            from: self.vault.to_account_info(),
            to: self.member.to_account_info(),
        }; 
        let escrow_key = self.escrow.key();
    
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault",
            escrow_key.as_ref(),
            &[bumps.vault],
        ]];
       let cpi_ctx = CpiContext::new_with_signer(
           self.system_program.to_account_info(),
           account,
           signer_seeds
       );
      // Amount is already in lamports from JavaScript
      transfer(cpi_ctx, amount)?;
      Ok(())
    }
}