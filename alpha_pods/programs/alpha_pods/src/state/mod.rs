use std::collections::HashMap;
use anchor_lang::prelude::*;
use anchor_lang::{account, Accounts};
#[account]
#[derive(InitSpace)]
pub struct   InitializeAdmin{
  pub threshold:u64,
  #[max_len(50)]
  pub members:Vec<Member>,
  pub admin:Pubkey,
  pub bump:u8
}
#[derive(InitSpace,Clone)]
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
