use anchor_lang::prelude::*;
pub mod instructions;
pub use instruction::*;
pub mod state;
pub use state::*;
declare_id!("FeozaXSwZZexg48Fup4xLZFN2c9nUsSvtHbWz3V3GQuq");

#[program]
pub mod alpha_pods {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
