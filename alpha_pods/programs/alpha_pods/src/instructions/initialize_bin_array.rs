use crate::{InitializeAdmin, dlmm};
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
    #[account(
        mut,
        seeds = [b"escrow", escrow.admin.key().as_ref(), &escrow.seed.to_le_bytes()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, InitializeAdmin>,

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
            funder: self.escrow.to_account_info(),
            system_program: self.system_program.to_account_info(),
        };
        let admin_key = self.escrow.admin.key();
        let seed_bytes = self.escrow.seed.to_le_bytes();
        let bump = &[self.escrow.bump];
        
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            admin_key.as_ref(),
            &seed_bytes,
            bump,
        ]];
        let cpi_context = CpiContext::new_with_signer(
            self.dlmm_program.to_account_info(),
            accounts,signer_seeds
        );

       
        dlmm::cpi::initialize_bin_array(cpi_context, index)
    }
}