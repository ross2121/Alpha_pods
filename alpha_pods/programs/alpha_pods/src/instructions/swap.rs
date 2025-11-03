use crate::{InitializeAdmin, dlmm};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;

#[derive(Accounts)]
pub struct DlmmSwap<'info> {
    #[account(mut)]
    /// CHECK: The pool account
    pub lb_pair: UncheckedAccount<'info>,
    #[account(mut,associated_token::mint=token_x_mint,associated_token::authority=escrow,associated_token::token_program=token_program)]
    pub vaulta:Account<'info,TokenAccount>,
    #[account(mut,associated_token::mint=token_y_mint,associated_token::authority=escrow,associated_token::token_program=token_program)]
    pub vaultb:Account<'info,TokenAccount>,
    #[account(mut,seeds=[b"vault",escrow.key().as_ref()],bump)]
    pub vault:SystemAccount<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump=escrow.bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    /// CHECK: Bin array extension account of the pool
    pub bin_array_bitmap_extension: Option<UncheckedAccount<'info>>,
    #[account(mut)]
    /// CHECK: Reserve account of token X
    pub reserve_x: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Reserve account of token Y
    pub reserve_y: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: User token account to sell token
    pub user_token_in: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: User token account to buy token
    pub user_token_out: UncheckedAccount<'info>,

    /// CHECK: Mint account of token X
    pub token_x_mint: UncheckedAccount<'info>,
    /// CHECK: Mint account of token Y
    pub token_y_mint: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Oracle account of the pool
    pub oracle: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Referral fee account
    pub host_fee_in: Option<UncheckedAccount<'info>>,

    #[account(address = dlmm::ID)]
    /// CHECK: DLMM program
    pub dlmm_program: UncheckedAccount<'info>,

    /// CHECK: DLMM program event authority for event CPI
    pub event_authority: UncheckedAccount<'info>,

    /// CHECK: Token program of mint X
    pub token_x_program: UncheckedAccount<'info>,
    /// CHECK: Token program of mint Y
    pub token_y_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    // Bin arrays need to be passed using remaining accounts via ctx.remaining_accounts
}

impl<'info> DlmmSwap<'info> {
   
    pub fn handle_dlmm_swap(
        &mut self,
        remaining_accounts: &[AccountInfo<'info>],
        amount_in: u64,
        min_amount_out: u64,
        bumps:&DlmmSwapBumps
    ) -> Result<()> {
        let native_mint = anchor_spl::token::spl_token::native_mint::ID;
    
        let is_token_x_sol = self.token_x_mint.key() == native_mint;
        let is_token_y_sol = self.token_y_mint.key() == native_mint;
        
        let needs_wrapping = (is_token_x_sol && self.user_token_in.key() == self.vaulta.key()) 
                          || (is_token_y_sol && self.user_token_in.key() == self.vaultb.key());
        
        if needs_wrapping {
            msg!("Wrapping {} lamports of SOL to WSOL", amount_in);
            
            let wsol_vault = if is_token_x_sol && self.user_token_in.key() == self.vaulta.key() {
                &self.vaulta
            } else {
                &self.vaultb
            };
            
            let key=self.escrow.key();
            let signer_seeds: &[&[&[u8]]] = &[&[
                b"vault",
                key.as_ref(),
                &[bumps.vault],
            ]];
    
            anchor_lang::system_program::transfer(
                CpiContext::new_with_signer(
                    self.system_program.to_account_info(),
                    anchor_lang::system_program::Transfer {
                        from: self.vault.to_account_info(),
                        to: wsol_vault.to_account_info(),
                    },
                    signer_seeds
                ),
                amount_in,
            )?;

            anchor_spl::token::sync_native(CpiContext::new(
                self.token_program.to_account_info(),
                anchor_spl::token::SyncNative {
                    account: wsol_vault.to_account_info(),
                },
            ))?;
            
            msg!("Successfully wrapped {} lamports to WSOL", amount_in);
        }
        
        // Now perform the swap
        let accounts = dlmm::cpi::accounts::Swap {
            lb_pair: self.lb_pair.to_account_info(),
            bin_array_bitmap_extension: self
                .bin_array_bitmap_extension
                .as_ref()
                .map(|account| account.to_account_info()),
            reserve_x: self.reserve_x.to_account_info(),
            reserve_y: self.reserve_y.to_account_info(),
            user_token_in: self.user_token_in.to_account_info(),
            user_token_out: self.user_token_out.to_account_info(),
            token_x_mint: self.token_x_mint.to_account_info(),
            token_y_mint: self.token_y_mint.to_account_info(),
            oracle: self.oracle.to_account_info(),
            host_fee_in: self
                .host_fee_in
                .as_ref()
                .map(|account| account.to_account_info()),
            user: self.escrow.to_account_info(),
            token_x_program: self.token_x_program.to_account_info(),
            token_y_program: self.token_y_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.dlmm_program.to_account_info(),
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
            accounts,
            signer_seeds
        ).with_remaining_accounts(remaining_accounts.to_vec());
        
        dlmm::cpi::swap(cpi_context, amount_in, min_amount_out)
    }
}