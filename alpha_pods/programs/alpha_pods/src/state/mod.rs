use std::collections::HashMap;
use anchor_lang::prelude::*;
use anchor_lang::{account, Accounts};
#[account]
#[derive(InitSpace)]
pub struct   InitializeAdmin{
  pub threshold:u64,
  pub member:u64,
  pub admin:Pubkey,
  pub bump:u8
}
#[account]
#[derive(InitSpace)]
pub struct  Approval{
    pub address:Pubkey,
   pub amount:u64
}
