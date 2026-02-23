import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PublicKey, Connection } from "@solana/web3.js";
import { GovernanceProposalState, ProposalCategory, VoteSide } from "@prisma/client";

const prisma = new PrismaClient();

// Basic shape for Helius webhook payloads
type HeliusWebhookPayload = {
  type?: string;
  events?: any[];
  accountData?: any[];
  timestamp?: number;
  [key: string]: any;
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

    // Determine proposal category (heuristic for now)
    let category: ProposalCategory = ProposalCategory.Other;
    if (event.isUpgradeAuthorityChange || title.toLowerCase().includes("upgrade")) {
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
      },
      create: {
        realmId: realm.id,
        governance_pubkey: governancePubkey,
        proposal_pubkey: proposalPubkey,
        title,
        description,
        state: GovernanceProposalState.Draft,
        category,
        is_upgrade_authority_change: category === ProposalCategory.UpgradeAuthority,
      },
    });

    console.log(`[governance-indexer] ✓ Indexed ProposalCreated: ${proposalPubkey} in realm ${realmPubkey}`);
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

    // Create or update vote (upsert by proposal + voter to avoid duplicates)
    // Note: Prisma doesn't have unique constraint on (proposalId, voter_pubkey),
    // so we check if vote exists first
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
    return vote;
  } catch (error: any) {
    console.error("[governance-indexer] Error parsing ProposalVoted:", error);
    throw error;
  }
};

/**
 * Helius governance webhook handler.
 * 
 * Handles:
 * - ProposalCreated → creates/updates Realm + GovernanceProposal
 * - ProposalVoted → creates GovernanceVote records
 * - (Future: ProposalExecuted, ProposalCancelled, etc.)
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
          } else if (event.type === "PROPOSAL_VOTED" || event.type === "ProposalVoted") {
            await parseProposalVoted(event, cluster);
          }
        }
      }
      // Or direct event format
      else {
        if (payload.type === "PROPOSAL_CREATED" || payload.type === "ProposalCreated") {
          await parseProposalCreated(payload, cluster);
        } else if (payload.type === "PROPOSAL_VOTED" || payload.type === "ProposalVoted") {
          await parseProposalVoted(payload, cluster);
        }
      }
    }

    res.status(200).json({ ok: true, indexed: true });
  } catch (error: any) {
    console.error("[governance-webhook] Error handling webhook:", error);
    res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
};


