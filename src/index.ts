import { getquote } from "./services/jupiter_swap"
import express, { json } from "express";
import { Telegraf,Markup } from "telegraf";
import dotenv from "dotenv";
import { add_member, delete_member } from "./commands/member_data";
import { admin_middleware } from "./middleware/admin";
dotenv.config();
const proposevotes=new Map<string,string>;
const bot = new Telegraf(process.env.TELEGRAM_API || "");
const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback("Swap", "Swap")],
    [Markup.button.callback("Propose", "propose")],
    [Markup.button.callback("🔄 Swap Tokens", "swap_tokens")],
    [Markup.button.callback("💼 Manage Wallet", "manage_wallet")],
    [Markup.button.callback("🚀 Start Strategy", "start_strategy")],
    [Markup.button.callback("⏹️ Stop Strategy", "stop_strategy")],
    [Markup.button.callback("📈 Exit Position", "exit_position")]
]);
const app=express();
app.use(json);
bot.command("propose",admin_middleware,async(ctx)=>{
     ctx.reply("Enter the mint you want to swap");
});

bot.command('membercount', async (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
      const count = await ctx.getChatMembersCount();
    
      ctx.reply(`This group has ${count} members.`);
    } else {
      ctx.reply('This command can only be used in a group.');
    }
  });
bot.on("my_chat_member",async(ctx)=>{
  const member=ctx.myChatMember;
  console.log("admin");
  console.log("admin check");
  if(member.old_chat_member.status=="administrator"||member.new_chat_member.status=="administrator"){
    const admins=await ctx.getChatAdministrators();
    for (const admin of admins){
       if(admin.user.is_bot){
        return;
       }
       await add_member(admin.user.id.toString(),admin.user.first_name,"admin");
    } 
  }
})
bot.command("Swap",async(Ctx)=>{

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
  bot.command("market",async(ctx)=>{
    if (ctx.chat.type=="group"|| ctx.chat.type=="supergroup"){
      ctx.reply(`DLMM Auto Copy Trade Setup Beta⚠️ Recommend to use with small amounts of SOL at first. This feature only works with DLMM pools.
📝 Instructions:
1. Add the wallet address you want to track and auto copy trade
2. Click on wallet names to enable/disable copy trading (✅ = enabled, 🔔 = disabled)
3. Use "Configure" button to set amount settings for each wallet
4. You can enable multiple wallets for copy trading simultaneously
5. You can have at max 5 wallets to track

⚠️ Make sure you have enough SOL in your wallet for copy trading

🔍 Active Filters:
• Min Market Cap: $500k
• Min Organic Score: 70%

Tracked Wallets:
No active copy trading wallets`);
    }
  })
bot.on("left_chat_member",(ctx)=>{
  const member_delete=ctx.message.left_chat_member;
   delete_member(member_delete.id.toString());
})
bot.on("new_chat_members",(ctx)=>{
  console.log("check2");
})
  bot.on('new_chat_members', (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    console.log(newMembers);
    console.log("test");
    for (const member of newMembers) {
      if (!member.is_bot) {
        const userToSave = {
          id: member.id,
          firstName: member.first_name,
          lastName: member.last_name,
          username: member.username,
        };
          
        add_member(userToSave.id.toString(),userToSave.firstName,"user");
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