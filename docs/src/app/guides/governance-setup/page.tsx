export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Governance Setup & Architecture
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Technical guide for understanding AlphaPods governance structure and how to integrate it with your Rust program.
      </p>

      <h2 className="mt-8 text-base font-semibold">🏗️ Governance Structure Overview</h2>
      <p className="mt-2 text-sm text-slate-300">
        AlphaPods uses SPL Governance (Realms) to manage on-chain decisions. Here's the hierarchy:
      </p>
      
      <div className="mt-4 rounded-md bg-slate-900 p-4 text-xs text-slate-200">
        <pre>{`Realm
├── Community Mint (voting power)
├── Council Mint (optional, elevated voting)
└── Governance
    ├── Config (voting rules)
    ├── Native Treasury (SOL account)
    └── Proposals
        ├── Instructions (executable actions)
        └── Votes (voter records)`}</pre>
      </div>

      <h2 className="mt-8 text-base font-semibold">1. Realm Creation</h2>
      <p className="mt-2 text-sm text-slate-300">
        A Realm is the top-level DAO container. When you call `/createdao`, we call the SPL Governance program to create:
      </p>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><code>Realm</code> account – stores DAO metadata (name, authority)</li>
        <li>Reference to <code>Community Mint</code> – the governance token</li>
        <li>Optional <code>Council Mint</code> – additional voting layer</li>
      </ul>
      
      <h3 className="mt-4 text-sm font-semibold">Parameters</h3>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// From src/services/createdao.ts
interface CreateRealmParams {
  name: string;              // "AlphaPods Treasury DAO"
  communityMint: PublicKey;  // SPL token pubkey
  councilMint?: PublicKey;   // Optional elevated governance layer
}

// Both mints must exist before creating the realm
// The authority becomes the wallet that creates the realm`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">2. Governance Account & Configuration</h2>
      <p className="mt-2 text-sm text-slate-300">
        A Governance account holds the rules for voting. When you call `/setup_governance`, we:
      </p>
      <ol className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-decimal">
        <li>Create a TokenOwnerRecord for the governance authority (via deposit with 0 amount)</li>
        <li>Create the Governance account with voting configuration</li>
        <li>Create a Native Treasury (SOL account controlled by governance)</li>
      </ol>

      <h3 className="mt-4 text-sm font-semibold">voting Rules (GovernanceConfig)</h3>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// Current AlphaPods defaults (from governanceRealms.ts)
const config = new GovernanceConfig({
  // Community voting thresholds
  communityVoteThreshold: {
    type: VoteThresholdType.YesVotePercentage,
    value: 60,               // 60% yes votes needed
  },
  minCommunityTokensToCreateProposal: new BN(1),  // From setup wizard
  baseVotingTime: 3 * 24 * 60 * 60,  // 3 days
  communityVoteTipping: VoteTipping.Strict,

  // Council is disabled
  councilVoteThreshold: { type: VoteThresholdType.Disabled },
  minCouncilTokensToCreateProposal: new BN(0),
  councilVoteTipping: VoteTipping.Disabled,

  // Other settings
  minInstructionHoldUpTime: 0,
  votingCoolOffTime: 0,
  depositExemptProposalCount: 10,
});`}
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        <strong>Customization:</strong> You can modify these thresholds when calling setup governance. Common use cases:
      </p>
      <ul className="mt-3 space-y-1 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Higher minimum tokens:</strong> Prevent spam proposals</li>
        <li><strong>Longer voting windows:</strong> Give community more time</li>
        <li><strong>Council tier:</strong> Enable optional council approval for big decisions</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">3. TokenOwnerRecord (Voting Power)</h2>
      <p className="mt-2 text-sm text-slate-300">
        Each wallet that votes gets a TokenOwnerRecord, which links their wallet to their voting power in a realm. When a user calls `/deposit_power`:
      </p>
      <ol className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-decimal">
        <li>We call <code>withDepositGoverningTokens()</code> with the community mint</li>
        <li>The SPL Governance program creates/updates their TokenOwnerRecord</li>
        <li>Their tokens are transferred to a governance-controlled escrow</li>
        <li>Their voting power = token balance in escrow</li>
      </ol>

      <h3 className="mt-4 text-sm font-semibold">Key Details</h3>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>One record per (wallet, realm, mint):</strong> A wallet has voting power in each realm separately</li>
        <li><strong>Deposit is optional:</strong> You don't need tokens to view proposals, only to vote or propose</li>
        <li><strong>Revoke anytime:</strong> Users can withdraw their tokens later (after voting period)</li>
      </ul>

      <h2 className="mt-8 text-base font-semibold">4. Proposals & Instructions</h2>
      <p className="mt-2 text-sm text-slate-300">
        A Proposal is a motion that gets voted on. When you call `/gov_propose`, we create a Proposal account with:
      </p>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Title & description:</strong> What the proposal is about</li>
        <li><strong>Instructions:</strong> What happens if it passes (optional, can be empty)</li>
        <li><strong>Vote type:</strong> Single-choice (yes/no) or multi-choice</li>
        <li><strong>State:</strong> Draft → Voting → Succeeded/Defeated</li>
      </ul>

      <h3 className="mt-4 text-sm font-semibold">Executable Proposals (Advanced)</h3>
      <p className="mt-2 text-sm text-slate-300">
        Proposals can include executable instructions. For example:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// Example: Transfer tokens from treasury
const instruction = new TransactionInstruction({
  programId: TOKEN_PROGRAM_ID,
  keys: [
    { pubkey: treasury, isSigner: false, isWritable: true },
    { pubkey: recipient, isSigner: false, isWritable: true },
    { pubkey: governance, isSigner: true, isWritable: false },
  ],
  data: Buffer.from([...encode(amount)]),
});

// Add to proposal
proposal_instructions = [instruction];`}
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        When the proposal passes, any token holder (or an executor) can call the governance program to execute these instructions, signed by the governance authority.
      </p>

      <h2 className="mt-8 text-base font-semibold">5. Votes & Delegation</h2>
      <p className="mt-2 text-sm text-slate-300">
        When a user votes via `/gov_vote`, we create a VoteRecord on-chain that maps:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`{
  proposal: PublicKey,
  voter_token_owner_record: PublicKey,  // Their voting power record
  vote: Vote::Yes or Vote::No,
  voter_weight: u64,  // How many tokens they voted with
}`}
      </pre>

      <p className="mt-3 text-sm text-slate-300">
        <strong>Delegation:</strong> Users can delegate their TokenOwnerRecord to another wallet. When they do, that wallet's voting power increases by the delegated amount. This happens via the SPL Governance <code>withDelegateGovernanceTokens()</code> instruction.
      </p>

      <h2 className="mt-8 text-base font-semibold">🔌 Integrating With Your Rust Program</h2>
      <p className="mt-2 text-sm text-slate-300">
        If you want your AlphaPods program to be governed by a DAO (e.g., to allow governance to change config), follow these steps:
      </p>

      <h3 className="mt-4 text-sm font-semibold">Step 1: Store the Governance Authority</h3>
      <p className="mt-2 text-sm text-slate-300">
        In your program config account, store the Governance account's pubkey:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`// In your Rust program (alpha_pods/programs/alpha_pods/src/lib.rs)
#[account]
pub struct ProgramConfig {
    pub authority: Pubkey,           // Original admin (can be governance)
    pub governance_authority: Pubkey,    // The Governance account from Realms
    pub treasury: Pubkey,            // Governance treasury (for payments)
    pub ...other_config...
}`}
      </pre>

      <h3 className="mt-4 text-sm font-semibold">Step 2: Verify Authority in Instructions</h3>
      <p className="mt-2 text-sm text-slate-300">
        When an instruction modifies config, verify the signer is the governance authority:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub config: Account<'info, ProgramConfig>,
    
    /// Must be the governance authority
    pub authority: Signer<'info>,
    
    // ... other accounts
}

pub fn update_config(
    ctx: Context<UpdateConfig>,
    new_param: u64,
) -> Result<()> {
    // Check that signer matches governance authority
    require_eq!(
        ctx.accounts.authority.key(),
        ctx.accounts.config.governance_authority,
        "Only governance can update config"
    );
    
    ctx.accounts.config.some_param = new_param;
    Ok(())
}`}
      </pre>

      <h3 className="mt-4 text-sm font-semibold">Step 3: Create Proposals to Update Config</h3>
      <p className="mt-2 text-sm text-slate-300">
        When governance votes to update your program, they create a proposal with an instruction that:
      </p>
      <ol className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-decimal">
        <li>Calls your <code>update_config</code> instruction</li>
        <li>Passes the governance account as the signer (via SPL Gov kernel)</li>
        <li>Updates your program's config</li>
      </ol>

      <p className="mt-3 text-sm text-slate-300">
        <strong>Note:</strong> The governance program acts as a "meta-authority" – it signs instructions on behalf of token holders.
      </p>

      <h3 className="mt-4 text-sm font-semibold">Step 4: Emit Events for Indexing</h3>
      <p className="mt-2 text-sm text-slate-300">
        When an instruction is executed, emit events (via Anchor events) so the indexer can track what changed:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`#[event]
pub struct ConfigUpdated {
    pub new_param: u64,
    pub timestamp: i64,
}

// In your update_config:
emit!(ConfigUpdated {
    new_param,
    timestamp: Clock::get()?.unix_timestamp,
});`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">🔧 Database Schema for Governance</h2>
      <p className="mt-2 text-sm text-slate-300">
        AlphaPods indexes governance data into tables:
      </p>
      <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-200">
{`-- Realms
CREATE TABLE realms (
  id UUID PRIMARY KEY,
  pubkey VARCHAR UNIQUE,
  name VARCHAR,
  cluster VARCHAR,
  community_mint VARCHAR,
  council_mint VARCHAR,
  authority VARCHAR,
  created_at TIMESTAMP,
);

-- Governance accounts
CREATE TABLE governances (
  id UUID PRIMARY KEY,
  realm_id UUID,
  governance_pubkey VARCHAR UNIQUE,
  config_json JSONB,  -- voting rules
  authority VARCHAR,
  native_treasury VARCHAR,
  created_at TIMESTAMP,
);

-- Proposals
CREATE TABLE proposals (
  id UUID PRIMARY KEY,
  realm_id UUID,
  governance_id UUID,
  proposal_pubkey VARCHAR UNIQUE,
  title VARCHAR,
  description TEXT,
  state VARCHAR,  -- Draft, Voting, Succeeded, Defeated, Cancelled
  voting_start TIMESTAMP,
  voting_end TIMESTAMP,
  creator VARCHAR,
  ...
);

-- Votes
CREATE TABLE votes (
  id UUID PRIMARY KEY,
  proposal_id UUID,
  voter VARCHAR,
  side VARCHAR,  -- Yes or No
  weight INT8,   -- Number of tokens voted
  tx_signature VARCHAR,
  created_at TIMESTAMP,
);

-- Delegates
CREATE TABLE delegates (
  id UUID PRIMARY KEY,
  wallet_pubkey VARCHAR UNIQUE,
  display_name VARCHAR,
  bio TEXT,
  avatar_url VARCHAR,
  tags JSONB,  -- ["conservative", "builder-aligned"]
  created_at TIMESTAMP,
);

-- User subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID,
  realm_id UUID,
  min_value_usd INT,
  notify_on_new_proposal BOOLEAN,
  notify_on_vault_move BOOLEAN,
  notify_on_upgrade BOOLEAN,
  created_at TIMESTAMP,
);`}
      </pre>

      <h2 className="mt-8 text-base font-semibold">🔄 The Full Flow: Admin → Proposal → Execution</h2>
      <ol className="mt-3 space-y-3 text-sm text-slate-300 list-decimal">
        <li>
          <strong>Admin creates DAO:</strong> <code>/createdao</code> → Realm account on-chain
        </li>
        <li>
          <strong>Admin sets up governance:</strong> <code>/setup_governance</code> → Governance account with voting rules + Treasury
        </li>
        <li>
          <strong>Users deposit power:</strong> <code>/deposit_power</code> → TokenOwnerRecord + governance escrow
        </li>
        <li>
          <strong>User proposes:</strong> <code>/gov_propose</code> → Proposal with instructions
        </li>
        <li>
          <strong>Community votes:</strong> <code>/gov_vote</code> → VoteRecords created
        </li>
        <li>
          <strong>Proposal passes:</strong> Governance program tallies votes, state → Succeeded
        </li>
        <li>
          <strong>Execute:</strong> Any token holder calls governance to execute instructions (e.g., update your program config)
        </li>
      </ol>

      <h2 className="mt-8 text-base font-semibold">📌 Best Practices</h2>
      <ul className="mt-3 space-y-2 pl-5 text-sm text-slate-300 list-disc">
        <li><strong>Set governance as authority early:</strong> Initialize your program with governance pubkey from day one, don't migrate later.</li>
        <li><strong>Minimum token threshold:</strong> Require a small amount to propose (prevents spam).</li>
        <li><strong>Voting window length:</strong> 3-7 days is typical, adjust based on your community size.</li>
        <li><strong>Proposal instructions:</strong> Start simple (summary-only), move to executable later once you're confident.</li>
        <li><strong>Monitor execution:</strong> Track which proposals executed vs failed, for transparency.</li>
        <li><strong>Multi-sig fallback:</strong> Until you fully trust governance, keep a multisig with veto power.</li>
      </ul>

      <p className="mt-6 text-sm text-slate-400">
        <strong>Next:</strong> Check out the <strong>Integration Guide</strong> for code examples, or <strong>Telegram Governance</strong> for user-facing flows.
      </p>
    </div>
  );
}
