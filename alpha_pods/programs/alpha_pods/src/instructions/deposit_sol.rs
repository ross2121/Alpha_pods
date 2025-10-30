use anchor_lang::{ prelude::*, solana_program::native_token::LAMPORTS_PER_SOL, system_program::{Transfer, transfer}};
use anchor_spl::{ token::{ transfer_checked, Mint, TokenAccount, TransferChecked}};
use crate::{ InitializeAdmin};
#[derive(Accounts)]
//
pub struct Deposit<'info> {
    #[account(mut)]
    pub member:Signer<'info>,
    #[account(mut,seeds=[b"vault",escrow.key().as_ref()],bump)]
    pub vault:SystemAccount<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    pub system_program: Program<'info, System>,

}
impl <'info> Deposit <'info>{
    pub fn deposit(&mut self,amount:u64)->Result<()>{
       let account= Transfer{
            from:self.member.to_account_info(),
            to:self.vault.to_account_info(),
        }; 
       let cpi_ctx=CpiContext::new(self.system_program.to_account_info(),account);
      // Amount is already in lamports from JavaScript
      transfer(cpi_ctx, amount)?;
      Ok(())
    }
}