import express, { json } from "express";
import { Telegraf, Markup, Scenes, session } from "telegraf";
import dotenv from "dotenv";
import { admin_middleware, user_middleware } from "./middleware/admin";
import { MyContext, createProposeWizard} from "./commands/Proposal";
import { handleVote, Vote } from "./commands/vote";
import { 
    handleMemberCount, 
    handleMyInfo, 
    handleMarket, 
    handleNewChatMembers, 
    handleLeftChatMember, 
    handleMyChatMember 
} from "./commands/group";
import { getQuote, handleExecuteSwap, handleConfirmSwap } from "./commands/swap";
import { 
    createLiquidityWizard, 
    handleViewPositions, 
    handleClosePosition, 
    executeClosePosition,
    handleLiquidityVote,
    handleExecuteLiquidity
} from "./commands/liquidity";
import * as anchor from "@coral-xyz/anchor";
import * as idl from "./idl/alpha_pods.json";
import { getminimumfund } from "./commands/fund";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { program } from "@coral-xyz/anchor/dist/cjs/native/system";
import { createAssociatedTokenAccountInstruction, createSyncNativeInstruction, getAccount, getAssociatedTokenAddress, NATIVE_MINT, TOKEN_PROGRAM_ID, transfer } from "@solana/spl-token";
import { executeSwapViaDLMM } from "./services/dlmm_swap";
import { Program } from "@coral-xyz/anchor";
import { AlphaPods } from "./idl/alpha_pods";
import { binIdToBinArrayIndex, deriveBinArray, deriveEventAuthority } from "@meteora-ag/dlmm";
import { PrismaClient } from "@prisma/client";

dotenv.config();

// Initialize Prisma Client and check database connection
const prisma = new PrismaClient();

// Database connection check
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Failed to connect to database:");
    console.error(error);
    console.error("\n🔴 Database connection error. Please check:");
    console.error("1. Your DATABASE_URL in .env file");
    console.error("2. Database server is running");
    console.error("3. Network connectivity");
    console.error("\nExiting...");
    process.exit(1);
  }
}

const bot = new Telegraf<MyContext>(process.env.TELEGRAM_API || "");
const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback("Swap", "Swap")],
    [Markup.button.callback("Propose", "propose")],
    [Markup.button.callback("🔄 Swap Tokens", "swap_tokens")],
    [Markup.button.callback("💼 Manage Wallet", "manage_wallet")],
    [Markup.button.callback("🏊 Add Liquidity", "add_liquidity")],
    [Markup.button.callback("📊 View Positions", "view_positions")],
    [Markup.button.callback("🔒 Close Position", "close_position")]
]);
const app=express();
const proposeWizard = createProposeWizard(bot);
const stage = new Scenes.Stage<MyContext>([proposeWizard, createLiquidityWizard as any]);
app.use(json);

bot.use(session());
bot.use(stage.middleware());

bot.command("propose", admin_middleware, async (ctx) => {
  await ctx.scene.enter('propose_wizard');
});
bot.command('membercount', handleMemberCount);
bot.command('myinfo', handleMyInfo);
bot.command("market", handleMarket);

bot.on("my_chat_member", handleMyChatMember);
bot.on("left_chat_member", handleLeftChatMember);
bot.on('new_chat_members', handleNewChatMembers);

bot.action(/vote:(yes|no):(.+)/, user_middleware,handleVote);
bot.action(/vote_liquidity:(yes|no):(.+)/, user_middleware, handleLiquidityVote);

// Liquidity management actions
bot.action("add_liquidity", admin_middleware, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('add_liquidity_wizard');
});

bot.action("view_positions", async (ctx) => {
  await ctx.answerCbQuery();
  await handleViewPositions(ctx);
});

bot.action("close_position", admin_middleware, async (ctx) => {
  await ctx.answerCbQuery();
  await handleClosePosition(ctx);
});

bot.action(/close_position:(.+)/, admin_middleware, async (ctx) => {
  const positionId = ctx.match[1]; // UUID string
  await executeClosePosition(ctx, positionId);
});

bot.action(/refresh_position:(.+)/, async (ctx) => {
  await ctx.answerCbQuery("🔄 Refreshing position data...");
  await handleViewPositions(ctx);
});

bot.action(/claim_fees:(.+)/, admin_middleware, async (ctx) => {
  const positionAddress = ctx.match[1];
  await ctx.answerCbQuery("💰 Claiming fees feature coming soon!");
  await ctx.reply(`💰 **Claim Fees Feature**\n\nPosition: \`${positionAddress}\`\n\nThis feature will allow you to claim accumulated trading fees from your liquidity position.\n\n🚧 Coming soon!`, { parse_mode: "Markdown" });
});

// Liquidity commands
bot.command("add_liquidity", admin_middleware, async (ctx) => {
  await ctx.scene.enter('add_liquidity_wizard');
});

bot.command("view_positions", handleViewPositions);
bot.command("close_position", admin_middleware, handleClosePosition);
bot.command("execute_liquidity", admin_middleware, handleExecuteLiquidity);


bot.action(/get_quote:(.+)/, async (ctx) => {
    const proposalId = ctx.match[1];
    await ctx.answerCbQuery("🔍 Searching for best DLMM pool...");
    
    try {
        const quoteResult = await getQuote(proposalId);
      
        if (quoteResult) {
            const inputAmount = parseInt(quoteResult.inAmount) / 1e9;
            const outputAmount = parseInt(quoteResult.outAmount) / 1e9;
            const priceImpact = parseFloat(quoteResult.priceImpact);
            const feePercent = quoteResult.feeBps / 100;
            const liquidityInSol = quoteResult.liquidity / 1e9;
            
            const approveButton = Markup.inlineKeyboard([
                Markup.button.callback('✅ Execute Swap', `execute_swap:${proposalId}`)
            ]);
            
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
            
            await ctx.reply(quoteMessage, { ...approveButton, parse_mode: 'Markdown' });
        } else {
            await ctx.reply("❌ **No DLMM Pools Found**\n\nNo suitable pools found for this token pair. Please try a different token.", { parse_mode: 'Markdown' });
        }
    } catch (error: any) {
        console.error("Error finding pool:", error);
        await ctx.reply("❌ **Pool Search Failed**\n\nUnable to find pools at this time. Please try again later.", { parse_mode: 'Markdown' });
    }
});

bot.action(/execute_swap:(.+)/, admin_middleware, async (ctx) => {
    const proposalId = ctx.match[1];
    console.log(proposalId);
    await ctx.answerCbQuery("⏳ Executing swap...");
    await ctx.reply("⏳ Executing swap via DLMM. This may take a moment...");
    
    try {
        const { executeSwap } = await import("./commands/swap");
        const { Keypair } = await import("@solana/web3.js");
  
        const secretKeyArray = [123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224];
        const secretKey = new Uint8Array(secretKeyArray);
        const superadmin = Keypair.fromSecretKey(secretKey);
        
        const result = await executeSwap(proposalId, superadmin);
        
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
    } catch (error: any) {
        console.error("Error executing swap:", error);
        
        // User-friendly error messages - don't show technical details
        let userMessage = "❌ Swap execution failed.";
        
        if (error.message?.includes("insufficient lamports")) {
            userMessage = "❌ Insufficient SOL balance. Please ensure the escrow has enough SOL for the swap.";
        } else if (error.message?.includes("InsufficientOutAmount")) {
            userMessage = "❌ Insufficient liquidity in the pool. Try reducing the swap amount.";
        } else if (error.message?.includes("Simulation failed")) {
            userMessage = "❌ Transaction failed. Please check escrow balance and try again.";
        } else if (error.message?.includes("No suitable pool")) {
            userMessage = "❌ No liquidity pool found for this token pair.";
        } else {
            userMessage = "❌ Swap failed. Please try again or contact support.";
        }
        
        await ctx.reply(userMessage);
    }
});
const temp=async()=>{
  const tokenYMint = NATIVE_MINT;
  const tokenXMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
  const METORA_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
  const DLMM_SDK = (await import('@meteora-ag/dlmm')).default;
  const connection=new Connection("https://api.devnet.solana.com")
  const allPairs = await DLMM_SDK.getLbPairs(connection);
  const secretKeyArray = [
    123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,
    235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224
  ];
  const secretarray=new Uint8Array(secretKeyArray);
 const  adminkeypair = Keypair.fromSecretKey(secretarray);
  const targetPoolKey = new PublicKey("3RrtUag8F8aw6jAhTF4RxwvQmFX6KEXJUZ6zDL3eKaJE");
  const matchingPair = allPairs.find(pair => pair.publicKey.toBase58() === targetPoolKey.toBase58());
  const wallet = new anchor.Wallet(adminkeypair);
const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
const program = new Program<AlphaPods>(idl as AlphaPods, provider);
  if (!matchingPair) {
    console.log("⚠️  No matching pair found");
    return;
  }
  console.log("mathc",matchingPair)
  console.log("\n📊 Pool State:");
  console.log("Pool Address:", matchingPair.publicKey.toString());
  console.log("Active Bin ID:", matchingPair.account.activeId);
  console.log("Bin Step:", matchingPair.account.binStep);
  console.log("Token X Mint:", matchingPair.account.tokenXMint.toString());
  console.log("Token Y Mint:", matchingPair.account.tokenYMint.toString());
  console.log("Reserve X:", matchingPair.account.reserveX.toString());
  console.log("Reserve Y:", matchingPair.account.reserveY.toString());
  console.log("Oracle:", matchingPair.account.oracle.toString());
  
  // Wrap SOL to WSOL
  console.log("\n🔄 Wrapping SOL to WSOL...");
  const amountToWrap = 0.01 * anchor.web3.LAMPORTS_PER_SOL;
  const wsolAccount = await getAssociatedTokenAddress(NATIVE_MINT, adminkeypair.publicKey);
  
  const wrapTransaction = new Transaction();
  const wsolAccountInfo = await connection.getAccountInfo(wsolAccount);
  if (!wsolAccountInfo) {
    wrapTransaction.add(
      createAssociatedTokenAccountInstruction(
        adminkeypair.publicKey,
        wsolAccount,
        adminkeypair.publicKey,
        NATIVE_MINT
      )
    );
  }
  const seed=646519
 const escrow_pda=new PublicKey("4V8mS6doNMPCsfHzvm22HmTngA1dRGBPzBEjN134U6nY")
  // console.log("pda",escrowPda);
  
const [escrow_vault_pda,bump]=PublicKey.findProgramAddressSync(
  [
    Buffer.from("vault"),
    escrow_pda.toBuffer(),
  ],
  program.programId
)
  wrapTransaction.add(
    SystemProgram.transfer({
      fromPubkey: adminkeypair.publicKey,
      toPubkey: wsolAccount,
      lamports: amountToWrap,
    })
  );
  
  await executeSwapViaDLMM(connection,program,new PublicKey("4V8mS6doNMPCsfHzvm22HmTngA1dRGBPzBEjN134U6nY"),tokenXMint,tokenYMint,new anchor.BN(1_000_000),adminkeypair);
  
  wrapTransaction.add(
    createSyncNativeInstruction(wsolAccount, TOKEN_PROGRAM_ID)
  );
  
  await sendAndConfirmTransaction(connection, wrapTransaction, [adminkeypair]);
  console.log("✅ Wrapped SOL!");

  
  const userTokenX = await getAssociatedTokenAddress(tokenXMint, adminkeypair.publicKey);
  const userTokenY = wsolAccount;

  console.log("\n👤 User Token Accounts:");
  console.log("User Token X ATA:", userTokenX.toString());
  console.log("User Token Y (WSOL) ATA:", userTokenY.toString());

  // Create DLMM pool instance
  // const dlmmPool = await DLMM.create(provider.connection, matchingPair.publicKey);
  
  // // Swap parameters
  // await transfer(
  //   connection,
  //   adminkeypair,
  //   userTokenY,
  //   vaultb,
  //   adminkeypair,
  //   amountIn.toNumber()
  // );
  let pool=deriveBinArray(matchingPair.publicKey,binIdToBinArrayIndex(new anchor.BN(matchingPair.account.activeId)),METORA_PROGRAM_ID)
  const amountIn = new anchor.BN(1_000_000); // 0.001 WSOL
  const swapForY = true; // Swapping Y (WSOL) for X
  const slippageBps = new anchor.BN(100); // 1% slippage
 

  const activeBinArrayAccountMeta = {
    pubkey:pool[0],
    isSigner: false,
    isWritable: true, 
  };
  const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);

  console.log("\n🚀 Executing swap transaction...");

  // const vaulta = await getAssociatedTokenAddress(tokenXMint, escrowPda, true);
  // const vaultb = await getAssociatedTokenAddress(tokenYMint, escrowPda, true);


  // const vaultaInfo = await connection.getAccountInfo(vaulta);
  // if (!vaultaInfo) {
  //   console.log("Creating vaulta...");
  //   const createVaultaTx = new Transaction().add(
  //     createAssociatedTokenAccountInstruction(
  //       adminkeypair.publicKey,
  //       vaulta,
  //       escrowPda,
  //       tokenXMint
  //     )
  //   );
  //   await sendAndConfirmTransaction(connection, createVaultaTx, [adminkeypair]);
  // }

  // const vaultbInfo = await connection.getAccountInfo(vaultb);
  // if (!vaultbInfo) {
  //   console.log("Creating vaultb...");
  //   const createVaultbTx = new Transaction().add(
  //     createAssociatedTokenAccountInstruction(
  //       adminkeypair.publicKey,
  //       vaultb,
  //       escrowPda,
  //       tokenYMint
  //     )
  //   );
  //   await sendAndConfirmTransaction(connection, createVaultbTx, [adminkeypair]);
  // }


  console.log("Transferring WSOL to escrow vault...");
  

  // try {
  //   const txSignature = await program.methods
  //     .swap(amountIn, new anchor.BN(22))
  //     .accountsStrict({
  //       lbPair: matchingPair.publicKey,
  //       binArrayBitmapExtension: null,
  //       reserveX: matchingPair.account.reserveX,
  //       reserveY: matchingPair.account.reserveY,
  //       userTokenIn: userTokenY,
  //       userTokenOut: userTokenX,
  //       escrow: escrowPda,
  //       vaulta: vaulta,
  //       vaultb: vaultb,
  //       tokenXMint: tokenXMint,
  //       tokenYMint: tokenYMint,
  //       oracle: matchingPair.account.oracle,
  //       hostFeeIn: null,
  //       dlmmProgram: METORA_PROGRAM_ID,
  //       eventAuthority: eventAuthority,
  //       tokenXProgram: TOKEN_PROGRAM_ID,
  //       tokenYProgram: TOKEN_PROGRAM_ID,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //     }).remainingAccounts([activeBinArrayAccountMeta])
      
  //     .rpc();

  //   console.log("✅ Swap successful!");
  //   console.log("Transaction signature:", txSignature);


  //   await connection.confirmTransaction(txSignature, "confirmed");
  //   try {
  //     const userTokenXAccount = await getAccount(connection, userTokenX);
  //     const userTokenYAccount = await getAccount(connection, userTokenY);

  //     console.log("\n💰 Final Balances:");
  //     console.log("User Token X balance:", userTokenXAccount.amount.toString());
  //     console.log("User Token Y balance:", userTokenYAccount.amount.toString());
  //   } catch (accountError) {
  //     console.log("Note: Could not fetch token account balances");
  //   }

  // } catch (error: any) {
  //   console.error("\n❌ Swap failed:", error);
    
  //   if (error.logs) {
  //     console.error("\n📋 Program Logs:");
  //     error.logs.forEach((log: string) => console.error(log));
  //   }
    
  //   throw error;
  // }

 
}
// temp()

// Start the bot with database check
async function startBot() {
  console.log("🚀 Starting Telegram Bot...");
  
  // Check database connection first
  await checkDatabaseConnection();
  
  // Launch bot
  await bot.launch();
  console.log("✅ Bot launched successfully!");
  
  // Graceful shutdown
  process.once('SIGINT', async () => {
    console.log("\n⏳ Shutting down gracefully...");
    await prisma.$disconnect();
    bot.stop('SIGINT');
  });
  
  process.once('SIGTERM', async () => {
    console.log("\n⏳ Shutting down gracefully...");
    await prisma.$disconnect();
    bot.stop('SIGTERM');
  });
}

// Start the bot
startBot().catch((error) => {
  console.error("❌ Failed to start bot:");
  console.error(error);
  process.exit(1);
});
