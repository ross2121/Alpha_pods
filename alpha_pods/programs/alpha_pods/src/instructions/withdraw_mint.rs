use anchor_lang::{prelude::*};
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};
use crate::{ InitializeAdmin};
#[derive(Accounts)]
pub struct WithdrawMint<'info> { 
     #[account(mut)]
    /// CHECK: Member is only used as the authority for `member_ata` and is not read/written by this program
   pub member:UncheckedAccount<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    #[account(mut,associated_token::mint=mint,associated_token::authority=escrow,associated_token::token_program=token_program)]
    pub vault:Account<'info,TokenAccount>,
    #[account(mut)]
    pub mint:Account<'info,Mint>,
   #[account(mut,associated_token::mint=mint,associated_token::authority=member)]
   pub member_ata:Account<'info,TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program:Program<'info,Token>
}
impl<'info> WithdrawMint<'info> {
    pub fn withdrawmint(&mut self, amount: u64) -> Result<()> {
        let tranfer=TransferChecked{
            from:self.vault.to_account_info(),
            to:self.member_ata.to_account_info(),
            mint:self.mint.to_account_info(),
            authority:self.escrow.to_account_info()
        };
        let seeds = &[
            b"escrow".as_ref(),
            &self.escrow.admin.as_ref(),
            &self.escrow.seed.to_be_bytes(),
            &[self.escrow.bump]
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx=CpiContext::new(self.token_program.to_account_info(), tranfer).with_signer(signer_seeds);
        transfer_checked(cpi_ctx, amount, self.mint.decimals)?;
        Ok(())
    }
}