import express, { json } from "express";
import { Telegraf, Markup, Scenes, session } from "telegraf";
import dotenv from "dotenv";
import { admin_middleware, user_middleware } from "./middleware/admin";
import { MyContext, createProposeWizard, createliqudityWizards} from "./commands/Proposal";
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
import {  executedSwapProposal, handlswap } from "./commands/swap";
import { executedliquidity, executeLP } from "./commands/liquidity";
import { handleWallet, handleWithdrawWallet, handleExportKeyWallet } from "./commands/wallet";
import { 
    createLiquidityWizard, 
    handleViewPositions, 
    handleClosePosition, 
    handleLiquidityVote,
} from "./commands/liquidity";
import { executeClosePosition } from "./commands/closePosition";
dotenv.config();
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
const liquidtywizard=createliqudityWizards(bot);
const stage = new Scenes.Stage<MyContext>([proposeWizard, liquidtywizard as any]);
app.use(json);
const port = process.env.PORT || 4000 
app.listen(port,()=>{
  console.log("port",port);
})
bot.use(session());
bot.use(stage.middleware());
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
bot.action("swap_tokens", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("🔄 **Swap Tokens**\n\nTo execute a swap:\n1. Create a proposal with the token mint address\n2. Members vote on the proposal\n3. Once approved, admin can execute the swap\n\nUse `/propose` to create a new swap proposal.", { parse_mode: "Markdown" });
});
bot.action(/execute_swap:(.+)/, admin_middleware, async (ctx) => {
  const proposalId = ctx.match[1];
  await ctx.answerCbQuery();
  await ctx.reply("⏳ **Executing Swap...**\n\nChecking member deposits and executing swap...", { parse_mode: 'Markdown' });
  try {
    const result = await executedSwapProposal(proposalId);
    if(!result){
  
      return;
      ctx.answerCbQuery("swap")
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
        ` **Swap Failed**\n\n` +
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
    const result = await  executedliquidity(proposalId);
    if(!result){
      await ctx.reply("Swap failed")
      return;
    }
    if (result.success) {
      await ctx.reply(
        `✅ **Liquidty Executed Successfully!**\n\n` +
        `All members have been funded and swap completed!\n\n` +
        `Transaction: \`${result.transaction}\`\n\n` +
        `🎉 Tokens are now in the escrow!`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        ` **Swap Failed**\n\n` +
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



