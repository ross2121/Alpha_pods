export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Program Integration Guide
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        How to integrate AlphaPods governance with your Rust program to make protocol decisions governed by a DAO.
      </p>

      <h2 className="mt-8 text-base font-semibold">Overview</h2>
      <p className="mt-2 text-sm text-slate-300">
        This guide shows you how to set up your Relay or DeFi program so that a DAO (Realm) controls its configuration. Users will propose changes via AlphaPods, vote on them, and the governance program will execute them.
      </p>

      <h2 className="mt-8 text-base font-semibold">1. Define Your Governance Authority</h2>
      <p className="mt-2 text-sm text-slate-300">
        In your program's config account, store the governance account's public key:
      </p>
      
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// programs/alpha_pods/src/state.rs
use anchor_lang::prelude::*;

#[account]
pub struct ProtocolConfig {
    pub bump: u8,
    /// Initial authority (can be multisig, then upgraded to governance)
    pub authority: Pubkey,
    /// The SPL Governance account (from /setup_governance)
    pub governance_authority: Pubkey,
    /// Treasury account (controlled by governance)
    pub treasury: Pubkey,
    
    // Your program-specific config
    pub fee_bps: u16,      // 0-10000 (0=0%, 10000=100%)
    pub min_deposit: u64,
    pub max_deposit: u64,
    pub is_paused: bool,
    
    // Versioning for safety
    pub version: u8,
}`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">2. Initialize the Config (One-Time Setup)</h2>
      <p className="mt-2 text-sm text-slate-300">
        Create an instruction that initializes your config with the governance authority. Only the original admin can do this once:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// programs/alpha_pods/src/instructions/init_protocol_config.rs
#[derive(Accounts)]
pub struct InitProtocolConfig<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + std::mem::size_of::<ProtocolConfig>(),
        seeds = [b"protocol_config"],
        bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    /// Must be the initial authority (typically multisig or admin)
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn init_protocol_config(
    ctx: Context<InitProtocolConfig>,
    governance_authority: Pubkey,
    treasury: Pubkey,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    config.authority = ctx.accounts.authority.key();
    config.governance_authority = governance_authority;
    config.treasury = treasury;
    config.fee_bps = 500; // 5%
    config.min_deposit = 1_000_000; // 1M in smallest units
    config.max_deposit = u64::MAX;
    config.is_paused = false;
    config.version = 1;
    config.bump = ctx.bumps.config;
    
    emit!(ConfigInitialized {
        governance_authority,
        treasury,
        authority: config.authority,
    });
    
    Ok(())
}`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">3. Create Admin Instructions (Governance-Controlled)</h2>
      <p className="mt-2 text-sm text-slate-300">
        Create instructions that can only be called by the governance authority. These are what proposals will execute:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// programs/alpha_pods/src/instructions/update_config.rs
#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub config: Account<'info, ProtocolConfig>,
    
    /// Must be the governance authority (from config)
    /// When called via governance proposal, this is signed by the Governance account
    pub authority: Signer<'info>,
}

pub fn update_fee(ctx: Context<UpdateConfig>, new_fee_bps: u16) -> Result<()> {
    require_eq!(
        ctx.accounts.authority.key(),
        ctx.accounts.config.governance_authority,
        "Only governance can update fees"
    );
    
    require!(new_fee_bps <= 10000, "Fee BPS > 100%");
    
    let old_fee = ctx.accounts.config.fee_bps;
    ctx.accounts.config.fee_bps = new_fee_bps;
    
    emit!(FeeUpdated {
        old_fee,
        new_fee: new_fee_bps,
    });
    
    Ok(())
}

pub fn toggle_pause(ctx: Context<UpdateConfig>, paused: bool) -> Result<()> {
    require_eq!(
        ctx.accounts.authority.key(),
        ctx.accounts.config.governance_authority,
        "Only governance can pause/unpause"
    );
    
    ctx.accounts.config.is_paused = paused;
    
    emit!(ProtocolPausedToggled { paused });
    
    Ok(())
}`}
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        <strong>Key point:</strong> When a governance proposal executes, the SPL Governance program signs on behalf of the governance authority. Your program simply checks that `authority.key() == config.governance_authority`.
      </p>

      <h2 className="mt-8 text-base font-semibold">4. Emit Events for Transparency</h2>
      <p className="mt-2 text-sm text-slate-300">
        Emit events when governance changes things, so your indexer can track governance activity:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// programs/alpha_pods/src/lib.rs
#[event]
pub struct ConfigInitialized {
    pub governance_authority: Pubkey,
    pub treasury: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct FeeUpdated {
    pub old_fee: u16,
    pub new_fee: u16,
}

#[event]
pub struct ProtocolPausedToggled {
    pub paused: bool,
}`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">5. Create a Governance Proposal in AlphaPods</h2>
      <p className="mt-2 text-sm text-slate-300">
        Once your program is ready, an admin uses the AlphaPods bot to propose a change:
      </p>

      <ol className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-decimal">
        <li>Create the realm: <code>/createdao</code></li>
        <li>Set up governance: <code>/setup_governance</code></li>
        <li>Users deposit voting power: <code>/deposit_power</code></li>
        <li>Create a proposal: <code>/gov_propose</code> with instructions to call your program</li>
      </ol>

      <p className="mt-3 text-sm text-slate-300">
        <strong>Constructing the proposal instruction programmatically:</strong>
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// src/services/governanceRealms.ts (AlphaPods backend)
// When creating a proposal with an instruction:

const proposalIxs: TransactionInstruction[] = [];

// 1. Create the instruction to call your program
const updateFeeIx = new TransactionInstruction({
  programId: ALPHA_PODS_PROGRAM_ID,  // Your program ID
  keys: [
    { 
      pubkey: protocolConfigPda,  // Your config account
      isSigner: false,
      isWritable: true,
    },
    { 
      pubkey: governanceAddress,  // Governance account (signer)
      isSigner: true,
      isWritable: false,
    },
  ],
  data: Buffer.concat([
    Buffer.from([1]), // Instruction discriminator (update_fee)
    new BN(750).toBuffer('le', 2), // New fee: 7.5% (750 bps)
  ]),
});

// 2. Add it to the proposal
const proposalAddress = await withCreateProposal(
  proposalIxs,
  GOVERNANCE_PROGRAM_ID,
  GOVERNANCE_PROGRAM_VERSION,
  realmAddress,
  governanceAddress,
  tokenOwnerRecordAddress,
  "Update Protocol Fee to 7.5%",
  "discussion: https://forum.example.com/...",
  communityMintPk,
  wallet,
  [updateFeeIx],  // <-- Include the instruction here
  VoteType.SINGLE_CHOICE,
  ["Approve"],
  true,
  wallet,
  proposalSeed,
);`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">6. Execute the Proposal</h2>
      <p className="mt-2 text-sm text-slate-300">
        Once the proposal passes (60% yes votes), anyone can execute it:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// Step 1: Finalize voting (wait until voting_end timestamp)
const executeIxs: TransactionInstruction[] = [];

// Step 2: Call governance to execute the instruction
await withExecuteProposal(
  executeIxs,
  GOVERNANCE_PROGRAM_ID,
  governanceAddress,
  proposalAddress,
  governanceTokenHoldingAccountAddress,
  [updateFeeIx],  // The instruction we want to execute
);

// Step 3: Sign and send
const tx = new Transaction().add(...executeIxs);
const signature = await connection.sendTransaction(tx, [wallet]);`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">7. Migration Path (Multisig → Governance)</h2>
      <p className="mt-2 text-sm text-slate-300">
        If you already have a program with a multisig authority, migrate gradually:
      </p>

      <ol className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-decimal">
        <li><strong>Phase 1:</strong> Multisig controlled, governance reads config</li>
        <li><strong>Phase 2:</strong> Both multisig and governance can update (dual-authority)</li>
        <li><strong>Phase 3:</strong> Multisig can still veto, governance controls day-to-day</li>
        <li><strong>Phase 4:</strong> Full governance control only</li>
      </ol>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// During migration, accept both authorities:
pub fn update_fee(ctx: Context<UpdateConfig>, new_fee_bps: u16) -> Result<()> {
    let authority = ctx.accounts.authority.key();
    let governance = ctx.accounts.config.governance_authority;
    let multisig = ctx.accounts.config.multisig_authority;
    
    require!(
        authority == governance || authority == multisig,
        "Only governance or multisig can update"
    );
    
    // ... rest of logic
}`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">8. Testing Your Governance Integration</h2>
      <p className="mt-2 text-sm text-slate-300">
        Test locally before mainnet:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// tests/governance-integration.ts
import { initializeGovernance } from "../src/services/governanceRealms";
import { PublicKey } from "@solana/web3.js";

describe("Governance Integration", () => {
  it("should allow governance to update config", async () => {
    // 1. Create realm and governance
    const { realmAddress, governanceAddress } = await initializeGovernance({...});
    
    // 2. Initialize your config with this governance
    // 3. Create a proposal to update fee
    // 4. Vote on it
    // 5. Execute
    // 6. Verify config was updated
  });
});\n`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">9. Monitoring & Transparency</h2>
      <p className="mt-2 text-sm text-slate-300">
        Set up monitoring to track when governance makes changes:
      </p>

      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Event indexing:</strong> Parse FeeUpdated, ProtocolPausedToggled events</li>
        <li><strong>Governance polling:</strong> Track executed proposals via Helius webhooks or scheduled polling</li>
        <li><strong>Discord alerts:</strong> Notify team/community when governance updates happen</li>
        <li><strong>Dashboard:</strong> Display current config values and recent governance changes</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">10. Security Considerations</h2>
      <ul className="mt-3 space-y-3 text-sm text-slate-300 list-disc">
        <li><strong>Proposal delay:</strong> Add a timelock between proposal passing and execution (not yet in AlphaPods, but available in SPL Governance).</li>
        <li><strong>Parameter bounds:</strong> In your instructions, validate that new values are within safe ranges (e.g., fee_bps ≤ 10000).</li>
        <li><strong>Emergency pause:</strong> Keep a multisig with veto power during early phases.</li>
        <li><strong>Upgrade authority:</strong> Separate from governance authority – don't let proposals upgrade your program without vetting.</li>
        <li><strong>Test proposals:</strong> Use devnet to test governance proposals before running on mainnet.</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">Example: Full DeFi Protocol Setup</h2>
      <p className="mt-2 text-sm text-slate-300">
        Here's a complete example with a lending pool governed by AlphaPods:
      </p>

      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// Define your accounts
#[account]
pub struct LendingPool {
    pub mint: Pubkey,
    pub config: Pubkey,
    pub total_deposits: u64,
}

#[account]
pub struct LendingConfig {
    pub governance_authority: Pubkey,
    pub borrow_fee_bps: u16,
    pub max_ltv: u16,  // 8000 = 80%
    pub liquidation_threshold: u16,
}

// Admin instruction: Update borrow fee (governance-controlled)
#[derive(Accounts)]
pub struct UpdateBorrowFee<'info> {
    #[account(mut)]
    pub config: Account<'info, LendingConfig>,
    pub governance: Signer<'info>,
}

pub fn update_borrow_fee(
    ctx: Context<UpdateBorrowFee>,
    new_fee_bps: u16,
) -> Result<()> {
    require_eq!(
        ctx.accounts.governance.key(),
        ctx.accounts.config.governance_authority,
        "Only governance"
    );
    
    require!(new_fee_bps <= 5000, "Fee > 50%");
    
    ctx.accounts.config.borrow_fee_bps = new_fee_bps;
    
    emit!(BorrowFeeUpdated {
        new_fee: new_fee_bps,
    });
    
    Ok(())
}

// When proposing via AlphaPods:
// - Admin creates proposal: "Update borrow fee to 2.5%"
// - Community votes
// - If passed, governance executes the update_borrow_fee instruction`}
      </pre>

      <p className="mt-6 text-sm text-slate-400">
        <strong>Next:</strong> See <strong>Governance Setup</strong> for deep technical details, or <strong>Telegram Governance</strong> for user workflows.
      </p>
    </div>
  );
}
