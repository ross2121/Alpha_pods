import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PublicKey, Connection } from "@solana/web3.js";
import { GovernanceProposalState, ProposalCategory } from "@prisma/client";

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
 * Helius governance webhook handler.
 * 
 * Handles:
 * - ProposalCreated → creates/updates Realm + GovernanceProposal
 * - (Future: ProposalVoted, ProposalExecuted, etc.)
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
          }
        }
      }
      // Or direct event format
      else if (payload.type === "PROPOSAL_CREATED" || payload.type === "ProposalCreated") {
        await parseProposalCreated(payload, cluster);
      }
    }

    res.status(200).json({ ok: true, indexed: true });
  } catch (error: any) {
    console.error("[governance-webhook] Error handling webhook:", error);
    res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
};


