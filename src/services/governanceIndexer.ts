import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PublicKey, Connection } from "@solana/web3.js";
import { GovernanceProposalState, ProposalCategory, VoteSide } from "@prisma/client";
import { Telegraf } from "telegraf";

const prisma = new PrismaClient();

// Telegram bot instance (will be set from index.ts)
let telegramBot: Telegraf<any> | null = null;

export const setTelegramBot = (bot: Telegraf<any>) => {
  telegramBot = bot;
};

// Basic shape for Helius webhook payloads
type HeliusWebhookPayload = {
  type?: string;
  events?: any[];
  accountData?: any[];
  timestamp?: number;
  [key: string]: any;
};

const parseEstimatedValueUsd = (event: any): number | undefined => {
  const raw =
    event?.estimated_value_usd ??
    event?.estimatedValueUsd ??
    event?.estimatedUsd ??
    event?.valueUsd;

  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const shouldNotifyBySubscription = (subscription: any, proposal: any): boolean => {
  if (
    proposal?.is_upgrade_authority_change &&
    subscription?.notify_on_authority_change === false
  ) {
    return false;
  }

  if (subscription?.min_value_usd !== null && subscription?.min_value_usd !== undefined) {
    if (proposal?.estimated_value_usd === null || proposal?.estimated_value_usd === undefined) {
      return false;
    }
    if (proposal.estimated_value_usd < subscription.min_value_usd) {
      return false;
    }
  }

  return true;
};

const parseRealmCreated = async (event: any, cluster: string = "devnet") => {
  const realmPubkey = event.realm || event.realmPubkey || event.account;
  if (!realmPubkey) {
    console.warn("[governance-indexer] Missing realm pubkey in RealmCreated event:", event);
    return null;
  }

  try {
    new PublicKey(realmPubkey);
  } catch (e) {
    console.error("[governance-indexer] Invalid realm pubkey format:", e);
    return null;
  }

  const realm = await prisma.realm.upsert({
    where: { pubkey: realmPubkey },
    update: {
      name: event.realmName || event.name || `Realm ${realmPubkey.slice(0, 8)}...`,
      cluster,
    },
    create: {
      pubkey: realmPubkey,
      name: event.realmName || event.name || `Realm ${realmPubkey.slice(0, 8)}...`,
      cluster,
    },
  });

  console.log(`[governance-indexer] ✓ Indexed RealmCreated: ${realm.pubkey}`);
  return realm;
};

const parseRealmConfigUpdated = async (event: any, cluster: string = "devnet") => {
  const realmPubkey = event.realm || event.realmPubkey || event.account;
  if (!realmPubkey) {
    console.warn("[governance-indexer] Missing realm pubkey in RealmConfigUpdated event:", event);
    return null;
  }

  try {
    new PublicKey(realmPubkey);
  } catch (e) {
    console.error("[governance-indexer] Invalid realm pubkey format:", e);
    return null;
  }

  const realm = await prisma.realm.upsert({
    where: { pubkey: realmPubkey },
    update: {
      name: event.realmName || event.name || undefined,
      cluster,
    },
    create: {
      pubkey: realmPubkey,
      name: event.realmName || event.name || `Realm ${realmPubkey.slice(0, 8)}...`,
      cluster,
    },
  });

  console.log(`[governance-indexer] ✓ Indexed RealmConfigUpdated: ${realm.pubkey}`);
  return realm;
};

/**
 * Parse ProposalCreated event from Helius and index into DB.
 * 
 * Expected Helius format (approximate):
 * - events: [{ type: "PROPOSAL_CREATED", ... }]
 * - accountData: [{ account: "...", nativeBalanceChange: ... }]
 */
const parseProposalCreated = async (event: any, cluster: string = "devnet") => {
  try {
    // Extract proposal and realm pubkeys from event
    // Helius typically includes account addresses in accountData or events
    const proposalPubkey = event.proposal || event.account || event.proposalPubkey;
    const realmPubkey = event.realm || event.realmPubkey;
    const governancePubkey = event.governance || event.governancePubkey;

    if (!proposalPubkey || !realmPubkey || !governancePubkey) {
      console.warn("[governance-indexer] Missing required fields in ProposalCreated event:", event);
      return null;
    }

    // Validate pubkeys
    try {
      new PublicKey(proposalPubkey);
      new PublicKey(realmPubkey);
      new PublicKey(governancePubkey);
    } catch (e) {
      console.error("[governance-indexer] Invalid pubkey format:", e);
      return null;
    }

    // Fetch proposal details from on-chain (title, description, etc.)
    // For now, use defaults; we'll enrich later
    const title = event.title || `Proposal ${proposalPubkey.slice(0, 8)}...`;
    const description = event.description || "";

    // Upsert Realm (create if doesn't exist)
    const realm = await prisma.realm.upsert({
      where: { pubkey: realmPubkey },
      update: {},
      create: {
        pubkey: realmPubkey,
        name: event.realmName || `Realm ${realmPubkey.slice(0, 8)}...`,
        cluster,
      },
    });

    const estimatedValueUsd = parseEstimatedValueUsd(event);

    // Determine proposal category (heuristic for now)
    let category: ProposalCategory = ProposalCategory.Other;
    const categoryRaw = String(event.category || "").toLowerCase();
    if (categoryRaw === "treasury") {
      category = ProposalCategory.Treasury;
    } else if (categoryRaw === "upgradeauthority" || categoryRaw === "upgrade_authority") {
      category = ProposalCategory.UpgradeAuthority;
    } else if (categoryRaw === "parameter") {
      category = ProposalCategory.Parameter;
    } else if (event.isUpgradeAuthorityChange || title.toLowerCase().includes("upgrade")) {
      category = ProposalCategory.UpgradeAuthority;
    } else if (title.toLowerCase().includes("treasury") || title.toLowerCase().includes("transfer")) {
      category = ProposalCategory.Treasury;
    } else if (title.toLowerCase().includes("fee") || title.toLowerCase().includes("parameter")) {
      category = ProposalCategory.Parameter;
    }

    // Create GovernanceProposal
    const proposal = await prisma.governanceProposal.upsert({
      where: { proposal_pubkey: proposalPubkey },
      update: {
        title,
        description,
        state: GovernanceProposalState.Draft,
        category,
        estimated_value_usd: estimatedValueUsd,
        is_upgrade_authority_change:
          Boolean(event.isUpgradeAuthorityChange) || category === ProposalCategory.UpgradeAuthority,
      },
      create: {
        realmId: realm.id,
        governance_pubkey: governancePubkey,
        proposal_pubkey: proposalPubkey,
        title,
        description,
        state: GovernanceProposalState.Draft,
        category,
        estimated_value_usd: estimatedValueUsd,
        is_upgrade_authority_change:
          Boolean(event.isUpgradeAuthorityChange) || category === ProposalCategory.UpgradeAuthority,
      },
    });

    console.log(`[governance-indexer] ✓ Indexed ProposalCreated: ${proposalPubkey} in realm ${realmPubkey}`);
    
    // Send Telegram notification
    if (telegramBot) {
      try {
        const solscanUrl = `https://solscan.io/proposal/${proposalPubkey}?cluster=${cluster}`;
        const message = `🗳️ **New Governance Proposal Created**\n\n` +
          `**Realm:** ${realm.name}\n` +
          `**Title:** ${title}\n` +
          `**Proposal:** \`${proposalPubkey.slice(0, 8)}...${proposalPubkey.slice(-8)}\`\n` +
          `**Category:** ${category}\n` +
          (estimatedValueUsd !== undefined ? `**Estimated Value (USD):** $${estimatedValueUsd.toLocaleString()}\n` : "") +
          `\n` +
          `[View on Solscan](${solscanUrl})`;
        
        // Send to all users subscribed to this realm
        const subscriptions = await prisma.subscription.findMany({
          where: {
            realmId: realm.id,
            notify_on_new_proposal: true,
          },
          include: { user: true },
        });
        
        for (const sub of subscriptions) {
          if (!shouldNotifyBySubscription(sub, proposal)) {
            continue;
          }
          try {
            await telegramBot.telegram.sendMessage(
              parseInt(sub.user.telegram_id),
              message,
              { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } }
            );
          } catch (err: any) {
            console.error(`[governance-indexer] Failed to notify user ${sub.user.telegram_id}:`, err.message);
          }
        }
      } catch (notifError: any) {
        console.error("[governance-indexer] Error sending Telegram notification:", notifError);
      }
    }
    
    return proposal;
  } catch (error: any) {
    console.error("[governance-indexer] Error parsing ProposalCreated:", error);
    throw error;
  }
};

/**
 * Parse ProposalVoted event from Helius and index into DB.
 * 
 * Expected Helius format:
 * - proposal: proposal pubkey
 * - voter: voter wallet pubkey
 * - vote: 0 (No), 1 (Yes), 2 (Abstain) or "Yes"/"No"/"Abstain"
 * - slot: slot number
 * - signature: transaction signature
 */
const parseProposalVoted = async (event: any, cluster: string = "devnet") => {
  try {
    const proposalPubkey = event.proposal || event.proposalPubkey;
    const voterPubkey = event.voter || event.voterPubkey;
    const voteValue = event.vote !== undefined ? event.vote : event.side;
    const slot = event.slot ? BigInt(event.slot) : BigInt(0);
    const txSignature = event.signature || event.txSignature || event.tx || "";

    if (!proposalPubkey || !voterPubkey || voteValue === undefined) {
      console.warn("[governance-indexer] Missing required fields in ProposalVoted event:", event);
      return null;
    }

    // Validate pubkeys
    try {
      new PublicKey(proposalPubkey);
      new PublicKey(voterPubkey);
    } catch (e) {
      console.error("[governance-indexer] Invalid pubkey format:", e);
      return null;
    }

    // Find the proposal
    const proposal = await prisma.governanceProposal.findUnique({
      where: { proposal_pubkey: proposalPubkey },
    });

    if (!proposal) {
      console.warn(`[governance-indexer] Proposal ${proposalPubkey} not found in DB. Skipping vote.`);
      return null;
    }

    // Map vote value to VoteSide enum
    let voteSide: VoteSide;
    if (typeof voteValue === "string") {
      const voteLower = voteValue.toLowerCase();
      if (voteLower === "yes" || voteLower === "1") {
        voteSide = VoteSide.Yes;
      } else if (voteLower === "no" || voteLower === "0") {
        voteSide = VoteSide.No;
      } else if (voteLower === "abstain" || voteLower === "2") {
        voteSide = VoteSide.Abstain;
      } else {
        console.warn(`[governance-indexer] Unknown vote value: ${voteValue}, defaulting to Abstain`);
        voteSide = VoteSide.Abstain;
      }
    } else {
      // Numeric: 0=No, 1=Yes, 2=Abstain
      if (voteValue === 1) {
        voteSide = VoteSide.Yes;
      } else if (voteValue === 0) {
        voteSide = VoteSide.No;
      } else {
        voteSide = VoteSide.Abstain;
      }
    }

  
    const existingVote = await prisma.governanceVote.findFirst({
      where: {
        proposalId: proposal.id,
        voter_pubkey: voterPubkey,
        tx_signature: txSignature || undefined,
      },
    });

    if (existingVote) {
      console.log(`[governance-indexer] Vote already exists: ${voterPubkey} on proposal ${proposalPubkey}`);
      return existingVote;
    }

    const vote = await prisma.governanceVote.create({
      data: {
        proposalId: proposal.id,
        voter_pubkey: voterPubkey,
        side: voteSide,
        slot,
        tx_signature: txSignature || `vote-${Date.now()}`,
      },
    });

    // Update proposal state to Voting if it's still Draft
    if (proposal.state === GovernanceProposalState.Draft) {
      await prisma.governanceProposal.update({
        where: { id: proposal.id },
        data: { state: GovernanceProposalState.Voting },
      });
      console.log(`[governance-indexer] Updated proposal ${proposalPubkey} state to Voting`);
    }

    console.log(`[governance-indexer] ✓ Indexed ProposalVoted: ${voterPubkey} voted ${voteSide} on ${proposalPubkey}`);
    
    // Send Telegram notification (optional - can be disabled for high-volume votes)
    if (telegramBot) {
      try {
        const voteEmoji = voteSide === VoteSide.Yes ? "✅" : voteSide === VoteSide.No ? "❌" : "⚪";
        const message = `${voteEmoji} **New Vote Cast**\n\n` +
          `**Proposal:** ${proposal.title}\n` +
          `**Voter:** \`${voterPubkey.slice(0, 8)}...${voterPubkey.slice(-8)}\`\n` +
          `**Vote:** ${voteSide}\n` +
          `**Proposal:** \`${proposalPubkey.slice(0, 8)}...${proposalPubkey.slice(-8)}\``;
        
        // Send to users subscribed to this realm (only if they want vote notifications)
        const subscriptions = await prisma.subscription.findMany({
          where: {
            realmId: proposal.realmId,
            notify_on_new_proposal: true, // Using same flag for now
          },
          include: { user: true },
        });
        
        for (const sub of subscriptions) {
          if (!shouldNotifyBySubscription(sub, proposal)) {
            continue;
          }
          try {
            await telegramBot.telegram.sendMessage(
              parseInt(sub.user.telegram_id),
              message,
              { parse_mode: 'Markdown' }
            );
          } catch (err: any) {
            console.error(`[governance-indexer] Failed to notify user ${sub.user.telegram_id}:`, err.message);
          }
        }
      } catch (notifError: any) {
        console.error("[governance-indexer] Error sending Telegram notification:", notifError);
      }
    }
    
    return vote;
  } catch (error: any) {
    console.error("[governance-indexer] Error parsing ProposalVoted:", error);
    throw error;
  }
};


const parseProposalStateChange = async (event: any, newState: GovernanceProposalState, cluster: string = "devnet") => {
  try {
    const proposalPubkey = event.proposal || event.proposalPubkey;
    
    if (!proposalPubkey) {
      console.warn("[governance-indexer] Missing proposal pubkey in state change event:", event);
      return null;
    }

    // Validate pubkey
    try {
      new PublicKey(proposalPubkey);
    } catch (e) {
      console.error("[governance-indexer] Invalid pubkey format:", e);
      return null;
    }

    // Find and update the proposal
    const proposal = await prisma.governanceProposal.findUnique({
      where: { proposal_pubkey: proposalPubkey },
      include: { realm: true },
    });

    if (!proposal) {
      console.warn(`[governance-indexer] Proposal ${proposalPubkey} not found in DB. Skipping state update.`);
      return null;
    }

    // Update proposal state
    const updated = await prisma.governanceProposal.update({
      where: { id: proposal.id },
      data: { state: newState },
    });

    console.log(`[governance-indexer] ✓ Updated proposal ${proposalPubkey} state to ${newState}`);
    
    // Send Telegram notification
    if (telegramBot) {
      try {
        const stateEmoji = newState === GovernanceProposalState.Executed ? "✅" : 
                          newState === GovernanceProposalState.Defeated ? "❌" : 
                          newState === GovernanceProposalState.Cancelled ? "🚫" : "📊";
        const stateText = newState === GovernanceProposalState.Executed ? "EXECUTED" :
                         newState === GovernanceProposalState.Defeated ? "DEFEATED" :
                         newState === GovernanceProposalState.Cancelled ? "CANCELLED" : newState;
        
        const solscanUrl = `https://solscan.io/proposal/${proposalPubkey}?cluster=${cluster}`;
        const message = `${stateEmoji} **Proposal ${stateText}**\n\n` +
          `**Realm:** ${proposal.realm.name}\n` +
          `**Title:** ${proposal.title}\n` +
          `**Proposal:** \`${proposalPubkey.slice(0, 8)}...${proposalPubkey.slice(-8)}\`\n\n` +
          `[View on Solscan](${solscanUrl})`;
        
        // Send to subscribed users
        const subscriptions = await prisma.subscription.findMany({
          where: {
            realmId: proposal.realmId,
            notify_on_final_result: true,
          },
          include: { user: true },
        });
        
        for (const sub of subscriptions) {
          if (!shouldNotifyBySubscription(sub, updated)) {
            continue;
          }
          try {
            await telegramBot.telegram.sendMessage(
              parseInt(sub.user.telegram_id),
              message,
              { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } }
            );
          } catch (err: any) {
            console.error(`[governance-indexer] Failed to notify user ${sub.user.telegram_id}:`, err.message);
          }
        }
      } catch (notifError: any) {
        console.error("[governance-indexer] Error sending Telegram notification:", notifError);
      }
    }
    
    return updated;
  } catch (error: any) {
    console.error("[governance-indexer] Error parsing proposal state change:", error);
    throw error;
  }
};

/**
 * Helper: simulate full governance notification flow for a Telegram user,
 * without needing curl / external webhooks.
 *
 * - Ensures Realm + Proposal exist (using fixed test pubkeys)
 * - Ensures Subscription exists for the user on that realm
 * - Triggers:
 *    - ProposalCreated
 *    - ProposalVoted
 *    - ProposalExecuted
 */
export const simulateGovernanceNotificationsForTelegramUser = async (telegramId: string) => {
  if (!telegramId) {
    throw new Error("Missing telegramId");
  }

  const cluster = process.env.RPC_URL?.includes("devnet") ? "devnet" : "mainnet-beta";

  // 1) Ensure user exists
  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });

  if (!user) {
    throw new Error(
      `No user found with telegram_id=${telegramId}. Please /start the bot first so your user is created.`
    );
  }

  // 2) Fixed test addresses (only for local testing)
  const TEST_REALM_PUBKEY = "FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK";
  const TEST_PROPOSAL_PUBKEY = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
  const TEST_GOVERNANCE_PUBKEY = "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw";

  // 3) Realm + Proposal (via parseProposalCreated so DB and notifications stay consistent)
  await parseProposalCreated(
    {
      type: "PROPOSAL_CREATED",
      proposal: TEST_PROPOSAL_PUBKEY,
      realm: TEST_REALM_PUBKEY,
      governance: TEST_GOVERNANCE_PUBKEY,
      realmName: "Test DAO (Telegram)",
      title: "Test Proposal from Telegram",
      description: "This is a test proposal triggered from /test_alerts.",
    },
    cluster
  );

  // Fetch realm and proposal that were just ensured
  const realm = await prisma.realm.findUnique({ where: { pubkey: TEST_REALM_PUBKEY } });
  const proposal = await prisma.governanceProposal.findUnique({
    where: { proposal_pubkey: TEST_PROPOSAL_PUBKEY },
  });

  if (!realm || !proposal) {
    throw new Error("Failed to create or load test realm/proposal");
  }

  // 4) Ensure Subscription exists for this user + realm
  let subscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      realmId: realm.id,
    },
  });

  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        realmId: realm.id,
        notify_on_new_proposal: true,
        notify_on_final_result: true,
      },
    });
  } else {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        notify_on_new_proposal: true,
        notify_on_final_result: true,
      },
    });
  }

  // 5) Simulate a vote
  const fakeVoter = (user as any).wallet_pubkey || (user as any).public_key || "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty";

  await parseProposalVoted(
    {
      type: "PROPOSAL_VOTED",
      proposal: TEST_PROPOSAL_PUBKEY,
      voter: fakeVoter,
      vote: 1,
      slot: 123456789,
      signature: `test-${Date.now()}`,
    },
    cluster
  );

  // 6) Simulate execution (final result)
  await parseProposalStateChange(
    {
      proposal: TEST_PROPOSAL_PUBKEY,
    },
    GovernanceProposalState.Executed,
    cluster
  );

  return { realmPubkey: TEST_REALM_PUBKEY, proposalPubkey: TEST_PROPOSAL_PUBKEY };
};

/**
 * Helius governance webhook handler.
 * 
 * Handles:
 * - ProposalCreated → creates/updates Realm + GovernanceProposal
 * - ProposalVoted → creates GovernanceVote records
 * - ProposalExecuted → updates proposal state to Executed
 * - ProposalCancelled → updates proposal state to Cancelled
 */
export const handleGovernanceWebhook = async (req: Request, res: Response) => {
  const body = req.body as HeliusWebhookPayload | HeliusWebhookPayload[];

  try {
    console.log("[governance-webhook] Incoming payload:", JSON.stringify(body, null, 2));

    // Handle array of events or single event
    const events = Array.isArray(body) ? body : [body];
    const cluster = process.env.RPC_URL?.includes("devnet") ? "devnet" : "mainnet-beta";

    for (const payload of events) {
      // Check if it's an events array format
      if (payload.events && Array.isArray(payload.events)) {
        for (const event of payload.events) {
          if (event.type === "PROPOSAL_CREATED" || event.type === "ProposalCreated") {
            await parseProposalCreated(event, cluster);
          } else if (event.type === "REALM_CREATED" || event.type === "RealmCreated") {
            await parseRealmCreated(event, cluster);
          } else if (event.type === "REALM_CONFIG_UPDATED" || event.type === "RealmConfigUpdated") {
            await parseRealmConfigUpdated(event, cluster);
          } else if (event.type === "PROPOSAL_VOTED" || event.type === "ProposalVoted") {
            await parseProposalVoted(event, cluster);
          } else if (event.type === "PROPOSAL_EXECUTED" || event.type === "ProposalExecuted") {
            await parseProposalStateChange(event, GovernanceProposalState.Executed, cluster);
          } else if (event.type === "PROPOSAL_CANCELLED" || event.type === "ProposalCancelled") {
            await parseProposalStateChange(event, GovernanceProposalState.Cancelled, cluster);
          } else if (event.type === "PROPOSAL_DEFEATED" || event.type === "ProposalDefeated") {
            await parseProposalStateChange(event, GovernanceProposalState.Defeated, cluster);
          }
        }
      }
      // Or direct event format
      else {
        if (payload.type === "PROPOSAL_CREATED" || payload.type === "ProposalCreated") {
          await parseProposalCreated(payload, cluster);
        } else if (payload.type === "REALM_CREATED" || payload.type === "RealmCreated") {
          await parseRealmCreated(payload, cluster);
        } else if (payload.type === "REALM_CONFIG_UPDATED" || payload.type === "RealmConfigUpdated") {
          await parseRealmConfigUpdated(payload, cluster);
        } else if (payload.type === "PROPOSAL_VOTED" || payload.type === "ProposalVoted") {
          await parseProposalVoted(payload, cluster);
        } else if (payload.type === "PROPOSAL_EXECUTED" || payload.type === "ProposalExecuted") {
          await parseProposalStateChange(payload, GovernanceProposalState.Executed, cluster);
        } else if (payload.type === "PROPOSAL_CANCELLED" || payload.type === "ProposalCancelled") {
          await parseProposalStateChange(payload, GovernanceProposalState.Cancelled, cluster);
        } else if (payload.type === "PROPOSAL_DEFEATED" || payload.type === "ProposalDefeated") {
          await parseProposalStateChange(payload, GovernanceProposalState.Defeated, cluster);
        }
      }
    }

    res.status(200).json({ ok: true, indexed: true });
  } catch (error: any) {
    console.error("[governance-webhook] Error handling webhook:", error);
    res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
};
