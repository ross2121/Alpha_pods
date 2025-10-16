use anchor_lang::{prelude::*};
use anchor_spl::token::{transfer_checked, Mint, Token, TokenAccount, TransferChecked};
use crate::{ InitializeAdmin};
#[derive(Accounts)]
pub struct WithdrawMint<'info> { 
    #[account(mut)]
    pub member: Signer<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref()],bump=escrow.bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    #[account(mut)]
    pub mint:Account<'info,Mint>,
   #[account(mut,associated_token::mint=mint,associated_token::authority=escrow)]
   pub escrow_ata:Account<'info,TokenAccount>,
   #[account(mut,associated_token::mint=mint,associated_token::authority=member)]
   pub member_ata:Account<'info,TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program:Program<'info,Token>
}
impl<'info> WithdrawMint<'info> {
    pub fn withdrawmint(&mut self, ctx: Context<WithdrawMint>, amount: u64) -> Result<()> {

        let tranfer=TransferChecked{
            from:ctx.accounts.escrow_ata.to_account_info(),
            to:ctx.accounts.member.to_account_info(),
            mint:ctx.accounts.mint.to_account_info(),
            authority:ctx.accounts.escrow.to_account_info()
        };
        let seeds = &[
            b"escrow".as_ref(),
            &self.escrow.admin.as_ref(),
            &[self.escrow.bump]
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx=CpiContext::new(ctx.accounts.token_program.to_account_info(), tranfer).with_signer(signer_seeds);
        transfer_checked(cpi_ctx, amount, self.mint.decimals);
        Ok(())
    }
}