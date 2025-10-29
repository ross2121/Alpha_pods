#![allow(deprecated)]
use anchor_lang::prelude::*;

pub mod instructions;
pub use instructions::*;
pub mod state;

pub use state::*;
pub mod error;
pub use error::*;
declare_id!("FeozaXSwZZexg48Fup4xLZFN2c9nUsSvtHbWz3V3GQuq");
declare_program!(dlmm);

#[program]
pub mod alpha_pods {
    

    use super::*;
    pub fn initialize(ctx: Context<Initialize>, seed: u64) -> Result<()> {
        ctx.accounts.initialize(seed,ctx.bumps);
        Ok(())
    }

    pub fn deposit_sol(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        ctx.accounts.deposit(amount)?;
        Ok(())
    }

    // pub fn withdraw_sol(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    //     ctx.accounts.withdraw(amount)?;
    //     Ok(())
    // }

    pub fn deposit_mint(ctx: Context<DepositMint>, amount: u64) -> Result<()> {
        ctx.accounts.trade(amount)?;
        Ok(())
    }

    pub fn withdraw_mint(ctx: Context<WithdrawMint>, amount: u64) -> Result<()> {
        ctx.accounts.withdrawmint(amount)?;
        Ok(())
    }

    pub fn execute_signed_tx(ctx: Context<Signedtxn>,instruction_data: Vec<u8>) -> Result<()> {
        ctx.accounts.signedtxn(instruction_data)?;
        Ok(())
    }
    pub fn lppool(ctx:Context<LPPOOl>,bin_step:i32,active_bin:u16)->Result<()>{
        ctx.accounts.createpool(bin_step, active_bin)
    }
    pub fn swap<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, DlmmSwap<'info>>,
        amount_in: u64,
        min_amount_out: u64,
    ) -> Result<()> {
        ctx.accounts.handle_dlmm_swap(
            ctx.remaining_accounts, 
            amount_in,
            min_amount_out,
        )
    }
    pub fn add_postion(ctx:Context<InitializePostion>,lower_bin_id:i32,width:i32)->Result<()>{
        ctx.accounts.add_position(lower_bin_id, width)
    }
    pub fn add_liquidity<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, AddLiquidity<'info>>,
        liquidity_parameter:dlmm::types::LiquidityParameter
    ) -> Result<()> {
        ctx.accounts.add_liquidity(ctx.remaining_accounts, liquidity_parameter)
    }
    pub fn add_bin(ctx:Context<InitializeBinArray>,index:i64)->Result<()>{
        ctx.accounts.init_bin_array(index)
        
    }
    pub fn close_position(ctx:Context<ClosePostion>)->Result<()>{
         ctx.accounts.close_positiom()
    }
    pub fn remove_liqudity<'a,'b,'c,'info>(ctx:Context<'a,'b,'c,'info,Removeliquidity<'info>>, binreduction:Vec<dlmm::types::BinLiquidityReduction>)->Result<()>{
        ctx.accounts.remove_liqudity(ctx.remaining_accounts,binreduction)
    }
}


