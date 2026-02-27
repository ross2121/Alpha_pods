import { PrismaClient, GovernanceProposalState, ProposalCategory } from "@prisma/client";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  getAllGovernances,
  getAllProposals,
  getGovernanceAccounts,
  Governance,
  Proposal,
  ProposalState,
  ProposalTransaction,
} from "@realms-today/spl-governance";

const prisma = new PrismaClient();

// Mainnet SPL Governance program ID (Realms)
const GOVERNANCE_PROGRAM_ID = new PublicKey(
  "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw"
);

let isPolling = false;

const getConnection = () => {
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
};

const mapProposalState = (state: ProposalState): GovernanceProposalState => {
  switch (state) {
    case ProposalState.Draft:
      return GovernanceProposalState.Draft;
    case ProposalState.Voting:
      return GovernanceProposalState.Voting;
    case ProposalState.Succeeded:
    case ProposalState.Executing:
    case ProposalState.Completed:
    case ProposalState.ExecutingWithErrors:
      return GovernanceProposalState.Succeeded;
    case ProposalState.Cancelled:
    case ProposalState.Vetoed:
      return GovernanceProposalState.Cancelled;
    case ProposalState.Defeated:
      return GovernanceProposalState.Defeated;
    default:
      return GovernanceProposalState.Draft;
  }
};

const bnToDate = (value: any | null): Date | null => {
  if (!value) return null;
  try {
    const seconds = typeof value.toNumber === "function" ? value.toNumber() : Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return new Date(seconds * 1000);
  } catch {
    return null;
  }
};

const upsertGovernanceAccountsForRealm = async (
  connection: Connection,
  realm: { id: string; pubkey: string }
) => {
  let realmPk: PublicKey;
  try {
    realmPk = new PublicKey(realm.pubkey);
  } catch (e) {
    console.error(
      `[governance-poller] Invalid realm pubkey in DB, skipping: ${realm.pubkey}`,
      e
    );
    return;
  }

  let governances;
  try {
    governances = await getAllGovernances(connection, GOVERNANCE_PROGRAM_ID, realmPk);
  } catch (e) {
    console.error(
      `[governance-poller] Failed to fetch governances for realm ${realm.pubkey}:`,
      e
    );
    return;
  }

  for (const g of governances) {
    const account: Governance = g.account as any;
    try {
      await prisma.governanceAccount.upsert({
        where: { governance_pubkey: g.pubkey.toBase58() },
        update: {
          realmId: realm.id,
          governed_account: account.governedAccount.toBase58(),
          proposal_count: account.proposalCount,
          active_proposal_count: BigInt(account.activeProposalCount.toString()),
        },
        create: {
          realmId: realm.id,
          governance_pubkey: g.pubkey.toBase58(),
          governed_account: account.governedAccount.toBase58(),
          proposal_count: account.proposalCount,
          active_proposal_count: BigInt(account.activeProposalCount.toString()),
        },
      });
    } catch (e) {
      console.error(
        `[governance-poller] Failed to upsert GovernanceAccount ${g.pubkey.toBase58()}:`,
        e
      );
    }
  }
};

const upsertProposalsForRealm = async (
  connection: Connection,
  realm: { id: string; pubkey: string; name: string }
) => {
  let realmPk: PublicKey;
  try {
    realmPk = new PublicKey(realm.pubkey);
  } catch (e) {
    console.error(
      `[governance-poller] Invalid realm pubkey in DB when fetching proposals, skipping: ${realm.pubkey}`,
      e
    );
    return;
  }

  let proposalsNested: Array<{ pubkey: PublicKey; account: Proposal }>[];
  try {
    proposalsNested = (await getAllProposals(
      connection,
      GOVERNANCE_PROGRAM_ID,
      realmPk
    )) as any;
  } catch (e) {
    console.error(
      `[governance-poller] Failed to fetch proposals for realm ${realm.pubkey}:`,
      e
    );
    return;
  }

  const proposalsFlat = proposalsNested.flat();

  for (const p of proposalsFlat) {
    const account: Proposal = p.account as any;
    const proposalPubkey = p.pubkey.toBase58();
    const governancePubkey = account.governance.toBase58();

    const votingStart = bnToDate(account.votingAt ?? account.startVotingAt);
    const votingEnd =
      bnToDate(account.votingCompletedAt) ||
      (votingStart && account.maxVotingTime
        ? new Date(votingStart.getTime() + account.maxVotingTime * 1000)
        : null);

    const state = mapProposalState(account.state);
    const title = account.name || `Proposal ${proposalPubkey.slice(0, 8)}...`;
    const description =
      account.descriptionLink || `On-chain proposal for realm ${realm.name}`;

    try {
      await prisma.governanceProposal.upsert({
        where: { proposal_pubkey: proposalPubkey },
        update: {
          title,
          description,
          state,
          voting_start: votingStart ?? undefined,
          voting_end: votingEnd ?? undefined,
        },
        create: {
          realmId: realm.id,
          governance_pubkey: governancePubkey,
          proposal_pubkey: proposalPubkey,
          title,
          description,
          state,
          voting_start: votingStart ?? undefined,
          voting_end: votingEnd ?? undefined,
          category: ProposalCategory.Other,
          estimated_value_usd: null,
          is_upgrade_authority_change: false,
        },
      });
    } catch (e) {
      console.error(
        `[governance-poller] Failed to upsert GovernanceProposal ${proposalPubkey}:`,
        e
      );
    }
  }
};

const indexProposalInstructions = async (connection: Connection) => {
  let transactions;
  try {
    transactions = await getGovernanceAccounts(
      connection,
      GOVERNANCE_PROGRAM_ID,
      ProposalTransaction as any
    );
  } catch (e) {
    console.error(
      "[governance-poller] Failed to fetch ProposalTransaction accounts:",
      e
    );
    return;
  }

  for (const tx of transactions) {
    const account: ProposalTransaction = tx.account as any;
    const proposalPk = account.proposal.toBase58();
    const instructionIndex = account.instructionIndex;
    const executedAt = bnToDate(account.executedAt);

    const proposal = await prisma.governanceProposal.findUnique({
      where: { proposal_pubkey: proposalPk },
      select: { id: true },
    });

    if (!proposal) {
      continue;
    }

    try {
      const singleIx = account.getSingleInstruction();
      const programId = singleIx.programId.toBase58();
      const accounts =
        singleIx.accounts?.map((a: any) => ({
          pubkey: a.pubkey.toBase58(),
          isSigner: Boolean(a.isSigner),
          isWritable: Boolean(a.isWritable),
        })) ?? [];
      const dataBase64 = Buffer.from(singleIx.data).toString("base64");

      await prisma.proposalInstruction.upsert({
        where: {
          proposalId_instruction_index: {
            proposalId: proposal.id,
            instruction_index: instructionIndex,
          } as any,
        },
        update: {
          program_id: programId,
          accounts,
          data_base64: dataBase64,
          hold_up_time: account.holdUpTime,
          executed_at: executedAt ?? undefined,
          execution_status: String(account.executionStatus),
        },
        create: {
          proposalId: proposal.id,
          instruction_index: instructionIndex,
          program_id: programId,
          accounts,
          data_base64: dataBase64,
          hold_up_time: account.holdUpTime,
          executed_at: executedAt ?? undefined,
          execution_status: String(account.executionStatus),
        },
      });
    } catch (e) {
      console.error(
        `[governance-poller] Failed to upsert ProposalInstruction for proposal ${proposalPk}, index ${instructionIndex}:`,
        e
      );
    }
  }
};

const pollGovernanceOnce = async () => {
  if (isPolling) {
    console.log("[governance-poller] Previous poll still running, skipping.");
    return;
  }

  isPolling = true;
  console.log("[governance-poller] Starting poll cycle...");

  try {
    const connection = getConnection();
    const realms = await prisma.realm.findMany({
      select: { id: true, pubkey: true, name: true },
    });

    if (!realms.length) {
      console.log(
        "[governance-poller] No realms in DB yet, skipping this poll cycle."
      );
      return;
    }

    for (const realm of realms) {
      await upsertGovernanceAccountsForRealm(connection, realm);
      await upsertProposalsForRealm(connection, realm);
    }

    await indexProposalInstructions(connection);

    console.log("[governance-poller] Poll cycle completed.");
  } catch (e) {
    console.error("[governance-poller] Error in poll cycle:", e);
  } finally {
    isPolling = false;
  }
};

export const startGovernancePolling = () => {
  const intervalMs = Number(
    process.env.GOVERNANCE_POLL_INTERVAL_MS || "60000"
  );

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    console.log(
      "[governance-poller] Polling disabled (GOVERNANCE_POLL_INTERVAL_MS <= 0)."
    );
    return;
  }

  console.log(
    `[governance-poller] Starting polling every ${intervalMs}ms using RPC_URL=${process.env.RPC_URL}`
  );

  // Run immediately on startup, then on interval
  pollGovernanceOnce().catch((e) =>
    console.error("[governance-poller] Initial poll failed:", e)
  );

  setInterval(() => {
    pollGovernanceOnce().catch((e) =>
      console.error("[governance-poller] Poll failed:", e)
    );
  }, intervalMs);
};

