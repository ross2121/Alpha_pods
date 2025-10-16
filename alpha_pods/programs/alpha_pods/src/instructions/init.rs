

use anchor_lang::{ prelude::*};

use crate::{ InitializeAdmin, Member};
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init,payer=admin,space=InitializeAdmin::INIT_SPACE,seeds=[b"escrow",admin.key().as_ref()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,

    pub system_program: Program<'info, System>,
}
impl <'info> Initialize <'info>{
    pub fn initialize(&mut self,ctx:Context<Initialize>,member:Vec<Pubkey>,threshold:u64){
         let mut member_vec:Vec<Member>=Vec::new();
         for mem in member{
             member_vec.push(Member { public_key: mem, amount: 0 });
         }
           self.escrow.set_inner(InitializeAdmin{
            admin:ctx.accounts.admin.to_account_info().key(),
            bump:ctx.accounts.escrow.bump,
            members:member_vec,
            threshold:threshold
           });
    }
}