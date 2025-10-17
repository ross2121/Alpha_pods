

use anchor_lang::{prelude::*};

use crate::{ InitializeAdmin, Member};
#[derive(Accounts)]
pub struct AddMember<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    pub system_program: Program<'info, System>,
}
impl <'info> AddMember <'info>{
    pub fn addmember(&mut self,member:Pubkey)->Result<()>{
        if self.admin.to_account_info().key() != self.escrow.admin {
            return Err(ErrorCode::AccountNotEnoughKeys.into())
        }
    
        self.escrow.members.push(Member { public_key: member, amount:0 });
        Ok(())
    }
}