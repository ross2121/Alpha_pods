import { PrismaClient } from "@prisma/client";
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { AlphaPods } from "../idl/alpha_pods";
import * as idl from "../idl/alpha_pods.json";
import { getBestDLMMPool, executeSwapViaDLMM, getAllPoolsInfo } from "../services/dlmm_swap";
import dotenv from "dotenv";

dotenv.config();

const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com");

// Admin keypair for signing transactions
const secretKeyArray = [123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224];
const secretKey = new Uint8Array(secretKeyArray);
const superadmin = Keypair.fromSecretKey(secretKey);
const wallet = new anchor.Wallet(superadmin);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
const program = new Program<AlphaPods>(idl as AlphaPods, provider);

export const getQuote = async (proposal_id: string) => {
  const prisma = new PrismaClient();
  const proposal = await prisma.proposal.findUnique({
    where: {
      id: proposal_id
    }
  });
  if (!proposal) {
    return null;
  }

  try {
    const tokenYMint = NATIVE_MINT; 
    const tokenXMint = new PublicKey(proposal.mint);
    console.log("token y",tokenYMint);
    console.log("token x",tokenXMint)
    const amount = proposal.Members.length * proposal.amount;
    const amountInLamports = new anchor.BN(Math.floor(amount * 1e9));

    
    const bestPoolResult = await getBestDLMMPool(
      connection,
      tokenXMint,
      tokenYMint,
      amountInLamports,
      true
    );

    if (!bestPoolResult) {
      throw new Error("No suitable pool found");
    }

    const { pool, estimatedOut, priceImpact } = bestPoolResult;

    return {
      poolAddress: pool.publicKey.toString(),
      inAmount: amountInLamports.toString(),
      outAmount: estimatedOut.toString(),
      priceImpact: priceImpact.toFixed(4),
      feeBps: pool.feeBps,
      binStep: pool.binStep,
      liquidity: pool.liquidity,
      mint: proposal.mint,
      inputMint: tokenYMint.toString(),
      outputMint: proposal.mint
    };
  } catch (error) {
    console.error("Error fetching DLMM quote:", error);
    throw error;
  }
};
/**
 * Execute swap via DLMM
 */
export const executeSwap = async (proposal_id: string, adminKeypair: Keypair): Promise<{ signature: string; outputAmount: string } | null> => {
  const prisma = new PrismaClient();
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposal_id }
  });
  
  if (!proposal) {
    throw new Error("Proposal not found");
  }

  const escrow = await prisma.escrow.findUnique({
    where: { chatId: Number(proposal.chatId) }
  });

  if (!escrow) {
    throw new Error("Escrow not found");
  }

  const [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      adminKeypair.publicKey.toBuffer(),
      Buffer.from(new anchor.BN(escrow.seed).toArrayLike(Buffer, "le", 8)),
    ],
    program.programId
  );

 
const [escrow_vault_pda,bump]=PublicKey.findProgramAddressSync(
  [
    Buffer.from("vault"),
    escrowPda.toBuffer(),
  ],
  program.programId
)
  const tokenYMint = NATIVE_MINT;
  const tokenXMint = new PublicKey(proposal.mint);
  const amount = proposal.Members.length * proposal.amount;
  const amountInLamports = new anchor.BN(Math.floor(amount * 1e9));

  const result = await executeSwapViaDLMM(
    connection,
    program,
    new PublicKey(escrow.escrow_pda),
    tokenXMint,
    tokenYMint,
    amountInLamports,
    adminKeypair
  );

  return result;
};

/**
 * Handle get quote command
 */
export const handleExecuteSwap = async (ctx: any) => {
  const message = ctx.message?.text;
  
  if (!message || !message.startsWith('/execute')) {
    await ctx.reply("❌ Invalid command format. Use: /execute <proposal_id>");
    return;
  }
  
  const parts = message.split(' ');
  if (parts.length !== 2) {
    await ctx.reply("❌ Invalid command format. Use: /execute <proposal_id>");
    return;
  }
  
  const proposal_id = parts[1];
  
  try {
    await ctx.reply("🔍 Searching for best DLMM pool...");
    
    const quoteResult = await getQuote(proposal_id);
    
    if (quoteResult) {
      const inputAmount = parseInt(quoteResult.inAmount) / 1e9;
      const outputAmount = parseInt(quoteResult.outAmount) / 1e9;
      const priceImpact = parseFloat(quoteResult.priceImpact);
      const feePercent = quoteResult.feeBps / 100;
      const liquidityInSol = quoteResult.liquidity / 1e9;
      
      const quoteMessage = `
🎯 **Best Pool Selected!** 🎯

**Pool Details:**
• Address: \`${quoteResult.poolAddress.slice(0, 8)}...${quoteResult.poolAddress.slice(-8)}\`
• Liquidity: ${liquidityInSol.toFixed(2)} SOL
• Bin Step: ${quoteResult.binStep} bps
• Fee: ${feePercent}%

**Swap Quote:**
• Input: ${inputAmount.toFixed(4)} SOL
• Est. Output: ~${outputAmount.toFixed(6)} tokens
• Price Impact: ${priceImpact}%

**Why This Pool?**
✅ Highest output amount
💎 Best liquidity/price ratio
⚡ Optimal fee structure

Ready to execute the swap!
      `;
      
      await ctx.reply(quoteMessage, { parse_mode: 'Markdown' });
      
    } else {
      await ctx.reply("❌ No suitable DLMM pools found for this token pair. Please try a different token.");
    }
    
  } catch (error) {
    console.error("Error getting quote:", error);
    await ctx.reply("❌ Failed to get quote. Error: " + (error as Error).message);
  }
};

/**
 * Handle actual swap execution
 */
export const handleConfirmSwap = async (ctx: any) => {
  const message = ctx.message?.text;
  
  if (!message || !message.startsWith('/confirm_swap')) {
    await ctx.reply("❌ Invalid command format. Use: /confirm_swap <proposal_id>");
    return;
  }
  
  const parts = message.split(' ');
  if (parts.length !== 2) {
    await ctx.reply("❌ Invalid command format. Use: /confirm_swap <proposal_id>");
    return;
  }
  
  const proposal_id = parts[1];
  
  try {
    await ctx.reply("⏳ Executing swap via DLMM...");
    
    const result = await executeSwap(proposal_id, superadmin);
    
    if (result) {
      const outputAmount = parseFloat(result.outputAmount) / 1e9;
      
      const successMessage = `
✅ **Swap Executed Successfully!**

**Transaction Details:**
• Signature: \`${result.signature}\`
• Output: ${outputAmount.toFixed(6)} tokens

**Status:**
✅ Tokens received in escrow
🎉 Swap completed via Meteora DLMM

View transaction: https://solscan.io/tx/${result.signature}
      `;
      
      await ctx.reply(successMessage, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply("❌ Swap execution failed. Please check the logs and try again.");
    }
    
  } catch (error) {
    console.error("Error executing swap:", error);
    await ctx.reply("❌ Swap execution failed. Error: " + (error as Error).message);
  }
};

