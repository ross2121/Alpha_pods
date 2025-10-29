use anchor_lang::{ prelude::*};
use crate::{ InitializeAdmin};
#[derive(Accounts)]
#[instruction(seed:u64)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub creator:Signer<'info>,
    #[account(init,payer=creator,space=8+InitializeAdmin::INIT_SPACE,seeds=[b"escrow",admin.key().as_ref(),&seed.to_le_bytes()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    /// CHECK: This PDA holds SOL for escrow operations
  

    pub system_program: Program<'info, System>,
}
impl <'info> Initialize <'info>{
    pub fn initialize(&mut self,seed:u64,bump:InitializeBumps){
           self.escrow.set_inner(InitializeAdmin{
            admin:self.admin.to_account_info().key(),
            bump:bump.escrow,
            seed:seed,
           });
    }
}