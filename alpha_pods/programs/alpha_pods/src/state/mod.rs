use std::collections::HashMap;
use anchor_lang::prelude::*;
use anchor_lang::{account, Accounts};
#[account]
#[derive(InitSpace)]
pub struct Initializeadmin{
    pub admin:Pubkey,
}
#[account]
#[derive(InitSpace)]
pub struct   InitTrade{
  #[max_len(50)]
  pub approval:Vec<Approval>,

  pub bump:Pubkey
}
#[account]
#[derive(InitSpace)]
pub struct  Approval{
    pub address:Pubkey,
   pub amount:u64
}