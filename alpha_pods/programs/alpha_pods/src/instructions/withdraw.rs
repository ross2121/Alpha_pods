use anchor_lang::{prelude::*, solana_program::{native_token::LAMPORTS_PER_SOL, system_instruction::withdraw_nonce_account}, system_program::{transfer, Transfer}};

use crate::{ alpha_error, InitializeAdmin};
#[derive(Accounts)]
pub struct Withdraw<'info> { 
    #[account(mut)]
    pub member: Signer<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump=escrow.bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    
    pub system_program: Program<'info, System>,
}
impl<'info> Withdraw<'info> {
    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
     
        **self.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
         **self.escrow.to_account_info().try_borrow_mut_lamports()?+=amount;
        // let seeds = &[
        //     b"escrow".as_ref(),     
        //     &self.escrow.admin.as_ref(),
        //     &self.escrow.seed.to_le_bytes(),
        //     &[self.escrow.bump]
        // ];

        // let signer_seeds = &[&seeds[..]];
        // let cpi_ctx=CpiContext::new(self.system_program.to_account_info(), tranfer).with_signer(signer_seeds);
        // transfer(cpi_ctx, amount*LAMPORTS_PER_SOL)?;
        Ok(())
    }
}