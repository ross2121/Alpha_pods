// use anchor_lang::{accounts::account, prelude::*};
// use anchor_spl::{associated_token::AssociatedToken, token::{mint_to, transfer, transfer_checked, Mint, MintTo, Token, TokenAccount, Transfer}};

// use crate::{state::Approval, InitializeAdmin};
// #[derive(Accounts)]
// pub struct Deposit<'info> {
//     #[account(mut)]
//     pub admin: Signer<'info>,
//     #[account(mut)]
//     pub member:Account<'info>,
//     #[account(mut,seeds=[b"escrow",admin.key().as_ref()],bump)]
//     pub escrow:Account<'info,InitializeAdmin>,
//     pub system_program: Program<'info, System>,

// }
// impl <'info> Trade <'info>{
//     pub fn trade(&mut self,ctx:Context<Trade>){
            
//     }
// }