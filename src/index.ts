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
import { handleStart } from "./commands/start";
import { executedSwapProposal, getQuote, handlswap } from "./commands/swap";
import { handleWallet, handleWithdrawWallet, handleExportKeyWallet } from "./commands/wallet";
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
import { decryptPrivateKey } from "./services/auth";
import bs58 from "bs58";
import { Program } from "@coral-xyz/anchor";
import { AlphaPods } from "./idl/alpha_pods";
import DLMM, { binIdToBinArrayIndex, deriveBinArray, deriveEventAuthority } from "@meteora-ag/dlmm";
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
    [Markup.button.callback("💼 Wallet", "wallet_button")],
    [Markup.button.callback("🏊 Add Liquidity", "add_liquidity")],
    [Markup.button.callback("📊 View Positions", "view_positions")],
    [Markup.button.callback("🔒 Close Position", "close_position")]
]);
const app=express();
const proposeWizard = createProposeWizard(bot);
const stage = new Scenes.Stage<MyContext>([proposeWizard, createLiquidityWizard as any]);
app.use(json);
const port = process.env.PORT || 4000 
app.listen(port,()=>{
  console.log("port",port);
})
bot.use(session());
bot.use(stage.middleware());

// Start command - main entry point
bot.command("start", handleStart);

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

bot.command("add_liquidity", admin_middleware, async (ctx) => {
  await ctx.scene.enter('add_liquidity_wizard');
});

bot.command("view_positions", handleViewPositions);
bot.command("close_position", admin_middleware, handleClosePosition);
bot.command("execute_liquidity", admin_middleware, handleExecuteLiquidity);


bot.command("withdraw", user_middleware, async (ctx) => {
  const args = ctx.message.text.split(' ');
  
  if (args.length < 2) {
    await ctx.reply(
      "❌ **Invalid Command Format**\n\n" +
      "**Usage:**\n" +
      "`/withdraw <amount> [address]`\n\n" +
      "**Examples:**\n" +
      "• `/withdraw 0.5` - Withdraw 0.5 SOL to your wallet\n" +
      "• `/withdraw 1.5 <address>` - Withdraw 1.5 SOL to specified address\n\n" +
      "**Note:** Amount is in SOL",
      { parse_mode: "Markdown" }
    );
    return;
  }
  
  const amount = parseFloat(args[1]);
  const toAddress = args[2] || null;
  
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("❌ Invalid amount. Please provide a positive number.");
    return;
  }
  
  try {
    const userId = ctx.from?.id.toString();
    const user = await prisma.user.findUnique({
      where: { telegram_id: userId }
    });
    
    if (!user) {
      await ctx.reply("❌ User not found. Please register first.");
      return;
    }
    
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.reply("❌ Chat ID not found.");
      return;
    }
    
    const escrow = await prisma.escrow.findUnique({
      where: { chatId: BigInt(chatId) }
    });
    
    if (!escrow) {
      await ctx.reply("❌ Escrow not found for this chat.");
      return;
    }
    
    await ctx.reply("⏳ Processing withdrawal...");
    
    const secretKey = decryptPrivateKey(user.encrypted_private_key, user.encryption_iv);
    const userKeypair = Keypair.fromSecretKey(secretKey);
    
    const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com");
    const wallet = new anchor.Wallet(userKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const program = new Program<AlphaPods>(idl as AlphaPods, provider);
    
    const [escrowPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        new PublicKey(escrow.creator_pubkey).toBuffer(),
        Buffer.from(new anchor.BN(escrow.seed).toArrayLike(Buffer, "le", 8)),
      ],
      program.programId
    );
    
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowPda.toBuffer()],
      program.programId
    );
    
    const amountLamports = new anchor.BN(amount * LAMPORTS_PER_SOL);
    
    const txSignature = await program.methods
      .withdraw(amountLamports)
      .accountsStrict({
        member: userKeypair.publicKey,
        vault: vaultPda,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([userKeypair])
      .rpc();
    
    await connection.confirmTransaction(txSignature, "confirmed");
    
    const successMessage = `
✅ **Withdrawal Successful!**

**Details:**
• Amount: ${amount} SOL
• To: ${toAddress || user.public_key}
• Transaction: \`${txSignature}\`

View on Solscan: https://solscan.io/tx/${txSignature}
    `;
    
    await ctx.reply(successMessage, { parse_mode: "Markdown" });
  } catch (error: any) {
    console.error("Withdrawal error:", error);
    await ctx.reply(`❌ Withdrawal failed: ${error.message || "Unknown error"}`);
  }
});

bot.command("export_key", user_middleware, async (ctx) => {
  try {
    const userId = ctx.from?.id.toString();
    const user = await prisma.user.findUnique({
      where: { telegram_id: userId }
    });
    
    if (!user) {
      await ctx.reply("❌ User not found. Please register first.");
      return;
    }
    
    const secretKey = decryptPrivateKey(user.encrypted_private_key, user.encryption_iv);
    const privateKeyBase58 = bs58.encode(secretKey);
    
    const warningMessage = `
⚠️ **PRIVATE KEY - KEEP THIS SECRET!** ⚠️

**Your Wallet Details:**
• Public Key: \`${user.public_key}\`
• Private Key: \`${privateKeyBase58}\`

🔒 **SECURITY WARNING:**
• NEVER share this key with anyone
• Anyone with this key has full control of your wallet
• Store it safely offline
• Delete this message after saving the key

**Import to Phantom/Solflare:**
1. Open wallet app
2. Click "Import Wallet"
3. Paste the private key above
4. Your wallet will be imported

⚠️ This message will be automatically deleted in 60 seconds for your security.
    `;
    
    const sentMessage = await ctx.reply(warningMessage, { parse_mode: "Markdown" });
    
    // Auto-delete after 60 seconds
    setTimeout(async () => {
      try {
        await ctx.deleteMessage(sentMessage.message_id);
        await ctx.telegram.sendMessage(
          ctx.chat.id,
          "🔒 Private key message deleted for security."
        );
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    }, 60000);
    
  } catch (error: any) {
    console.error("Export key error:", error);
    await ctx.reply(`❌ Failed to export key: ${error.message || "Unknown error"}`);
  }
});

// Wallet command and actions
bot.command("wallet", user_middleware, handleWallet);
bot.action(/withdraw_wallet:(.+)/, user_middleware, handleWithdrawWallet);
bot.action(/export_key_wallet:(.+)/, user_middleware, handleExportKeyWallet);

bot.action("wallet_button", user_middleware, async (ctx) => {
  await ctx.answerCbQuery();
  await handleWallet(ctx);
});

bot.action("market_info", async (ctx) => {
  await ctx.answerCbQuery();
  await handleMarket(ctx);
});

bot.action("swap_tokens", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("🔄 **Swap Tokens**\n\nTo execute a swap:\n1. Create a proposal with the token mint address\n2. Members vote on the proposal\n3. Once approved, admin can execute the swap\n\nUse `/propose` to create a new swap proposal.", { parse_mode: "Markdown" });
});

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
  
  await ctx.answerCbQuery();
  await ctx.reply("⏳ **Executing Swap...**\n\nChecking member deposits and executing swap...", { parse_mode: 'Markdown' });
  
  try {
    const result = await executedSwapProposal(proposalId);
    if(!result){
      await ctx.reply("Swap failed")
      return;
    }
    if (result.success) {
      await ctx.reply(
        `✅ **Swap Executed Successfully!**\n\n` +
        `All members have been funded and swap completed!\n\n` +
        `Transaction: \`${result.transaction}\`\n\n` +
        `🎉 Tokens are now in the escrow!`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        `❌ **Swap Failed**\n\n` +
        `Error: ${result.message}\n\n` +
        `Please check member deposits and try again.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error: any) {
    console.error("Swap execution error:", error);
    await ctx.reply(`❌ Swap execution failed: ${error.message}`);
  }
});
bot.launch()
// handlswap(new PublicKey("6i6Z7twwpvr8PsCpsPujR1PgucdjpNPxAA4U7Uk2RZSk"),0.1*LAMPORTS_PER_SOL,"7oB9zbkRHScBur7kbLwJB9VNqUYGUdYobTeFB9QLPjEf");



