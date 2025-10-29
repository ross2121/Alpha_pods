use crate::dlmm;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeBinArray<'info> {
    /// The LB Pair (pool) account
    #[account(mut)]
        /// CHECK: This is the Meteora DLMM program ID
    pub lb_pair: UncheckedAccount<'info>,


    #[account(mut)]
        /// CHECK: This is the Meteora DLMM program ID
    pub bin_array: UncheckedAccount<'info>,
    
    /// The account paying for bin array creation
    #[account(mut)]
    pub funder: Signer<'info>,

        /// CHECK: This is the Meteora DLMM program ID
    pub system_program:UncheckedAccount<'info>,
    
    /// The Meteora DLMM program
    /// CHECK: This is the Meteora DLMM program ID
    pub dlmm_program: UncheckedAccount<'info>,
}

impl<'info> InitializeBinArray<'info> {
    pub fn init_bin_array(&mut self, index: i64) -> Result<()> {
        // Create the CPI accounts struct
        let accounts = dlmm::cpi::accounts::InitializeBinArray {
            lb_pair: self.lb_pair.to_account_info(),
            bin_array: self.bin_array.to_account_info(),
            funder: self.funder.to_account_info(),
            system_program: self.system_program.to_account_info(),
        };
        let cpi_context = CpiContext::new(
            self.dlmm_program.to_account_info(),
            accounts
        );

       
        dlmm::cpi::initialize_bin_array(cpi_context, index)
    }
}