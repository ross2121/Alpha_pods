import { getquote } from "./services/jupiter_swap"
import express, { json } from "express";
import { Telegraf,Markup, Scenes, session } from "telegraf";
import dotenv from "dotenv";
import { add_member, delete_member } from "./commands/member_data";
import { admin_middleware } from "./middleware/admin";
import { MyContext, proposals, proposeWizard } from "./commands/Proposal";
dotenv.config();


const bot = new Telegraf<MyContext>(process.env.TELEGRAM_API || "");
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
const stage = new Scenes.Stage<MyContext>([proposeWizard]);
app.use(json);

bot.use(session());
bot.use(stage.middleware());

bot.command("propose", admin_middleware, async (ctx) => {
  await ctx.scene.enter('propose_wizard');
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
  if(member.new_chat_member.status=="administrator"||member.new_chat_member.status=="creator"){
    console.log("check 2");
    const admins=await ctx.getChatAdministrators();
    console.log("admins",admins);
    for (const admin of admins){
       if(admin.user.is_bot){
        console.log("check4");
        continue;
       }
       await add_member(admin.user.id.toString(),admin.user.first_name,"admin");
    } 
  }
})
bot.command("Swap",async(Ctx)=>{

});

const proposevotes=new Map<number,{vote:Vote}>();
bot.action(/vote:(yes|no):(.+)/, async (ctx) => {    
    const action = ctx.match[1]; 
    const mint = ctx.match[2];  
    const userId = ctx.from.id;
    const proposal = proposals.get(mint);
    if (!proposal) {
        return ctx.answerCbQuery('This proposal is no longer valid.');
    }
    
    const newvote = (action === 'yes') ? Vote.Yes : Vote.NO;
    const existingVote = proposevotes.get(userId);
    
    // If user already voted the same way, do nothing
    if (existingVote && existingVote.vote === newvote) {
        return ctx.answerCbQuery(`You have already voted ${action === 'yes' ? 'Yes' : 'No'}!`);
    }
    
    // If user had a previous vote, remove it from counts
    if (existingVote) {
        if (existingVote.vote === Vote.Yes) {
            proposal.yes--;
        } else {
            proposal.no--;
        }
    }
    
    // Add the new vote to counts
    if (newvote === Vote.Yes) {
        proposal.yes++;
    } else {
        proposal.no++;
    }
    
    // Update user's vote
    proposevotes.set(userId, {vote: newvote});
    const newKeyboard = Markup.inlineKeyboard([
        Markup.button.callback(`👍 Yes (${proposal.yes})`, `vote:yes:${mint}`),
        Markup.button.callback(`👎 No (${proposal.no})`, `vote:no:${mint}`)
    ]);

    try {
        await ctx.editMessageText(
            `New Proposal! 🗳️\n\n` +
            `**Mint:** \`${proposal.mint}\`\n` +
            `**Minimum Amount:** \`${proposal.amount} SOL\`\n\n` +
            `Should we proceed with this swap?`,
            {
                ...newKeyboard,
                parse_mode: 'Markdown'
            }
        );
        await ctx.answerCbQuery('Vote counted!');
    } catch (e) {
        console.error("Failed to edit message:", e);
        await ctx.answerCbQuery('Vote counted (message not updated).');
    }
});
enum Vote{
    Yes,
    NO
}

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