import { Composer, Markup, Scenes, session, Telegraf } from "telegraf";
import { admin_middleware } from "../middleware/admin";
import  dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
export const proposals = new Map<string, {
    mint: string;
    amount: number;
    yes: number;
    no: number;
    messagId:number,
    chatId:number,
    createdAt:number
}>();
dotenv
const getTokenInfo = async (mintAddress:any) => {
    const url=process.env.HELIUS_RPC_URL;
    console.log("url",url);
    console.log("mint",mintAddress);
    const response = await fetch(url||"", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'my-id',
        method: 'getAsset',
        params: {
          id: mintAddress,
        },
      }),
    });
    
    const { result } = await response.json();
    console.log(result.token_info);
    return result.token_info;
  };
interface MyWizardSession extends Scenes.WizardSessionData {
    state: {
        mint: string;
        amount: number; 
    };
}
export interface MyContext extends Scenes.WizardContext<MyWizardSession> {}
export const proposeWizard = new Scenes.WizardScene<MyContext>(
    'propose_wizard',
    async (ctx) => {
        await ctx.reply('Please enter the mint you want to swap:');
        return ctx.wizard.next(); 
    },
    new Composer<MyContext>(Scenes.WizardScene.on('text',async(ctx)=>{
        console.log("message",ctx.message?.chat);
        console.log("message2",ctx.message?.sender_chat);
         console.log("main message",ctx.message);
         const public_key=new PublicKey(ctx.message.text);
         if(public_key){
            console.log("true");
         }else{
            console.log("false");
         }
         if (!ctx.message || !('text' in ctx.message||!public_key)) {
         console.log("check3");
         await ctx.reply('Invalid input. Please send the mint address as text.');
         return; 
     }
      console.log(ctx.message);
      const data=await getTokenInfo(ctx.message.text);
      console.log("data",data);
      (ctx.wizard.state as MyWizardSession['state']).mint = ctx.message.text;
    
      const pricePerToken = data.price_info?.price_per_token || 'N/A';
      const currency = data.price_info?.currency || 'Unknown';
      const symbol = data.symbol || 'Unknown';
      
      await ctx.reply(`Great! The token you have chosen is ${symbol} with a current price of ${pricePerToken} ${currency}. Now, enter the minimum swap amount in SOL:`);
      return ctx.wizard.next();
    })),
    async (ctx) => {
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Invalid input. Please send the amount as text.');
            return; 
        }
        const amount = parseFloat(ctx.message.text);
        const mint = (ctx.wizard.state as MyWizardSession['state']).mint; 
        if (!mint || isNaN(amount) || amount <= 0) {
            await ctx.reply('That is not a valid amount. Please enter a positive number (e.g., 1.5).');
            return;
        }
      ;
        (ctx.wizard.state as MyWizardSession['state']).amount = amount;
      
        const voteKeyboard = Markup.inlineKeyboard([
            Markup.button.callback(`👍 Yes (0)`, `vote:yes:${mint}`),
            Markup.button.callback(`👎 No (0)`, `vote:no:${mint}`)
        ]);
      const proposalText=  await ctx.reply(
            `New Proposal! 🗳️\n\n` +
            `**Mint:** \`${mint}\`\n` +
            `**Minimum Amount:** \`${amount} SOL\`\n\n` +
            `Should we proceed with this swap?`,
            {
                ...voteKeyboard,
                parse_mode: 'Markdown'
            }
        );
        proposals.set(mint, {
            mint: mint,
            amount: amount,
            yes: 0,
            no: 0,
            chatId:proposalText.chat.id,
            messagId:proposalText.message_id,
            createdAt:Date.now()
        });
        const FIVE_MINUTES_MS = 1 * 60 * 1000;
        setTimeout(()=>{
           const expiredproposal=proposals.get(mint);
           if(!expiredproposal){
            return;
           }
           const expiredText =
           `Proposal EXPIRED ⛔\n\n` +
           `**Mint:** \`${expiredproposal.mint}\`\n` +
           `**Minimum Amount:** \`${expiredproposal.amount} SOL\`\n\n` +
           `**Final Result:** Yes (${expiredproposal.yes}) - No (${expiredproposal.no})`;
          try{
            bot.telegram.editMessageText(
                expiredproposal.chatId,
                expiredproposal.messagId,
                undefined,
                expiredText,
                {parse_mode:"Markdown"}
            )
          }catch(e){
            console.error("Failed to edit expired proposal message:", e);
          }
          proposals.delete(mint);
        },FIVE_MINUTES_MS)

        return ctx.scene.leave();
    }
);
const bot = new Telegraf<MyContext>(process.env.TELEGRAM_API || "");
const stage = new Scenes.Stage<MyContext>([proposeWizard]);

bot.use(session());
bot.use(stage.middleware());

bot.command("propose", admin_middleware, async (ctx) => {
     await ctx.scene.enter('propose_wizard');
});
enum Vote{
    Yes,
    NO
}
