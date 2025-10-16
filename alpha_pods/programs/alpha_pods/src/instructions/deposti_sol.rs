use anchor_lang::{accounts::account, prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};
use anchor_spl::{associated_token::AssociatedToken, token::{mint_to, transfer, transfer_checked, Mint, MintTo, Token, TokenAccount, Transfer}, token_2022::spl_token_2022::extension::cpi_guard::CpiGuard};
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
    #[account(mut,seeds=[b"escrow",admin.key().as_ref()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    pub system_program: Program<'info, System>,

}
impl <'info> Deposit <'info>{
    pub fn trade(&mut self,ctx:Context<Deposit>,amount:u64){
       
       let account=Transfer{
        from:ctx.accounts.member.to_account_info(),
        to:ctx.accounts.escrow.to_account_info(),
        authority:ctx.accounts.system_program.to_account_info()
       };
       let cpi_ctx=CpiContext::new(ctx.accounts.system_program.to_account_info(), account);
       transfer(cpi_ctx, amount *LAMPORTS_PER_SOL);
    }
}