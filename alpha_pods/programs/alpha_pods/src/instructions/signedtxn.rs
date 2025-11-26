use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::Instruction,
    system_program,
};
use crate::{InitializeAdmin, alpha_error};
#[derive(Accounts)]
pub struct Signedtxn<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", escrow.admin.key().as_ref(), &escrow.seed.to_le_bytes()],
        bump=escrow.bump
    )]
    pub escrow: Account<'info, InitializeAdmin>,
    
    #[account(mut)]
    /// CHECK: This is the recipient account
    pub recipient: AccountInfo<'info>,
    
    /// CHECK: This is the Jupiter program
    pub jupiter_program: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

impl<'info> Signedtxn<'info> {
    pub fn signedtxn(&mut self, instruction_data: Vec<u8>) -> Result<()> {
        require!(
            self.admin.key() == self.escrow.admin,
            alpha_error::UnauthorizedAdmin
        );
        let accounts = vec![
            AccountMeta::new(self.escrow.key(), true),  
            AccountMeta::new(self.recipient.key(), false),
            AccountMeta::new_readonly(system_program::ID, false),
        ];
        let ix = Instruction {
            program_id: self.jupiter_program.key(),
            accounts,
            data: instruction_data,
        };
        let seeds = &[
            b"escrow".as_ref(),
            self.escrow.admin.as_ref(),
            &self.escrow.seed.to_le_bytes(),
            &[self.escrow.bump],
        ];
        let signer_seeds: &[&[&[u8]]] = &[&seeds[..]];
        anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &[
                self.escrow.to_account_info(),
                self.recipient.to_account_info(),
                self.system_program.to_account_info(),
                self.jupiter_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        Ok(())
    }
}