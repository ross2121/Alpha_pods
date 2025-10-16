use std::clone;

use anchor_lang::{ prelude::*};

use crate::{ InitializeAdmin, Member};
#[derive(Accounts)]
pub struct RemoveMember<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut,seeds=[b"escrow",admin.key().as_ref()],bump=escrow.bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    pub system_program: Program<'info, System>,
}
impl <'info> RemoveMember<'info>{
    pub fn addmember(&mut self,ctx:Context<RemoveMember>,member:Pubkey)->Result<()>{
        if ctx.accounts.admin.to_account_info().key() != ctx.accounts.escrow.admin {
            return Err(ErrorCode::AccountNotEnoughKeys.into())
        }
        ctx.accounts.escrow.members.push(Member { public_key: member, amount:0 });
        Ok(())
    }
}