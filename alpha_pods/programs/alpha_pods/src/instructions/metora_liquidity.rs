use anchor_lang::{declare_program, Accounts};
use anchor_lang::{ prelude::*};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;
use anchor_spl::{ token::{ transfer_checked, Mint, TokenAccount, TransferChecked}};
use crate::dlmm::cpi::accounts::InitializeLbPair;
use crate::{ InitializeAdmin};
use crate::dlmm;
#[derive(Accounts)]
#[instruction(bin_id:i32,bin_step:u16)]
pub struct LPPOOl<'info> {
    #[account(mut)]
    pub member:Signer<'info>,
    #[account(mut,seeds=[b"escrow",escrow.admin.key().as_ref(),&escrow.seed.to_le_bytes()],bump=escrow.bump)]
    pub escrow:Account<'info,InitializeAdmin>,
    #[account(mut)]
    /// CHECK: This is an external program account
    pub lp_account:AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: 
    pub oracle: AccountInfo<'info>,
    #[account(mut,associated_token::mint=minta,associated_token::authority=member,associated_token::token_program=token_program)]
    pub member_minta:Account<'info,TokenAccount>,
    #[account(mut,associated_token::mint=mintb,associated_token::authority=member,associated_token::token_program=token_program)]
    pub member_mintb:Account<'info,TokenAccount>,
    pub minta:Account<'info,Mint>,
    pub mintb:Account<'info,Mint>,
    #[account(init,payer=member,associated_token::mint=minta,associated_token::authority=escrow,associated_token::token_program=token_program)]
    pub vaulta:Account<'info,TokenAccount>,
    #[account(init,payer=member,associated_token::mint=mintb,associated_token::authority=escrow,associated_token::token_program=token_program)]
    pub vaultb:Account<'info,TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program:Program<'info,Token>,
    pub associated_token_program:Program<'info,AssociatedToken>,
    /// CHECK: The account holding preset parameters for the given bin_step. Needs correct address.
    pub preset_parameter: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>, 
    #[account(mut)]
    /// CHECK: 
    pub meteora_program: AccountInfo<'info>,
       /// CHECK: 
       pub event_authority: AccountInfo<'info>
}
impl<'info> LPPOOl<'info>{
    pub fn createpool(&mut self,bin_id:i32,bin_step:u16)->Result<()>{
        let cpi_context = CpiContext::new(
            self.meteora_program.to_account_info(), 
            InitializeLbPair { 
                lb_pair: self.lp_account.to_account_info(), // Use .to_account_info()
                token_mint_x: self.minta.to_account_info(), // Use .to_account_info()
                token_mint_y: self.mintb.to_account_info(), // Use .to_account_info()
                reserve_x: self.vaulta.to_account_info(), // Use .to_account_info()
                reserve_y: self.vaultb.to_account_info(), // Use .to_account_info()
                oracle: self.oracle.to_account_info(), // Use .to_account_info()
                preset_parameter: self.preset_parameter.to_account_info(), // Use .to_account_info()
                funder: self.member.to_account_info(), // Use .to_account_info()
                token_program: self.token_program.to_account_info(), // Use .to_account_info()
                system_program: self.system_program.to_account_info(), // Use .to_account_info()
                rent: self.rent.to_account_info(), // Use .to_account_info()
                event_authority: self.event_authority.to_account_info(), // Use .to_account_info()
                program: self.meteora_program.to_account_info(), // Use .to_account_info() (Metora program itself)
                bin_array_bitmap_extension: None, // Keep as None
            },
        );
        msg!("Calling Metora initialize_lb_pair CPI...");
        dlmm::cpi::initialize_lb_pair(cpi_context, bin_id, bin_step)?;
        msg!("Metora initialize_lb_pair CPI finished.");
        Ok(())
    }
}