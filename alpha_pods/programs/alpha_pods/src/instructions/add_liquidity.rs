        use crate::{InitializeAdmin, dlmm::{self, cpi, types::{LiquidityParameter, LiquidityParameterByStrategy}}};
        use anchor_lang::prelude::*;
        use anchor_spl::{associated_token::{AssociatedToken, Create, create}, token::{Token, TokenAccount}};
        #[derive(Accounts)]
        pub struct AddLiquidity<'info> {
            #[account(mut)]
            /// CHECK: The pool account
            pub lb_pair: UncheckedAccount<'info>,
            #[account(mut)]
            ///CHECK:POSITION
            pub position:UncheckedAccount<'info>,
            /// CHECK: Bin array extension account of the pool
            pub bin_array_bitmap_extension: Option<UncheckedAccount<'info>>,
            #[account(
                mut,
                seeds = [b"escrow", escrow.admin.key().as_ref(), &escrow.seed.to_le_bytes()],
                bump = escrow.bump
            )]
            pub escrow: Account<'info, InitializeAdmin>,
            #[account(mut)]
            /// CHECK: Reserve account of token X
            pub reserve_x: UncheckedAccount<'info>,
            #[account(mut)]
            /// CHECK: Reserve account of token Y
            pub reserve_y: UncheckedAccount<'info>,
            #[account(mut)]
            /// CHECK: Lower bin array account
            pub bin_array_lower: UncheckedAccount<'info>,
            #[account(mut)]
            /// CHECK: Upper bin array account
            pub bin_array_upper: Option<UncheckedAccount<'info>>,
            #[account(mut,seeds=[b"vault",escrow.key().as_ref()],bump)]
            /// CHECK: PDA that owns the position
            pub vault: SystemAccount<'info>,
            #[account(mut)]
            /// CHECK: PDA that owns the position
            pub vaulta:UncheckedAccount<'info>,
            #[account(mut)]
            /// CHECK: PDA that owns the position
            pub vaultb:UncheckedAccount<'info>,
            /// CHECK: Mint account of token X
            pub token_x_mint: UncheckedAccount<'info>,
            /// CHECK: Mint account of token Y
            pub token_y_mint: UncheckedAccount<'info>,
            #[account(address = dlmm::ID)]
            /// CHECK: DLMM program
            pub dlmm_program: UncheckedAccount<'info>,
            /// CHECK: DLMM program event authority for event CPI
            pub event_authority: UncheckedAccount<'info>,
            /// CHECK: Token program of mint X
            pub token_x_program: UncheckedAccount<'info>,
            /// CHECK: Token program of mint Y
            pub token_y_program: UncheckedAccount<'info>,
            pub token_program:Program<'info,Token>,
            pub system_program:Program<'info,System>,
            pub associated_token_program:Program<'info,AssociatedToken>
        }
        impl<'info> AddLiquidity<'info>{
        pub fn add_liquidity(
            &mut self,
            remaining_accounts: &[AccountInfo<'info>],
            bumps:&AddLiquidityBumps,
            liqudity_parameter:LiquidityParameter
        ) -> Result<()> {
            let native_mint = anchor_spl::token::spl_token::native_mint::ID;
            let key=self.escrow.key();
                let signer_seeds: &[&[&[u8]]] = &[&[
                    b"vault",
                    key.as_ref(),
                    &[bumps.vault],
                ]];
            let is_token_x_sol = self.token_x_mint.key() == native_mint;
            let is_token_y_sol = self.token_y_mint.key() == native_mint;
            let amount_in = if is_token_x_sol { 
                liqudity_parameter.amount_x 
            } else { 
                liqudity_parameter.amount_y 
            };
            
            let needs_wrapping = is_token_x_sol || is_token_y_sol;
            if needs_wrapping {
                msg!("Wrapping {} lamports of SOL to WSOL", amount_in);
                let wsol_vault = if is_token_x_sol {
                    &self.vaulta
                } else {
                    &self.vaultb
                };
                let token_program_for_wsol = if is_token_x_sol {
                    &self.token_x_program  
                } else {
                    &self.token_y_program 
                };
                let wsol_mint = if is_token_x_sol {
                    &self.token_x_mint
                } else {
                    &self.token_y_mint
                };
                if wsol_vault.data_is_empty() {
                    msg!("Creating WSOL token account");
                    let cpi_accounts = Create {
                        payer: self.vault.to_account_info(),
                        associated_token: wsol_vault.to_account_info(),
                        authority: self.escrow.to_account_info(),
                        mint: wsol_mint.to_account_info(),
                        system_program: self.system_program.to_account_info(),
                        token_program: token_program_for_wsol.to_account_info(),
                    };
                    create(
                        CpiContext::new_with_signer(
                            self.associated_token_program.to_account_info(),
                            cpi_accounts,
                            signer_seeds
                        )
                    )?;
                }
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
                {
                    let wsol_account_info = wsol_vault.to_account_info();
                    anchor_spl::token::sync_native(CpiContext::new(
                        token_program_for_wsol.to_account_info(),
                        anchor_spl::token::SyncNative {
                            account: wsol_account_info,
                        },
                    ))?;
                } 
                
                msg!("Successfully wrapped {} lamports to WSOL", amount_in);
            }
            if self.vaulta.data_is_empty() && !is_token_x_sol{
                let account=Create{
                    payer:self.vault.to_account_info(),
                    associated_token:self.vaulta.to_account_info(),
                    authority:self.escrow.to_account_info(),
                    mint:self.token_x_mint.to_account_info(),
                    system_program:self.system_program.to_account_info(),
                    token_program:self.token_x_program.to_account_info()
                };
                let cpi_ctx=CpiContext::new_with_signer(self.associated_token_program.to_account_info(), account, signer_seeds);
                create(cpi_ctx)?;
            }   
            if self.vaultb.data_is_empty() && !is_token_y_sol{
                let account=Create{
                    payer:self.vault.to_account_info(),
                    associated_token:self.vaultb.to_account_info(),
                    authority:self.escrow.to_account_info(),
                    mint:self.token_y_mint.to_account_info(),
                    system_program:self.system_program.to_account_info(),
                    token_program:self.token_y_program.to_account_info()
                };
                let cpi_ctx=CpiContext::new_with_signer(self.associated_token_program.to_account_info(), account, signer_seeds);
                create(cpi_ctx)?;
            }
        let bin_array_lower_ai = self.bin_array_lower.to_account_info();
        let bin_array_upper_ai = self
            .bin_array_upper
            .as_ref()
            .map(|account| account.to_account_info())
            .unwrap_or_else(|| bin_array_lower_ai.clone());
            let accounts = dlmm::cpi::accounts::AddLiquidity{
                lb_pair: self.lb_pair.to_account_info(),
                bin_array_bitmap_extension: self
                    .bin_array_bitmap_extension
                    .as_ref()
                    .map(|account| account.to_account_info()),
                reserve_x: self.reserve_x.to_account_info(),
                reserve_y: self.reserve_y.to_account_info(),
                user_token_x: self.vaulta.to_account_info(),
                user_token_y: self.vaultb.to_account_info(),
                token_x_mint: self.token_x_mint.to_account_info(),
                token_y_mint: self.token_y_mint.to_account_info(),
                bin_array_lower:bin_array_lower_ai,
                bin_array_upper:bin_array_upper_ai,
                position: self.position.to_account_info(),
                sender: self.escrow.to_account_info(),
                token_x_program: self.token_x_program.to_account_info(),
                token_y_program: self.token_y_program.to_account_info(),
                event_authority: self.event_authority.to_account_info(),
                program: self.dlmm_program.to_account_info(),
            };
            let escrow_key = self.escrow.key();
            let signer_seeds: &[&[&[u8]]] = &[
                &[
                    b"vault",
                    escrow_key.as_ref(),
                    &[bumps.vault],
                ],
                &[
                    b"escrow",
                    self.escrow.admin.as_ref(),
                    &self.escrow.seed.to_le_bytes(),
                    &[self.escrow.bump],
                ],
            ];

            let cpi_context = CpiContext::new_with_signer(self.dlmm_program.to_account_info(), accounts, signer_seeds)
                .with_remaining_accounts(remaining_accounts.to_vec());
            dlmm::cpi::add_liquidity(cpi_context, liqudity_parameter)
        }
        }
