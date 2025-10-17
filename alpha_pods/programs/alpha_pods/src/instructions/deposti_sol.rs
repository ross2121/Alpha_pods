use anchor_lang::{ prelude::*, solana_program::native_token::LAMPORTS_PER_SOL, system_program::{transfer, Transfer}};

use crate::{ InitializeAdmin};
#[derive(Accounts)]
//send sol to escrow where the depositer should allow 
// not token only sol
// sol shouldnt be capture inside the struct
// It should hold the amount  you want to capture
//
pub struct Deposit<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub member:Signer<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    pub system_program: Program<'info, System>,

}
impl <'info> Deposit <'info>{
    pub fn deposit(&mut self,amount:u64)->Result<()>{
       let account=Transfer{
        from:self.member.to_account_info(),
        to:self.escrow.to_account_info(),
       };
       let cpi_ctx=CpiContext::new(self.system_program.to_account_info(), account);
       transfer(cpi_ctx, amount *LAMPORTS_PER_SOL)?;
       Ok(())
    }
}