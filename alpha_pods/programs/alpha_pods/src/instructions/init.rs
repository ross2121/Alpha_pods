use anchor_lang::{accounts::account, prelude::*};

use crate::{state::Approval, InitializeAdmin};
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub account:Account<'info,InitializeAdmin>,

    pub system_program: Program<'info, System>,
}
impl <'info> Initialize <'info>{
    pub fn initialize(&mut self,ctx:Context<Initialize>,member:u64,threshold:u64){
           self.account.set_inner(InitializeAdmin{
            admin:ctx.accounts.admin.to_account_info().key(),
            bump:ctx.accounts.account.bump,
            member:member,
            threshold:threshold
           });
    }
}