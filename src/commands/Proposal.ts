import { Composer, Markup, Scenes, session, Telegraf } from "telegraf";
import { admin_middleware } from "../middleware/admin";
import  dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { PrismaClient } from "@prisma/client";
import { getminimumfund } from "./fund";
import { getQuote } from "./swap";

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
const prisma =new PrismaClient();
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
        console.log("consolsd 12");
        const proposal = await prisma.proposal.create({
           data:{
             mint: mint,
            amount: amount,
            yes: 0,
            no: 0,
            chatId:BigInt(proposalText.chat.id),
            messagId:BigInt(proposalText.message_id),
            createdAt:BigInt(Date.now()),
            Votestatus: "Running",
            ProposalStatus: "Running",
            Members: []
           }
        })
        const FIVE_MINUTES_MS = .5 * 60 * 1000;
        setTimeout(async () => {
           try {
               const expiredproposal = await prisma.proposal.findUnique({
                   where: { id: proposal.id }
               });
               
               if (!expiredproposal) {
                   console.log("Proposal not found in database");
                   return;
               }
               
               const expiredText =
               `Proposal EXPIRED ⛔\n\n` +
               `**Mint:** \`${expiredproposal.mint}\`\n` +
               `**Minimum Amount:** \`${expiredproposal.amount} SOL\`\n\n` +
               `**Final Result:** Yes (${expiredproposal.yes}) - No (${expiredproposal.no})`;
            
               await prisma.proposal.update({
                   where: { id: proposal.id },
                   data: { 
                       Votestatus: "Expired",
                   }
               });
              
               bot.telegram.editMessageText(
                   Number(expiredproposal.chatId),
                   Number(expiredproposal.messagId),
                   undefined,
                   expiredText,
                   {parse_mode:"Markdown"}
               );

              console.log("check first to close");
               if (expiredproposal.yes > 0) {
                   try {
                       await getminimumfund(expiredproposal.id, bot);
                       console.log(`Funding check completed for proposal ${expiredproposal.id}`);
                       setTimeout(async() => {
                        try{
                            console.log("checj212");
                            const quoteResult:any= await getQuote(expiredproposal.id);
                            console.log("quote result",quoteResult);
                            if(quoteResult){
                                const inputAmount = parseInt(quoteResult.inAmount) / 1e9; 
                                const outputAmount = parseInt(quoteResult.outAmount) / 1e6;
                                const priceImpact = parseFloat(quoteResult.priceImpactPct) * 100; 
                                const feePercent = quoteResult.feeBps / 100; 
                                const quoteMessage = `
                                🎯 **Quote Ready for Approved Proposal!** 🎯
                                
                                **Proposal Details:**
                                • Mint: \`${expiredproposal.mint}\`
                                • Total Amount: ${inputAmount} SOL
                                • Participants: ${expiredproposal.Members.length} members
                                
                                **Swap Quote:**
                                • Input: ${inputAmount} SOL
                                • Output: ~${outputAmount.toFixed(2)} tokens
                                • Price Impact: ${priceImpact.toFixed(3)}%
                                • Platform Fee: ${feePercent}%
                                • Request ID: \`${quoteResult.requestId}\`
                                
                                **Quote Status:**
                                ✅ Quote generated successfully
                                ⏰ Quote valid until executed
                                💰 Ready for execution
                                
                                **Next Steps:**
                                The quote is now ready for execution. Each participating member should execute their portion of the swap.
                                            `
                                            await bot.telegram.sendMessage(
                                                Number(expiredproposal.chatId),
                                                quoteMessage,
                                                { parse_mode: 'Markdown' }
                                            );
                            }
                        }catch(error:any){
                            await bot.telegram.sendMessage(
                                Number(expiredproposal.chatId),
                                "❌ **Quote Generation Failed**\n\nUnable to generate quote at this time. Please try again later.",
                                { parse_mode: 'Markdown' }
                            );
                        }
                       }, FIVE_MINUTES_MS);
                   } catch (fundingError) {
                       console.error("Failed to check funding requirements:", fundingError);
                   }
               }
           } catch (e) {
               console.error("Failed to handle expired proposal:", e);
           } finally {
              
           }
        }, FIVE_MINUTES_MS)

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
