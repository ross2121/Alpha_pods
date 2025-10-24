use anchor_lang::{ prelude::*};
use anchor_spl::{ token::{ transfer_checked, Mint, TokenAccount, TransferChecked}};
use crate::{ InitializeAdmin};
#[derive(Accounts)]
//send sol to escrow where the depositer should allow 
// not token only sol
// sol shouldnt be capture inside the struct
// It should hold the amount  you want to capture
//
pub struct DepositMint<'info> {
  
    #[account(mut)]
    pub member:Signer<'info>,
    #[account(mut)]
    pub mint:Account<'info,Mint>,
    #[account(mut,associated_token::mint=mint,associated_token::authority=member)]
    pub member_ata:Account<'info,TokenAccount>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    #[account(mut,associated_token::mint=mint,associated_token::authority=escrow)]
    pub vault:Account<'info,TokenAccount>,
    pub system_program: Program<'info, System>,

}
impl <'info> DepositMint <'info>{
    pub fn trade(&mut self,amount:u64)->Result<()>{
       let account= TransferChecked{
            from:self.member_ata.to_account_info(),
            to:self.vault.to_account_info(),
            mint:self.mint.to_account_info(),
            authority:self.escrow.to_account_info() 
        }; 
       let cpi_ctx=CpiContext::new(self.system_program.to_account_info(),account);
      transfer_checked(cpi_ctx, amount, self.mint.decimals)?;
      Ok(())
    }
}