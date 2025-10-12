use anchor_lang::{accounts::account, prelude::*};

use crate::{state::{Approval,InitTrade}, Initializeadmin};
#[derive(Accounts)]
pub struct InitializeTrade<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    pub account:Account<'info,Initializeadmin>,
   #[account(init,seeds=[b"trade",account.key().as_ref()],bump,payer=admin,space=8+InitTrade::INIT_SPACE)]
    pub account_approve_vec:Account<'info,InitTrade>,

    pub system_program: Program<'info, System>,
}
impl <'info> InitializeTrade <'info>{
    pub fn initialize(&mut self,ctx:Context<InitializeTrade>,approval:Vec<Approval>){
           self.account_approve_vec.set_inner(InitTrade{
              approval:approval,
              bump:self.account_approve_vec.bump
           });

    }
}