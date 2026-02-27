import {
  withCreateRealm,
  MintMaxVoteWeightSource,
} from "@realms-today/spl-governance";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { privyauthorization } from "../services/auth";

dotenv.config();

const prisma = new PrismaClient();

export const createdao = async (
  realmName: string,
  realmAuthority: PublicKey,
  userId: bigint,
  privyWalletId: string,
  communityMint: PublicKey,
  councilMint?: PublicKey
) => {
  const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, { commitment: "confirmed" });
  const programId = new PublicKey(
    "GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw"
  );
  const programVersion = 3;

  const instructions: TransactionInstruction[] = [];

  const realmAddress = await withCreateRealm(
    instructions,
    programId,
    programVersion,
    realmName,
    realmAuthority,
    communityMint,
    realmAuthority,
    councilMint,
    MintMaxVoteWeightSource.FULL_SUPPLY_FRACTION,
    new BN(1) as any
  );

  const tx = new Transaction().add(...instructions);
  tx.feePayer = realmAuthority;

  const privy = await privyauthorization(userId);
  if (!privy) {
    throw new Error("Not able to authorize Privy wallet");
  }

  const { blockhash } = await connection.getLatestBlockhash("finalized");
  tx.recentBlockhash = blockhash;

  const rpc = await privy.walletApi.solana.signAndSendTransaction({
    walletId: privyWalletId,
    transaction: tx,
    caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
  });

  const signature =
    typeof rpc === "string"
      ? rpc
      : (rpc as any).hash ?? JSON.stringify(rpc);

  console.log("Realm created:", realmAddress.toBase58(), "tx:", signature);

  // Persist the Realm in the database so it appears in /realms, subscriptions, and poller
  const cluster = rpcUrl.includes("devnet") ? "devnet" : "mainnet-beta";
  try {
    await prisma.realm.upsert({
      where: { pubkey: realmAddress.toBase58() },
      update: {
        name: realmName,
        cluster,
      },
      create: {
        pubkey: realmAddress.toBase58(),
        name: realmName,
        cluster,
      },
    });
    console.log(
      "[createdao] Realm persisted to DB:",
      realmAddress.toBase58(),
      "cluster:",
      cluster
    );
  } catch (e) {
    console.error("[createdao] Failed to persist Realm in DB:", e);
  }

  return { realmAddress, signature };
};