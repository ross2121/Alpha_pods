import express, { json } from "express";
import { Telegraf, Scenes, session } from "telegraf";
import dotenv from "dotenv";
import { admin_middleware, user_middleware } from "./middleware/admin";
import { MyContext, createProposeWizard, createliqudityWizards} from "./commands/Proposal";
import { handleVote } from "./commands/vote";
import { 
    handleMemberCount, 
    handleMyInfo, 
    handleMarket, 
    handleNewChatMembers, 
    handleLeftChatMember, 
    handleMyChatMember 
} from "./commands/group";
import { handleStart } from "./commands/start";
import {  executedSwapProposal } from "./commands/swap";
import { executedliquidity } from "./commands/liquidity";
import { handleWallet, handleWithdrawWallet, handleExportKeyWallet } from "./commands/wallet";

import { 
    handleViewPositions, 
    handleClosePosition, 
    handleLiquidityVote,
} from "./commands/liquidity";
import { executeClosePosition } from "./commands/closePosition";
import { Keypair } from "@solana/web3.js";
import { getjsks } from "./services/auth";
dotenv.config();
const bot = new Telegraf<MyContext>(process.env.TELEGRAM_API || "");
const app=express();
const proposeWizard = createProposeWizard(bot);
const liquidtywizard=createliqudityWizards(bot);
const stage = new Scenes.Stage<MyContext>([proposeWizard, liquidtywizard as any]);

app.use(express.json());


app.get("/health", (req, res) => {
  console.log("Health check hit!");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/jks", async (req: any, res: any) => {
  console.log("JKS route hit!");
  try {
    return await getjsks(req, res);
  } catch (error: any) {
    console.error("Error in /jks:", error);
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  const secretKeyArray = process.env.SECRET_KEY?.split(",").map(Number);
  console.log("Secret key", process.env.SECRET_KEY);
  if (secretKeyArray) {
    const secretKey = new Uint8Array(secretKeyArray);
    const superadmin = Keypair.fromSecretKey(secretKey);
    console.log("Superadmin", superadmin.publicKey.toString());
  }
  console.log("Server running on port", port);
});

bot.use(session());
bot.use(stage.middleware());
bot.telegram.setMyCommands([
  { command: 'start', description: 'Show main menu' },
  { command: 'swap', description: 'Create a swap proposal' },
  { command: 'wallet', description: 'Manage wallet' },
  { command: 'add_liquidity', description: 'Add liquidity proposal' },
  { command: 'view_positions', description: 'View liquidity positions' },
  { command: 'close_position', description: 'Close a position' },
  { command: 'cancel', description: 'Cancel current operation and reset' }
]).catch(err => console.error('Failed to set bot commands:', err));

bot.command("cancel", async (ctx) => {
  await ctx.scene.leave();
  await ctx.reply("Operation cancelled. You can start fresh now.\n\nUse /start to see available commands.");
});

bot.command("start", handleStart);
bot.command("swap", admin_middleware, async (ctx) => {
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

bot.action("add_liquidity", admin_middleware, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('liquidity_wizard');
});
bot.command("add_liquidity", admin_middleware, async (ctx) => {
  await ctx.scene.enter('liquidity_wizard');
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
  const positionId = ctx.match[1]; 
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
bot.command("view_positions", handleViewPositions);
bot.command("close_position", admin_middleware, handleClosePosition);
bot.command("wallet", async (ctx, next) => {
  if (ctx.chat?.type !== 'private') {
    await ctx.reply("💼 Please use /wallet in a private chat with me for security.");
    return;
  }
  return next();
}, handleWallet);
bot.action(/withdraw_wallet:(.+)/,  handleWithdrawWallet);
bot.action(/export_key_wallet:(.+)/, handleExportKeyWallet);
bot.action("wallet_button", user_middleware, async (ctx) => {
  await ctx.answerCbQuery();
  await handleWallet(ctx);
});
bot.action("market_info", async (ctx) => {
  await ctx.answerCbQuery();
  await handleMarket(ctx);
});
bot.action("swap", admin_middleware, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('propose_wizard');
});
bot.action(/execute_swap:(.+)/, admin_middleware, async (ctx) => {
  const proposalId = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply("⏳ **Executing Swap...**\n\nChecking member deposits and executing swap...", { parse_mode: 'Markdown' });
  try {
    console.log("cehcd2");
    const result = await executedSwapProposal(proposalId);
    if(!result){
       await ctx.reply("NOt able to execute swap");
      return;
    
    } 
    if (result.success) {
      const solscanUrl = `https://solscan.io/tx/${result.transaction}?cluster=devnet`;
      await ctx.reply(
        `✅ **Swap Executed Successfully!**\n\n` +
        `All members have been funded and swap completed!\n\n` +
        `**Transaction:**\n` +
        `[${result.transaction}](${solscanUrl})\n\n` +
        `🎉 Tokens are now in the escrow!`,
        { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } }
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
bot.action(/execute_liquidity:(.+)/, admin_middleware, async (ctx) => {
  const proposalId = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply("⏳ **Executing Liquidity...**\n\nChecking member deposits and executing liquidity...", { parse_mode: 'Markdown' });
  try {
    const result = await executedliquidity(proposalId);
    if(!result){
      await ctx.reply("Liquidity execution failed")
      return;
    }
    if (result.success) {
      const solscanTxUrl = `https://solscan.io/tx/${result.transaction}?cluster=devnet`;
      const solscanPositionUrl = result.positionAddress ? `https://solscan.io/account/${result.positionAddress}?cluster=devnet` : null;
      const solscanPoolUrl = result.poolAddress ? `https://solscan.io/account/${result.poolAddress}?cluster=devnet` : null;
      
      let message = `✅ **Liquidity Executed Successfully!**\n\n` +
        `All members have been funded and liquidity added!\n\n` +
        `**Transaction:**\n[${"Solscan"}](${solscanTxUrl})\n\n`;
      
      if (result.positionAddress) {
        message += `**Position:**\n[${result.positionAddress}](${solscanPositionUrl})\n\n`;
      }
      
      if (result.poolAddress) {
        message += `**Pool:**\n[${result.poolAddress}](${solscanPoolUrl})\n\n`;
      }
      
      message += `🎉 Liquidity is now active!`;
      
      await ctx.reply(message, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
    } else {
      await ctx.reply(
        `❌ **Liquidity Failed**\n\n` +
        `Error: ${result.message}\n\n` +
        `Please check member deposits and try again.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error: any) {
    console.error("Liquidity execution error:", error);
    await ctx.reply(`❌ Liquidity execution failed: ${error.message}`);
  }
});
bot.launch()
