use anchor_lang::prelude::*;
use anchor_lang::{account};
#[account]
#[derive(InitSpace)]
pub struct   InitializeAdmin{
  pub threshold:u64,
  #[max_len(50)]
  pub members:Vec<Member>,
  pub admin:Pubkey,
  pub seed:u64,
  pub bump:u8
}
#[derive(InitSpace, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Member {
  pub public_key:Pubkey,
  pub amount:u64
}
#[account]
#[derive(InitSpace)]
pub struct  Approval{
    pub address:Pubkey,
   pub amount:u64
}
