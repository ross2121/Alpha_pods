use std::clone;

use anchor_lang::{accounts::account, prelude::*};

use crate::{state::Approval, InitializeAdmin, Member};
#[derive(Accounts)]
pub struct AddMember<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut,seeds=[b"escrow",admin.key().as_ref()],bump=escrow.bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    pub system_program: Program<'info, System>,
}
impl <'info> AddMember <'info>{
    pub fn addmember(&mut self,ctx:Context<AddMember>,member:Pubkey){
        ctx.accounts.escrow.members.push(Member { public_key: member, amount:0 });
    }
}