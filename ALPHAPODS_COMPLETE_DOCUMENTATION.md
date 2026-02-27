# AlphaPods Governance Platform - Complete Documentation

---

## Table of Contents

1. [Overview & Getting Started](#overview--getting-started)
2. [Quick Start Guide](#quick-start-guide)
3. [Telegram Governance - Complete Walkthrough](#telegram-governance---complete-walkthrough)
4. [Governance Setup & Architecture](#governance-setup--architecture)
5. [Program Integration Guide](#program-integration-guide)
6. [Delegates & Delegation System](#delegates--delegation-system)
7. [Smart Alerts & Notifications](#smart-alerts--notifications)
8. [FAQ & Troubleshooting](#faq--troubleshooting)

---

# Overview & Getting Started

## What is AlphaPods?

AlphaPods is a complete **governance and delegation platform** that lets you participate in Solana DAO governance (SPL Governance / Realms) directly from Telegram—**no browser or wallet extension required**.

### Key Features

✅ **Non-custodial** – You control your wallet; AlphaPods never holds your keys
✅ **On-chain** – All proposals and votes are permanent, immutable on Solana
✅ **Standards-based** – Uses SPL Governance (Realms) standard – compatible with realms.today
✅ **Telegram-native** – No wallet extension needed; everything works in Telegram

## What You Can Do

- 🏛️ **Create and manage DAOs** – Initialize a new Realm (DAO) from Telegram with custom voting rules
- 💰 **Deposit voting power** – Members deposit governance tokens to get voting power
- 🗳️ **Create proposals & vote** – Create on-chain proposals and vote from Telegram
- 🚨 **Smart alerts** – Subscribe to DAOs and get notified only about proposals that matter
- 👥 **Discover & delegate to leaders** – Find trusted delegates with voting history and reputation
- 📊 **Build delegate reputation** – Set up a profile, vote consistently, and gain followers

## Platform Architecture

### Core Components

**🤖 Telegram Bot**
- User-friendly interface for all governance actions
- Non-custodial wallet linking via Privy
- Real-time transaction signing and broadcasting

**📊 Indexer Service**
- Real-time tracking of on-chain proposals, votes, and realms
- Helius webhooks for event detection
- Scheduled polling for safety/redundancy

**🚨 Smart Alerts Engine**
- Intelligent filtering and notifications
- USD thresholds, proposal types, delegate activity
- Instant or digest frequency

**👥 Delegate Network**
- Profile pages with voting history
- Reputation metrics and alignment scores
- Delegation management

**🌐 Web Dashboard**
- Advanced analytics and governance insights
- Delegate discovery and profile viewing
- Proposal history and voting records

**🔐 Privy Integration**
- Non-custodial wallet linking
- MPC security for transaction signing

---

# Quick Start Guide

## 3-Step Setup

### Step 1: Open the Bot

1. In Telegram, search for **AlphaPods bot**
2. Tap **Start** or send `/start`
3. The bot creates your account and links a Solana wallet

**Result:** Your account is registered, and you have a non-custodial wallet managed by Privy.

### Step 2: Discover DAOs & Subscribe

1. Send `/realms` to see all available DAOs
2. View each DAO's name, network, and governance stats
3. Send `/subscribe <realm_pubkey>` to follow a DAO

**Optional:** Add a USD threshold:
```
/subscribe <realm_pubkey> 10000
```
(Only notify for proposals over $10,000)

### Step 3: Vote on Proposals

1. Send `/gov_vote`
2. The bot lists active proposals
3. Reply with the proposal number
4. Reply with `yes` or `no`
5. Paste the community token mint when asked

**Result:** Your vote is recorded on-chain from your linked wallet.

## Pre-requisite: Get Voting Power

To vote or propose, you need **voting power**. Deposit governance tokens:

```
/deposit_power
```

Then provide:
- Realm address (the DAO)
- Community mint (governance token)
- Amount in smallest units (e.g., 1,000,000 for 1M tokens)

---

# Telegram Governance - Complete Walkthrough

## Getting Started: `/start`

Open a direct message with AlphaPods bot and send:

```
/start
```

**What happens:**
1. Creates your AlphaPods account in the database
2. Generates or links a Solana wallet for you
3. Asks you to connect via Privy (wallet linking)

**Result:** All governance actions use your linked wallet to sign transactions on-chain.

---

## Create a DAO (Admin Only): `/createdao`

Send in your DAO group or private chat:

```
/createdao
```

**The bot will guide you through:**

1. **DAO Name** – Friendly name (e.g., "AlphaPods Treasury DAO")
2. **Community Mint** – Your SPL token that governs the DAO (required)
3. **Council Mint** – Optional second tier of voting power (type `none` to skip)

**Result:**
- A Realm is created on-chain
- Community/council mints are registered
- The DAO appears in `/realms` list and web dashboard
- Your wallet becomes the realm authority

---

## Set Up Governance Rules (Admin): `/setup_governance`

Configure voting rules and create a treasury:

```
/setup_governance
```

**You'll provide:**

1. **Realm Address** – The pubkey of your newly created realm
2. **Community Mint** – The governance token
3. **Minimum Tokens to Propose** – How many tokens needed to create a proposal (in smallest units)

**What gets created:**
- **Governance Account** – Holds voting rules (60% yes threshold, 3-day voting window, etc.)
- **Native Treasury** – A SOL wallet controlled by governance for DAO treasury

**Note:** You must have the community token in your wallet, even a small amount.

---

## Deposit Voting Power: `/deposit_power`

Get voting power in a realm:

```
/deposit_power
```

**Step-by-step:**

1. Enter **Realm Address** – Which DAO's realm
2. Enter **Community Mint** – The governance token
3. Enter **Amount (raw)** – How many tokens to deposit (smallest units)

**What happens:**
- Creates a TokenOwnerRecord on-chain
- Transfers your tokens to governance-controlled escrow
- Your voting power = token balance in escrow
- You can now vote and propose

**Note:** You can revoke/withdraw your tokens later (after voting period).

---

## Create a Proposal: `/gov_propose`

Create an on-chain proposal:

```
/gov_propose
```

**The wizard asks for:**

1. **Realm Address** – The DAO realm
2. **Governance Address** – The governance account (from setup)
3. **Community Mint** – The governance token
4. **Proposal Title & Description** – Title and optional forum link

**Requirements:**
- Your wallet must hold at least the minimum tokens set during `/setup_governance`

**Result:**
- A Proposal account is created on-chain
- Members have the voting window (e.g., 3 days) to vote
- Proposal appears in every indexer and dashboard

---

## Vote on Proposals: `/gov_vote`

Cast your vote on active proposals:

```
/gov_vote
```

**The bot will:**

1. List recent/active proposals from your subscribed realms
2. Ask which proposal you want to vote on (by number)
3. Ask your vote: `yes` or `no`
4. Ask for the community mint

**Your vote is recorded on-chain** and contributes to the proposal outcome.

---

## Discover & Delegate to Leaders: `/delegates`

Find trusted delegates:

```
/delegates <realm_pubkey>
```

**Each delegate card shows:**
- Name, avatar, bio
- Voting power (tokens + delegated)
- Participation rate (% of proposals voted)
- Tags (e.g., "Conservative", "Builder-Aligned")
- Alignment score (0-1, higher = more aligned with community)

**Tap a delegate card to:**
- View their full profile and voting history
- Delegate your voting power to them

---

## Delegate Your Votes: `/delegate_to`

Transfer voting power to someone else:

```
/delegate_to <realm_pubkey> <delegate_wallet>
```

**What happens:**
- Links your voting power to their wallet
- Only applies in that specific realm
- Increases their total voting power
- Can be revoked anytime

**Your tokens stay in your wallet** – only voting power is delegated.

---

## Revoke Delegation: `/revoke_delegation`

Take back your voting power:

```
/revoke_delegation <realm_pubkey>
```

**Result:** Your voting power is now yours again; future votes are up to you.

---

## Configure Notifications: `/alerts`

Manage your notification settings per realm:

```
/alerts
```

**You can adjust:**
- **Min USD Threshold** – Only notify for proposals over $X impact
- **Notification Types** – Choose which types matter to you
  - Treasury changes
  - Upgrades / authority changes
  - Config/parameter updates
  - All new proposals
- **Frequency** – Instant pings or daily digest

---

## Common Workflows

### I'm an admin – launch my DAO governance

1. Send `/createdao`
2. Enter realm name, community mint, optional council mint
3. Send `/setup_governance` with realm address and voting params
4. Share realm pubkey with members so they can `/deposit_power`

### I want to vote

1. Send `/start` to register
2. Send `/deposit_power` to get voting power in your realm
3. Send `/gov_vote` to vote on proposals

### I want to build trust as a delegate

1. Set up your delegate profile on the web dashboard (name, bio, avatar, tags)
2. Vote consistently and transparently in realms you care about
3. Respond to delegators' questions about your voting rationale
4. People discover you via `/delegates` and delegate to you
5. Your stats (participation, alignment) display publicly

---

## Troubleshooting

**Error: "Invalid account type"**
- Your wallet may not have the community token
- Make sure you have at least a small amount before `/deposit_power` or `/setup_governance`

**Transaction failed**
- Check your Solana balance (you need lamports for fees)
- Use `/balance` to check

**Proposal not appearing**
- Proposals are indexed by background service (~30 seconds delay)
- Try `/gov_vote` again after a moment

**Can't vote**
- You must deposit voting power first
- Use `/deposit_power` to get power in that realm

---

# Governance Setup & Architecture

## Governance Structure Overview

AlphaPods uses **SPL Governance (Realms)** for on-chain decisions. Here's the hierarchy:

```
Realm
├── Community Mint (voting power)
├── Council Mint (optional, elevated voting)
└── Governance
    ├── Config (voting rules)
    ├── Native Treasury (SOL account)
    └── Proposals
        ├── Instructions (executable actions)
        └── Votes (voter records)
```

---

## 1. Realm Creation

A **Realm** is the top-level DAO container. When you call `/createdao`, we create:

- **Realm account** – Stores DAO metadata (name, authority)
- **Reference to Community Mint** – The governance token
- **Optional Council Mint** – Additional voting layer

### Parameters

```typescript
interface CreateRealmParams {
  name: string;              // "AlphaPods Treasury DAO"
  communityMint: PublicKey;  // SPL token pubkey
  councilMint?: PublicKey;   // Optional elevated governance
}
```

**Prerequisites:**
- Both mints must exist before creating the realm
- The wallet that creates becomes the realm authority

---

## 2. Governance Account & Configuration

A **Governance account** holds the voting rules. When you call `/setup_governance`, we:

1. Create a TokenOwnerRecord for governance authority (via deposit with 0 amount)
2. Create the Governance account with voting configuration
3. Create a Native Treasury (SOL account controlled by governance)

### Voting Rules (GovernanceConfig)

**Current AlphaPods defaults:**

```json
{
  "communityVoteThreshold": {
    "type": "YesVotePercentage",
    "value": 60
  },
  "minCommunityTokensToCreateProposal": 1,
  "baseVotingTime": 259200,
  "communityVoteTipping": "Strict",
  "councilVoteThreshold": "Disabled",
  "minCouncilTokensToCreateProposal": 0,
  "minInstructionHoldUpTime": 0,
  "votingCoolOffTime": 0,
  "depositExemptProposalCount": 10
}
```

### Customization Options

- **Higher minimum tokens** – Prevent spam proposals
- **Longer voting windows** – Give community more time
- **Council tier** – Enable optional council approval for big decisions
- **Vote threshold** – Adjust from 60% to your preference (50%, 66%, 75%, etc.)

---

## 3. TokenOwnerRecord (Voting Power)

Each wallet that votes gets a **TokenOwnerRecord**, linking their wallet to voting power. When a user calls `/deposit_power`:

1. We call `withDepositGoverningTokens()` with the community mint
2. SPL Governance program creates/updates their TokenOwnerRecord
3. Tokens transferred to governance-controlled escrow
4. Their voting power = token balance in escrow

### Key Details

- **One record per (wallet, realm, mint)** – A wallet has separate voting power in each realm
- **Deposit is optional** – You don't need tokens to view proposals, only to vote or propose
- **Revoke anytime** – Users can withdraw tokens later (after voting period)

---

## 4. Proposals & Instructions

A **Proposal** is a motion that gets voted on. When you call `/gov_propose`, we create with:

- **Title & description** – What the proposal is about
- **Instructions** – What happens if it passes (optional, can be empty)
- **Vote type** – Single-choice (yes/no) or multi-choice
- **State** – Draft → Voting → Succeeded/Defeated

### Proposal Workflow

```
Created (Draft)
    ↓
Voting starts
    ↓
Vote counting...
    ↓
Voting ends
    ↓
Passed/Failed
    ↓
(If Passed) Execute instructions
```

### Executable Proposals (Advanced)

Proposals can include executable instructions. Example: Transfer tokens from treasury

```rust
// When the proposal passes, any token holder can execute:
// - Signature: Governance (acting on behalf of token holders)
// - Instruction: Transfer 50K USDC from treasury to recipient
```

---

## 5. Votes & Delegation

When a user votes via `/gov_vote`, we create a **VoteRecord** on-chain:

```json
{
  "proposal": "pubkey",
  "voter_token_owner_record": "pubkey",
  "vote": "Yes or No",
  "voter_weight": 1000000
}
```

### Delegation

Users can delegate their **TokenOwnerRecord** to another wallet. When they do:
- That wallet's voting power increases by the delegated amount
- Happens via SPL Governance `withDelegateGovernanceTokens()` instruction

---

## 6. Database Schema

### Core Tables

**realms**
```
id, pubkey (unique), name, cluster, community_mint, council_mint, authority, created_at
```

**governances**
```
id, realm_id, governance_pubkey (unique), config_json, authority, native_treasury, created_at
```

**proposals**
```
id, realm_id, governance_id, proposal_pubkey (unique), title, description, state, 
voting_start, voting_end, creator, created_at
```

**votes**
```
id, proposal_id, voter, side (Yes/No), weight, tx_signature, created_at
```

**delegates**
```
id, wallet_pubkey (unique), display_name, bio, avatar_url, tags (JSON), created_at
```

**subscriptions**
```
id, user_id, realm_id, min_value_usd, notify_on_new_proposal, 
notify_on_vault_move, notify_on_upgrade, created_at
```

**delegations**
```
id, realm_id, delegator_wallet, delegate_wallet, created_at
```

---

## Full Flow: Governance in Action

1. **Admin creates DAO** – `/createdao` → Realm account on-chain
2. **Admin sets up governance** – `/setup_governance` → Governance account + Treasury
3. **Users deposit power** – `/deposit_power` → TokenOwnerRecord + escrow
4. **User proposes** – `/gov_propose` → Proposal with instructions
5. **Community votes** – `/gov_vote` → VoteRecords created
6. **Proposal passes** – Governance program tallies votes
7. **Execute** – Token holder calls governance to execute instructions

---

# Program Integration Guide

## How to Make Your Program Governed by a DAO

If you're building a Solana program (lending protocol, yield strategy, etc.), AlphaPods governance can manage it.

### Step 1: Define Your Governance Authority

In your program's config account, store the governance account's public key:

```rust
// programs/alpha_pods/src/state.rs
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
}
```

### Step 2: Initialize the Config (One-Time Setup)

Create an instruction that initializes your config with the governance authority:

```rust
// programs/alpha_pods/src/instructions/init_protocol_config.rs
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
    config.min_deposit = 1_000_000;
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
}
```

### Step 3: Create Admin Instructions (Governance-Controlled)

Create instructions that can only be called by governance authority:

```rust
// programs/alpha_pods/src/instructions/update_config.rs
#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut)]
    pub config: Account<'info, ProtocolConfig>,
    
    /// Must be the governance authority
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
}
```

### Step 4: Emit Events for Transparency

Emit events so your indexer can track governance activity:

```rust
// programs/alpha_pods/src/lib.rs
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
}
```

### Step 5: Create a Governance Proposal in AlphaPods

Once your program is ready, an admin uses AlphaPods to propose a change:

1. Create realm: `/createdao`
2. Setup governance: `/setup_governance`
3. Users deposit power: `/deposit_power`
4. Create proposal: `/gov_propose` with instructions to call your program

### Step 6: Execute the Proposal

Once the proposal passes (60% yes votes), anyone can execute it:

```
// The governance program signs the instruction on behalf of token holders
// Your program's update_fee instruction executes
// Config is updated on-chain
```

---

## Migration Path (Multisig → Governance)

If you already have a program with a multisig authority, migrate gradually:

**Phase 1:** Multisig controlled, governance reads config
**Phase 2:** Both multisig and governance can update (dual-authority)
**Phase 3:** Multisig can still veto, governance controls day-to-day
**Phase 4:** Full governance control only

---

## Security Considerations

✅ **Proposal delay** – Add a timelock between proposal passing and execution
✅ **Parameter bounds** – Validate new values are within safe ranges
✅ **Emergency pause** – Keep a multisig with veto power during early phases
✅ **Upgrade authority** – Separate from governance authority
✅ **Test proposals** – Use devnet to test before mainnet

---

## Example: Full DeFi Protocol Setup

Here's a complete example with a lending pool governed by AlphaPods:

```rust
// Define your accounts
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
// - If passed, governance executes the update_borrow_fee instruction
```

---

# Delegates & Delegation System

## What is a Delegate?

A **delegate** is a community member who votes on governance proposals on behalf of token holders.

### Why Delegate?

- **Time** – Don't have time to research every proposal
- **Expertise** – Someone with deep protocol knowledge votes for you
- **Alignment** – Pick someone whose values match yours
- **Consistency** – They're incentivized to vote well

---

## Discovering Delegates

Use the `/delegates` command:

```
/delegates <realm_pubkey>
```

**The bot shows:**
- Delegate name, avatar, bio
- Voting power (tokens + delegated)
- Participation rate (% of proposals voted)
- Tags (e.g., "Conservative", "Builder-Aligned")
- Alignment score (0-1, higher = more aligned)

### Delegate Card Example

```
👤 Name: Alice
📊 Voting Power: 1.5M tokens
📈 Participation: 95% (19/20 proposals)
🏷️ Tags: [Conservative, Treasury-Focused]
⭐ Alignment Score: 0.82

[View Profile] [Delegate to Alice]
```

---

## Delegating Your Voting Power

Once you've chosen a delegate:

```
/delegate_to <realm_pubkey> <delegate_wallet>
```

**What happens:**
- Links your voting power to their wallet
- Only applies to that specific realm
- Increases their total voting power
- Can be revoked anytime

**Important:** Your tokens stay in your wallet – only voting power is delegated.

---

## Revoking Delegation

Take back your voting power anytime:

```
/revoke_delegation <realm_pubkey>
```

Your voting power is now yours again.

---

## Becoming a Delegate (Reputation Building)

### Step 1: Create Your Delegate Profile

Set up a profile so people can find you. Send:

```
/my_profile
```

**Fill in:**
- **Display Name** – "Alice" or "Alice Capital"
- **Bio** – Your voting philosophy
- **Avatar URL** – Profile picture (IPFS or CDN)
- **Tags** – 2-3 descriptive tags
- **Contact** – Telegram/Discord handle

### Available Tags

- **Conservative** – Low-risk, prefer tested strategies
- **Aggressive** – Open to experimental, high-risk ideas
- **Builder-Aligned** – Supports builders and dev teams
- **Treasury-Focused** – Prioritizes capital management
- **Transparency** – Demands detailed documentation
- **Governance-Expert** – Deep mechanics knowledge

### Step 2: Start Voting Consistently

Build your track record:

1. Use `/deposit_power` in realms you care about
2. Use `/gov_vote` to vote on proposals
3. Write down your reasoning (forum posts, Discord)
4. Respond to questions about your votes

**Consistency matters** – Show up for all proposals, not just big ones.

### Step 3: Build Trust & Transparency

Great delegates:
- **Explain votes** – Brief summaries of why you voted
- **Engage community** – Respond to feedback
- **Stay aligned** – Consistent with your stated philosophy
- **Share research** – Link to discussions and analyses

### Step 4: Track Your Progress

```
/my_stats <realm_pubkey>
```

**View:**
- Voting power (yours + delegated)
- Participation rate
- Alignment score
- Number of followers
- Recent votes

---

## Delegate Reputation Metrics

The indexer computes these stats for each delegate:

```json
{
  "delegate_address": "pubkey",
  "realm_address": "pubkey",
  "total_voting_power": 1000000,
  "num_followers": 42,
  "total_votes_cast": 19,
  "total_proposals_eligible": 20,
  "participation_rate": 0.95,
  "yes_votes": 12,
  "no_votes": 7,
  "yes_success_rate": 0.917,
  "no_success_rate": 0.857,
  "alignment_score": 0.82,
  "last_vote": "2026-02-28T12:00:00Z",
  "display_name": "Alice",
  "bio": "DeFi researcher, focus on capital efficiency",
  "tags": ["Conservative", "Treasury-Focused"]
}
```

---

## Best Practices

### For Delegators (You, voting through someone)

✅ Diversify – Don't delegate all power to one person
✅ Monitor – Check their votes periodically
✅ Rotate – Try different delegates, see who aligns best
✅ Engage fallback – Vote yourself on critical proposals

### For Delegates (Building Reputation)

✅ Be consistent – Clear, stable voting philosophy
✅ Respond to feedback – Explain your reasoning
✅ Set expectations – "I vote on all proposals" vs "focus on X only"
✅ Disclose conflicts – Be transparent about stakes
✅ Improve communication – Write voting summaries

---

## Common Questions

**Q: If I delegate, can I still vote?**
A: Yes! Your vote counts, plus the delegate's vote also counts (weighted by their power).

**Q: What if my delegate goes inactive?**
A: Their participation rate drops. Revoke your delegation and pick someone more active.

**Q: Can I delegate to multiple delegates?**
A: Not currently – you can only delegate to one wallet per realm.

**Q: Can a delegate vote for themselves?**
A: Yes. Delegates are just wallets. If they own tokens, they vote with their own power + delegated power combined.

---

# Smart Alerts & Notifications

## Overview

AlphaPods sends intelligent notifications so **you only hear about proposals that matter to you**.

Instead of being spammed with every proposal, filter by:
- **By amount** – Only proposals over a certain USD impact
- **By type** – Only treasury changes, upgrades, config updates
- **By delegate** – Alert if my trusted delegate hasn't voted
- **By frequency** – Instant pings or daily digest

---

## Setting Up Alerts

Use the `/alerts` command:

```
/alerts
```

The bot shows your current subscriptions with buttons to adjust settings.

---

## Configurable Filters

### 1. USD Threshold

Set a minimum proposal impact to be notified:

- **$0** – Notify me of every proposal
- **$10,000** – Only proposals over 10K (medium impact)
- **$100,000** – Only big proposals (major treasury moves)

**Set threshold:**
```
/set_alert_min <realm_pubkey> <usd_amount>
```

**How we estimate:** We use Pyth/Jupiter price oracles. If we can't estimate, we default to notifying (safe default).

### 2. Proposal Type Filters

**✅ New Proposals** – Alert on proposal creation
**💰 Treasury Changes** – Proposals that move funds
**🔧 Parameter Updates** – Governance config changes
**⚡ Upgrade Authority** – Authority changes (HIGH RISK)
**🎯 Program Updates** – Program deployments

**Toggle authority alerts:**
```
/authority_alert <realm_pubkey> on|off
```

### 3. Notification Frequency

- **🔔 Instant** – DM as soon as proposal created
- **📰 Digest (Daily)** – One message per day with all proposals
- **🔕 Off** – Don't notify (but proposals still indexed)

---

## Example Notification Message

```
🗳️ **New Proposal: AlphaPods DAO**

📌 **Title:** Increase Treasury by 50K USDC

💰 **Impact:** $50,000 USD

⏱️ **Voting:** 3 days remaining

[View Details] [Vote Now] [Open in Realms]
```

---

## Pro Tips

✅ **Use digest mode for many DAOs** – Prevents notification fatigue
✅ **Set high thresholds for conservative DAOs** – Only notify for big ones
✅ **Always enable upgrade alerts** – Even small upgrades are risky
✅ **Check /alerts regularly** – All proposals indexed; browse history anytime

---

## Troubleshooting

**Not getting notifications?**
- Check `/alerts` – frequency might be set to "off"
- USD threshold might be too high
- Notification types might all be disabled
- Ensure DMs are open with the bot

**Too many notifications?**
- Switch to digest mode
- Increase USD threshold
- Disable less important types
- Unsubscribe from noisy realms

---

# FAQ & Troubleshooting

## General Questions

**Q: Is AlphaPods non-custodial?**
A: Yes! Your keys are managed via Privy (MPC security). AlphaPods never holds your private keys.

**Q: Are all transactions on-chain?**
A: Yes! All proposals, votes, and governance decisions are permanent on Solana.

**Q: Do I need a wallet extension?**
A: No! Everything works in Telegram with Privy wallet linking.

**Q: Is AlphaPods compatible with realms.today?**
A: Yes! We use SPL Governance standards. Your DAOs work on both platforms.

**Q: How much does AlphaPods cost?**
A: Core functionality is free. Premium features coming soon.

---

## Governance Questions

**Q: How long does voting take?**
A: Default is 3 days, but DAOs can customize this.

**Q: What's the minimum to create a proposal?**
A: Set by the DAO admin during `/setup_governance` (e.g., 1,000 tokens).

**Q: What vote threshold do you default to?**
A: 60% yes votes needed. Customizable by admin.

**Q: Can I change my vote?**
A: No, once voted, your vote is final.

**Q: What happens if a proposal doesn't reach quorum?**
A: It fails and doesn't execute. Adjust thresholds if too high.

---

## Delegate Questions

**Q: How do I become a delegate?**
A: Set up your profile, deposit voting power, and vote consistently in realms you care about.

**Q: How long does it take to build reputation?**
A: Usually 10-20 proposals. Consistency matters most.

**Q: Can I delegate to multiple people?**
A: Not currently – you can only delegate to one wallet per realm.

**Q: What if I disagree with my delegate's vote?**
A: Revoke your delegation anytime and vote yourself.

**Q: Do delegates get paid?**
A: Not currently, but DAOs can vote to pay delegates.

---

## Technical Questions

**Q: What blockchain does AlphaPods use?**
A: Solana (both devnet and mainnet-beta supported).

**Q: What are the transaction fees?**
A: Standard Solana fees (~0.00005 SOL per transaction).

**Q: How fast are indexing updates?**
A: Usually ~30 seconds from on-chain event to notification.

**Q: Is the source code open?**
A: Yes, all code is open-source on GitHub.

---

## Error Messages

**"Invalid account type (0x282)"**
- Solution: Ensure you have the governance token in your wallet before `/deposit_power`

**"Transaction simulation failed"**
- Solution: Check your SOL balance for fees. Use `/balance`

**"Proposal not found"**
- Solution: Proposals index with ~30s delay. Try again.

**"Only governance can update"**
- Solution: You're not calling the instruction with the governance authority signature.

---

## Support & Resources

**Documentation:** Check the full guides at alphadpods.io
**GitHub:** Fork, contribute, or submit issues
**Discord:** Join our community
**Telegram:** Direct message support via bot

---

## What's Coming Next

- 🎯 Realms Extensions SDK
- 📊 Advanced governance analytics
- 🔐 Multi-sig integration
- 💼 Organizations with onchain authority
- 🌐 Cross-DAO governance aggregation
- 🚀 Custodial voting option (opt-in)
- 📱 Mobile app

---

# Appendix: Command Reference

## User Commands

| Command | Use Case |
|---------|----------|
| `/start` | Register and link wallet |
| `/realms` | See all available DAOs |
| `/subscribe <pubkey>` | Follow a DAO |
| `/unsubscribe <pubkey>` | Stop following a DAO |
| `/alerts` | View and configure notifications |
| `/balance` | Check your SOL balance |

## Governance Commands

| Command | Use Case |
|---------|----------|
| `/createdao` | Create a new DAO realm |
| `/setup_governance` | Configure voting rules |
| `/deposit_power` | Get voting power in a realm |
| `/gov_propose` | Create a proposal |
| `/gov_vote` | Vote on a proposal |

## Delegate Commands

| Command | Use Case |
|---------|----------|
| `/delegates <pubkey>` | Discover delegates |
| `/delegate_to <pubkey> <wallet>` | Delegate your power |
| `/revoke_delegation <pubkey>` | Take back your power |
| `/my_profile` | Set up delegate profile |
| `/my_stats <pubkey>` | View your delegate stats |

## Alert Commands

| Command | Use Case |
|---------|----------|
| `/set_alert_min <pubkey> <amount>` | Set USD threshold |
| `/authority_alert <pubkey> on\|off` | Toggle upgrade alerts |
| `/alerts_frequency <pubkey> instant\|digest\|off` | Set frequency |

---

**Documentation Version:** 1.0
**Last Updated:** February 28, 2026
**Platform:** AlphaPods Governance

---

*This document covers everything on the AlphaPods documentation website. Copy and paste into Notion, or import as Markdown.*
