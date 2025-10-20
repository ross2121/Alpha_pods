import { getquote } from "./services/jupiter_swap"
import express, { json } from "express";
import { Telegraf,Markup } from "telegraf";
import dotenv from "dotenv";
import { Member_Data } from "./commands/member_data";
dotenv.config();
const bot = new Telegraf(process.env.TELEGRAM_API || "");
const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback("Swap", "Swap")],
    [Markup.button.callback("Add member", "add member")],
    [Markup.button.callback("🔄 Swap Tokens", "swap_tokens")],
    [Markup.button.callback("💼 Manage Wallet", "manage_wallet")],
    [Markup.button.callback("🚀 Start Strategy", "start_strategy")],
    [Markup.button.callback("⏹️ Stop Strategy", "stop_strategy")],
    [Markup.button.callback("📈 Exit Position", "exit_position")]
]);
const app=express();
app.use(json);
bot.command('membercount', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
      const count = await ctx.getChatMembersCount();
    
      ctx.reply(`This group has ${count} members.`);
    } else {
      ctx.reply('This command can only be used in a group.');
    }
  });
  bot.command('myinfo', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
      const userId = ctx.from.id;
      try {
        const member = await ctx.getChatMember(userId);
        const admin=await ctx.getChatAdministrators();
        const userInfo = `
          Your Info:
          - ID: ${member.user.id}
          - First Name: ${member.user.first_name}
          - Last Name: ${member.user.last_name || 'N/A'}
          - Username: @${member.user.username || 'N/A'}
          - Status: ${member.status}
        `;
        ctx.reply(userInfo);
      } catch (e) {
        console.error(e);
        ctx.reply('Could not fetch your information.');
      }
    } else {
      ctx.reply('This command must be used in a group.');
    }
  });

  bot.on('new_chat_members', (ctx) => {
    const newMembers = ctx.message.new_chat_members;
  
    for (const member of newMembers) {
      if (!member.is_bot) {
        // Create a user object to save
        const userToSave = {
          id: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          username: member.username,
        };
        
        Member_Data(userToSave.id.toString(),userToSave.firstName,"user");
      }
    }
  })
  bot.launch();
const main=async()=>{
    const quotemint="6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN";
    const basemint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const amount=1;
await getquote(quotemint,basemint,amount)
}
main();