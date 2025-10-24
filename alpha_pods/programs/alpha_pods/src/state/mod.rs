use anchor_lang::prelude::*;
use anchor_lang::{account};
#[account]
#[derive(InitSpace)]
pub struct   InitializeAdmin{
  
 
  pub admin:Pubkey,
  pub seed:u64,
  pub bump:u8
}


#[account]
#[derive(InitSpace)]
pub struct  Approval{
    pub address:Pubkey,
   pub amount:u64
}
