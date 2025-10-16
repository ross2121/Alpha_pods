use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL, system_program::{transfer, Transfer}};

use crate::{ InitializeAdmin};
#[derive(Accounts)]
pub struct Withdraw<'info> { 
    #[account(mut)]
    pub member: Signer<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref()],bump=escrow.bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    pub system_program: Program<'info, System>,
}
impl<'info> Withdraw<'info> {
    pub fn withdraw(&mut self, ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let member_account = ctx.accounts.escrow.members.iter().find(|account| 
            account.public_key == ctx.accounts.member.key()
        ).expect("No member exist for this address first add the address");
        if member_account.amount < amount{
            return Err(ErrorCode::AccountNotEnoughKeys.into())
        };
        let tranfer=Transfer{
            from:ctx.accounts.escrow.to_account_info(),
            to:ctx.accounts.member.to_account_info(),
        };
        let seeds = &[
            b"escrow".as_ref(),
            &self.escrow.admin.as_ref(),
            &[self.escrow.bump]
        ];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx=CpiContext::new(ctx.accounts.system_program.to_account_info(), tranfer).with_signer(signer_seeds);
        transfer(cpi_ctx, amount*LAMPORTS_PER_SOL);
        Ok(())
    }
}