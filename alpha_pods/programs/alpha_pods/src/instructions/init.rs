use anchor_lang::{ prelude::*};
use crate::{ InitializeAdmin, Member};
#[derive(Accounts)]
#[instruction(seed:u64)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init,payer=admin,space=InitializeAdmin::INIT_SPACE,seeds=[b"escrow",admin.key().as_ref(),&seed.to_le_bytes()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    pub system_program: Program<'info, System>,
}
impl <'info> Initialize <'info>{
    pub fn initialize(&mut self,seed:u64,member:Vec<Pubkey>){
         let mut member_vec:Vec<Member>=Vec::new();
         for mem in member{
             member_vec.push(Member { public_key: mem, amount: 0 });
         }
           self.escrow.set_inner(InitializeAdmin{
            admin:self.admin.to_account_info().key(),
            bump:self.escrow.bump,
            seed:seed,
           });
    }
}