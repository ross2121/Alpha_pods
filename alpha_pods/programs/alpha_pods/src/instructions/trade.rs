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
impl <'info> Initialize <'info>{
    pub fn initialize(&mut self,ctx:Context<Initialize>,admin:Pubkey,approval:Vec<Approval>){
           self.account.set_inner(Initializeadmin{
            admin:admin
           });

    }
}