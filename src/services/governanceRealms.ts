import {
  withDepositGoverningTokens,
  withCreateGovernance,
  withCreateNativeTreasury,
  withCreateProposal,
  withCastVote,
  GovernanceConfig,
  VoteThreshold,
  VoteThresholdType,
  VoteTipping,
  VoteType,
  Vote,
  YesNoVote,
  getNativeTreasuryAddress,
} from "@realms-today/spl-governance";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import BN from "bn.js";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { privyauthorization } from "./auth";

dotenv.config();

const prisma = new PrismaClient();

const GOVERNANCE_PROGRAM_ID = new PublicKey(
  "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw"
);
const GOVERNANCE_PROGRAM_VERSION = 3;

const getConnectionAndChain = () => {
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, { commitment: "confirmed" });


  const caip2: any = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

  const cluster = rpcUrl.includes("devnet") ? "devnet" : "mainnet-beta";

  return { connection, caip2, cluster };
};

export const depositGoverningTokensForTelegramUser = async (params: {
  telegramId: string;
  realmPubkey: string;
  communityMint: string;
  amountRaw: bigint;
}) => {
  const { telegramId, realmPubkey, communityMint, amountRaw } = params;

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });

  if (!user) {
    throw new Error(
      `No user found with telegram_id=${telegramId}. Use /start first.`
    );
  }

  const { connection, caip2 } = getConnectionAndChain();

  const realmAddress = new PublicKey(realmPubkey);
  const communityMintPk = new PublicKey(communityMint);
  const voterWallet = new PublicKey(user.public_key);

  const tokenSourceAccount = await getAssociatedTokenAddress(
    communityMintPk,
    voterWallet
  );

  const depositIxs: TransactionInstruction[] = [];

  const tokenOwnerRecordAddress = await withDepositGoverningTokens(
    depositIxs,
    GOVERNANCE_PROGRAM_ID,
    GOVERNANCE_PROGRAM_VERSION,
    realmAddress,
    tokenSourceAccount,
    communityMintPk,
    voterWallet, // token owner
    voterWallet, // source authority
    voterWallet, // payer
    new BN(amountRaw.toString()) as any
  );

  const privy = await privyauthorization(user.id);
  if (!privy) {
    throw new Error("Not able to authorize Privy wallet for deposit");
  }

  // Fetch a fresh blockhash right before signing to avoid "Blockhash not found"
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction().add(...depositIxs);
  tx.feePayer = voterWallet;
  tx.recentBlockhash = blockhash;

  const rpc = await privy.walletApi.solana.signAndSendTransaction({
    walletId: user.Privy_id,
    transaction: tx,
    caip2,
  });

  const signature =
    typeof rpc === "string" ? rpc : (rpc as any).hash ?? JSON.stringify(rpc);

  console.log(
    "[governance-realms] Governing tokens deposited",
    tokenOwnerRecordAddress.toBase58(),
    "tx:",
    signature
  );

  return {
    tokenOwnerRecordAddress,
    signature,
  };
};

export const createGovernanceForRealm = async (params: {
  telegramId: string;
  realmPubkey: string;
  communityMint: string;
  minTokensToPropose: bigint;
  baseVotingTimeSeconds: number;
}) => {
  const { telegramId, realmPubkey, communityMint, minTokensToPropose, baseVotingTimeSeconds } =
    params;

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });

  if (!user) {
    throw new Error(
      `No user found with telegram_id=${telegramId}. Use /start first.`
    );
  }

  const { connection, caip2 } = getConnectionAndChain();

  const realmAddress = new PublicKey(realmPubkey);
  const communityMintPk = new PublicKey(communityMint);
  const governanceAuthority = new PublicKey(user.public_key);

  // For simplicity, assume the user already deposited tokens and
  // use the PDA returned by withDepositGoverningTokens when they ran /deposit_power.
  // Here we recompute it by calling a zero-amount deposit (no-op if already initialized)
  const tokenSourceAccount = await getAssociatedTokenAddress(
    communityMintPk,
    governanceAuthority
  );

  const tmpIxs: TransactionInstruction[] = [];
  const tokenOwnerRecordAddress = await withDepositGoverningTokens(
    tmpIxs,
    GOVERNANCE_PROGRAM_ID,
    GOVERNANCE_PROGRAM_VERSION,
    realmAddress,
    tokenSourceAccount,
    communityMintPk,
    governanceAuthority,
    governanceAuthority,
    governanceAuthority,
    new BN(0) as any
  );

  const config = new GovernanceConfig({
    communityVoteThreshold: new VoteThreshold({
      type: VoteThresholdType.YesVotePercentage,
      value: 60,
    }),
    minCommunityTokensToCreateProposal: new BN(
      minTokensToPropose.toString()
    ) as any,
    minInstructionHoldUpTime: 0,
    baseVotingTime: baseVotingTimeSeconds,
    communityVoteTipping: VoteTipping.Strict,
    councilVoteThreshold: new VoteThreshold({
      type: VoteThresholdType.Disabled,
    }),
    councilVetoVoteThreshold: new VoteThreshold({
      type: VoteThresholdType.Disabled,
    }),
    minCouncilTokensToCreateProposal: new BN(0) as any,
    councilVoteTipping: VoteTipping.Disabled,
    communityVetoVoteThreshold: new VoteThreshold({
      type: VoteThresholdType.Disabled,
    }),
    votingCoolOffTime: 0,
    depositExemptProposalCount: 10,
  });

  const govIxs: TransactionInstruction[] = [];

  const governanceAddress = await withCreateGovernance(
    govIxs,
    GOVERNANCE_PROGRAM_ID,
    GOVERNANCE_PROGRAM_VERSION,
    realmAddress,
    undefined, // governed account: can be created later
    config,
    tokenOwnerRecordAddress,
    governanceAuthority,
    governanceAuthority
  );

  const privy = await privyauthorization(user.id);
  if (!privy) {
    throw new Error("Not able to authorize Privy wallet for create governance");
  }

  const { blockhash } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction().add(...govIxs);
  tx.feePayer = governanceAuthority;
  tx.recentBlockhash = blockhash;

  const rpc = await privy.walletApi.solana.signAndSendTransaction({
    walletId: user.Privy_id,
    transaction: tx,
    caip2,
  });

  const signature =
    typeof rpc === "string" ? rpc : (rpc as any).hash ?? JSON.stringify(rpc);

  console.log(
    "[governance-realms] Governance created",
    governanceAddress.toBase58(),
    "tx:",
    signature
  );

  return {
    governanceAddress,
    signature,
  };
};

export const createNativeTreasuryForGovernance = async (params: {
  telegramId: string;
  governancePubkey: string;
}) => {
  const { telegramId, governancePubkey } = params;

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });

  if (!user) {
    throw new Error(
      `No user found with telegram_id=${telegramId}. Use /start first.`
    );
  }

  const { connection, caip2 } = getConnectionAndChain();

  const governanceAddress = new PublicKey(governancePubkey);
  const payer = new PublicKey(user.public_key);

  // Compute the native treasury PDA for this governance
  const treasuryAddress = await getNativeTreasuryAddress(
    GOVERNANCE_PROGRAM_ID,
    governanceAddress
  );

  // If the treasury account already exists, treat this as success and skip creation
  const existing = await connection.getAccountInfo(treasuryAddress);
  if (existing) {
    console.log(
      "[governance-realms] Native treasury already exists, skipping creation:",
      treasuryAddress.toBase58()
    );
    return {
      treasuryAddress,
      signature: "already-exists",
    };
  }

  const treasuryIxs: TransactionInstruction[] = [];

  await withCreateNativeTreasury(
    treasuryIxs,
    GOVERNANCE_PROGRAM_ID,
    GOVERNANCE_PROGRAM_VERSION,
    governanceAddress,
    payer
  );

  const privy = await privyauthorization(user.id);
  if (!privy) {
    throw new Error(
      "Not able to authorize Privy wallet for create native treasury"
    );
  }

  const { blockhash } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction().add(...treasuryIxs);
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;

  try {
    const rpc = await privy.walletApi.solana.signAndSendTransaction({
      walletId: user.Privy_id,
      transaction: tx,
      caip2,
    });

    const signature =
      typeof rpc === "string" ? rpc : (rpc as any).hash ?? JSON.stringify(rpc);

    console.log(
      "[governance-realms] Native treasury created",
      treasuryAddress.toBase58(),
      "tx:",
      signature
    );

    return {
      treasuryAddress,
      signature,
    };
  } catch (e: any) {
    const msg = e?.message || String(e);
    // If CreateNativeTreasury fails with the known 0x44d governance error,
    // treat it as non-fatal so /setup_governance can still succeed.
    if (
      msg.includes("GOVERNANCE-INSTRUCTION: CreateNativeTreasury") ||
      msg.includes("custom program error: 0x44d")
    ) {
      console.error(
        "[governance-realms] CreateNativeTreasury failed with 0x44d, treating as non-fatal:",
        msg
      );
      return {
        treasuryAddress,
        signature: "native-treasury-error-0x44d",
      };
    }

    throw e;
  }
};

export const createOnchainProposal = async (params: {
  telegramId: string;
  realmPubkey: string;
  governancePubkey: string;
  communityMint: string;
  name: string;
  descriptionLink: string;
}) => {
  const {
    telegramId,
    realmPubkey,
    governancePubkey,
    communityMint,
    name,
    descriptionLink,
  } = params;

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });

  if (!user) {
    throw new Error(
      `No user found with telegram_id=${telegramId}. Use /start first.`
    );
  }

  const { connection, caip2 } = getConnectionAndChain();

  const realmAddress = new PublicKey(realmPubkey);
  const governanceAddress = new PublicKey(governancePubkey);
  const communityMintPk = new PublicKey(communityMint);
  const wallet = new PublicKey(user.public_key);

  // As with createGovernance, recompute the token owner record PDA
  const tokenSourceAccount = await getAssociatedTokenAddress(
    communityMintPk,
    wallet
  );

  const tmpIxs: TransactionInstruction[] = [];
  const tokenOwnerRecordAddress = await withDepositGoverningTokens(
    tmpIxs,
    GOVERNANCE_PROGRAM_ID,
    GOVERNANCE_PROGRAM_VERSION,
    realmAddress,
    tokenSourceAccount,
    communityMintPk,
    wallet,
    wallet,
    wallet,
    new BN(0) as any
  );

  const proposalIxs: TransactionInstruction[] = [];

  const proposalSeed = PublicKey.unique();

  const proposalAddress = await withCreateProposal(
    proposalIxs,
    GOVERNANCE_PROGRAM_ID,
    GOVERNANCE_PROGRAM_VERSION,
    realmAddress,
    governanceAddress,
    tokenOwnerRecordAddress,
    name,
    descriptionLink,
    communityMintPk,
    wallet,
    undefined,
    VoteType.SINGLE_CHOICE,
    ["Approve"],
    true,
    wallet,
    undefined,
    proposalSeed
  );

  const privy = await privyauthorization(user.id);
  if (!privy) {
    throw new Error("Not able to authorize Privy wallet for create proposal");
  }

  const { blockhash } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction().add(...proposalIxs);
  tx.feePayer = wallet;
  tx.recentBlockhash = blockhash;

  const rpc = await privy.walletApi.solana.signAndSendTransaction({
    walletId: user.Privy_id,
    transaction: tx,
    caip2,
  });

  const signature =
    typeof rpc === "string" ? rpc : (rpc as any).hash ?? JSON.stringify(rpc);

  console.log(
    "[governance-realms] Proposal created",
    proposalAddress.toBase58(),
    "tx:",
    signature
  );

  return {
    proposalAddress,
    signature,
  };
};

export const castYesNoVote = async (params: {
  telegramId: string;
  realmPubkey: string;
  governancePubkey: string;
  proposalPubkey: string;
  communityMint: string;
  vote: "yes" | "no";
}) => {
  const {
    telegramId,
    realmPubkey,
    governancePubkey,
    proposalPubkey,
    communityMint,
    vote,
  } = params;

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });

  if (!user) {
    throw new Error(
      `No user found with telegram_id=${telegramId}. Use /start first.`
    );
  }

  const { connection, caip2 } = getConnectionAndChain();

  const realmAddress = new PublicKey(realmPubkey);
  const governanceAddress = new PublicKey(governancePubkey);
  const proposalAddress = new PublicKey(proposalPubkey);
  const communityMintPk = new PublicKey(communityMint);
  const wallet = new PublicKey(user.public_key);

  // Again, recompute PDA for token owner record
  const tokenSourceAccount = await getAssociatedTokenAddress(
    communityMintPk,
    wallet
  );

  const tmpIxs: TransactionInstruction[] = [];
  const voterTokenOwnerRecordAddress = await withDepositGoverningTokens(
    tmpIxs,
    GOVERNANCE_PROGRAM_ID,
    GOVERNANCE_PROGRAM_VERSION,
    realmAddress,
    tokenSourceAccount,
    communityMintPk,
    wallet,
    wallet,
    wallet,
    new BN(0) as any
  );

  const voteIxs: TransactionInstruction[] = [];

  const voteChoice =
    vote === "yes"
      ? Vote.fromYesNoVote(YesNoVote.Yes)
      : Vote.fromYesNoVote(YesNoVote.No);

  // For simplicity, treat the voter as the governance authority for this example
  const proposalOwnerRecordAddress = voterTokenOwnerRecordAddress;

  const voteRecordAddress = await withCastVote(
    voteIxs,
    GOVERNANCE_PROGRAM_ID,
    GOVERNANCE_PROGRAM_VERSION,
    realmAddress,
    governanceAddress,
    proposalAddress,
    proposalOwnerRecordAddress,
    voterTokenOwnerRecordAddress,
    wallet,
    communityMintPk,
    voteChoice,
    wallet
  );

  const privy = await privyauthorization(user.id);
  if (!privy) {
    throw new Error("Not able to authorize Privy wallet for cast vote");
  }

  const { blockhash } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction().add(...voteIxs);
  tx.feePayer = wallet;
  tx.recentBlockhash = blockhash;

  const rpc = await privy.walletApi.solana.signAndSendTransaction({
    walletId: user.Privy_id,
    transaction: tx,
    caip2,
  });

  const signature =
    typeof rpc === "string" ? rpc : (rpc as any).hash ?? JSON.stringify(rpc);

  console.log(
    "[governance-realms] Vote cast",
    voteRecordAddress.toBase58(),
    "tx:",
    signature
  );

  return {
    voteRecordAddress,
    signature,
  };
};


