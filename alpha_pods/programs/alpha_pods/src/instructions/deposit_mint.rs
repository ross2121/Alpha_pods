use anchor_lang::{accounts::account, prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};
use anchor_spl::{associated_token::AssociatedToken, token::{mint_to, transfer, transfer_checked, Mint, MintTo, Token, TokenAccount, Transfer, TransferChecked}, token_2022::spl_token_2022::extension::cpi_guard::CpiGuard};
use crate::{ InitializeAdmin};
#[derive(Accounts)]
//send sol to escrow where the depositer should allow 
// not token only sol
// sol shouldnt be capture inside the struct
// It should hold the amount  you want to capture
//
pub struct DepositMint<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub member_ata:Signer<'info>,
    #[account(mut)]
    pub mint:Account<'info,Mint>,
    #[account(mut,seeds=[b"escrow",admin.key().as_ref()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    #[account(mut,associated_token::mint=mint,associated_token::authority=escrow)]
    pub vault:Account<'info,TokenAccount>,
    pub system_program: Program<'info, System>,

}
impl <'info> DepositMint <'info>{
    pub fn trade(&mut self,ctx:Context<DepositMint>,amount:u64){
       let account= TransferChecked{
            from:ctx.accounts.member_ata.to_account_info(),
            to:ctx.accounts.vault.to_account_info(),
            mint:ctx.accounts.mint.to_account_info(),
            authority:ctx.accounts.escrow.to_account_info() 
        }; 
       let cpi_ctx=CpiContext::new(ctx.accounts.system_program.to_account_info(),account);
      transfer_checked(cpi_ctx, amount, self.mint.decimals);
    }
}