#![allow(deprecated)]
use anchor_lang::prelude::*;

pub mod instructions;
pub use instructions::*;
pub mod state;
pub use state::*;
declare_id!("FeozaXSwZZexg48Fup4xLZFN2c9nUsSvtHbWz3V3GQuq");

#[program]
pub mod alpha_pods {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, seed: u64, member: Vec<Pubkey>, threshold: u64) -> Result<()> {
        ctx.accounts.initialize(seed, member, threshold);
        Ok(())
    }

    pub fn add_member(ctx: Context<AddMember>, member: Pubkey) -> Result<()> {
        ctx.accounts.addmember(member)?;
        Ok(())
    }

    pub fn remove_member(ctx: Context<RemoveMember>, member: Pubkey) -> Result<()> {
        ctx.accounts.addmember(member)?;
        Ok(())
    }

    pub fn deposit_sol(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.deposit(amount)?;
        Ok(())
    }

    pub fn withdraw_sol(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw(amount)?;
        Ok(())
    }

    pub fn deposit_mint(ctx: Context<DepositMint>, amount: u64) -> Result<()> {
        ctx.accounts.trade(amount)?;
        Ok(())
    }

    pub fn withdraw_mint(ctx: Context<WithdrawMint>, amount: u64) -> Result<()> {
        ctx.accounts.withdrawmint(amount)?;
        Ok(())
    }
}


