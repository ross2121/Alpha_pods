use anchor_lang::{ prelude::*, solana_program::native_token::LAMPORTS_PER_SOL, system_program::{transfer, Transfer}};
use anchor_spl::{associated_token::AssociatedToken, token::{ transfer_checked, Mint, Token, TokenAccount, TransferChecked}};

use crate::{ InitializeAdmin};
#[derive(Accounts)]
//send sol to escrow where the depositer should allow 
// not token only sol
// sol shouldnt be capture inside the struct
// It should hold the amount  you want to capture
//
pub struct Deposit<'info> {
    #[account(mut)]
    pub member:Signer<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump=escrow.bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    #[account(mut,associated_token::mint=minta,associated_token::authority=member,associated_token::token_program=token_program)]
    pub member_minta:Account<'info,TokenAccount>,
    #[account(mut,associated_token::mint=mintb,associated_token::authority=member,associated_token::token_program=token_program)]
    pub member_mintb:Account<'info,TokenAccount>,
    pub minta:Account<'info,Mint>,
    pub mintb:Account<'info,Mint>,
    #[account(init,payer=member,associated_token::mint=minta,associated_token::authority=escrow,associated_token::token_program=token_program)]
    pub vaulta:Account<'info,TokenAccount>,
    #[account(init,payer=member,associated_token::mint=mintb,associated_token::authority=escrow,associated_token::token_program=token_program)]
    pub vaultb:Account<'info,TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program:Program<'info,Token>,
    pub associated_token_program:Program<'info,AssociatedToken>,
}
impl <'info> Deposit <'info>{
    pub fn deposit(&mut self,amount:u64)->Result<()>{
     let transfer=TransferChecked{
        from:self.member_minta.to_account_info(),
        to:self.vaulta.to_account_info(),
        mint:self.minta.to_account_info(),
        authority:self.member.to_account_info()
     };
       let cpi_ctx=CpiContext::new(self.token_program.to_account_info(), transfer);
      transfer_checked(cpi_ctx, amount, self.minta.decimals)?;
       Ok(())
    }
}