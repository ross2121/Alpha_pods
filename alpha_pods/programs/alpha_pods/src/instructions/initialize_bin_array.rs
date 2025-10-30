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
    #[account(mut,seeds=[b"vault",escrow.key().as_ref()],bump)]
    pub vault:SystemAccount<'info>,
        /// CHECK: This is the Meteora DLMM program ID
    pub system_program:Program<'info,System>,
    
    /// The Meteora DLMM program
    /// CHECK: This is the Meteora DLMM program ID
    pub dlmm_program: UncheckedAccount<'info>,
}

impl<'info> InitializeBinArray<'info> {
    pub fn init_bin_array(&mut self, index: i64,bumps:&InitializeBinArrayBumps) -> Result<()> {
        // Create the CPI accounts struct
        let accounts = dlmm::cpi::accounts::InitializeBinArray {
            lb_pair: self.lb_pair.to_account_info(),
            bin_array: self.bin_array.to_account_info(),
            funder: self.escrow.to_account_info(),
            system_program: self.system_program.to_account_info(),
        };
        let escrow_key = self.escrow.key();
    
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault",
            escrow_key.as_ref(),
            &[bumps.vault],
        ]];
        let cpi_context = CpiContext::new_with_signer(
            self.dlmm_program.to_account_info(),
            accounts,signer_seeds
        );

       
        dlmm::cpi::initialize_bin_array(cpi_context, index)
    }
}