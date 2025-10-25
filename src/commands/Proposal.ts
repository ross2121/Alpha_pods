import { Composer, Markup, Scenes, session, Telegraf } from "telegraf";
import { admin_middleware } from "../middleware/admin";
import  dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { PrismaClient } from "@prisma/client";
import { checkfund, getminimumfund } from "./fund";
import { getQuote } from "./swap";

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
    // console.log(result.token_info);
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

export const approveProposal = async (ctx: any) => {
    const message = ctx.message?.text;
    
    if (!message || !message.startsWith('/approve')) {
        await ctx.reply("❌ Invalid command format. Use: /approve <proposal_id>");
        return;
    }
    
    const parts = message.split(' ');
    if (parts.length !== 2) {
        await ctx.reply("❌ Invalid command format. Use: /approve <proposal_id>");
        return;
    }
    
    const proposalId = parts[1];
    
    try {
        // Find the proposal
        const proposal = await prisma.proposal.findUnique({
            where: { id: proposalId }
        });
        
        if (!proposal) {
            await ctx.reply("❌ Proposal not found.");
            return;
        }
        
        // Check if proposal is in the correct state (funding complete)
        if (proposal.ProposalStatus !== 'Running') {
            await ctx.reply("❌ This proposal cannot be approved at this stage.");
            return;
        }
        
        // Update proposal status - keep as Running since it's already running
        // The approval is just a confirmation, status stays Running
        // await prisma.proposal.update({
        //     where: { id: proposalId },
        //     data: { ProposalStatus: 'Running' }
        // });
        
        const approvalMessage = `
✅ **Proposal Approved!**

**Proposal ID:** \`${proposalId}\`
**Mint:** \`${proposal.mint}\`
**Amount:** ${proposal.amount} SOL
**Members:** ${proposal.Members.length}

**Status:** Approved and ready for execution
        `;
        
        await ctx.reply(approvalMessage, { parse_mode: 'Markdown' });
        
    } catch (error: any) {
        console.error("Error approving proposal:", error);
        await ctx.reply("❌ Failed to approve proposal. Please try again later.");
    }
};

export const createProposeWizard = (bot: any) => new Scenes.WizardScene<MyContext>(
    'propose_wizard',
    async (ctx) => {
        await ctx.reply('Please enter the mint you want to swap:');
        return ctx.wizard.next(); 
    },
    new Composer<MyContext>(Scenes.WizardScene.on('text',async(ctx)=>{
        console.log("message",ctx.message?.chat);
        console.log("message2",ctx.message?.sender_chat);
         console.log("main message",ctx.message);
         
         if (!ctx.message || !('text' in ctx.message)) {
            console.log("check3");
            await ctx.reply('Invalid input. Please send the mint address as text.');
            return; 
        }
        try {
            const public_key = new PublicKey(ctx.message.text);
            console.log("Valid PublicKey:", public_key.toBase58());
        } catch (error) {
            await ctx.reply('❌ Invalid mint address. Please provide a valid Solana public key.');
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
        const creatorTelegramId = ctx.from?.id?.toString() || "";
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
            Members:[creatorTelegramId]
           }
        })
        const VOTING_PERIOD_MS = 0.5 * 60 * 1000;
        const FUNDING_PERIOD_MS = 0.5 * 60 * 1000; 

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

               console.log("Voting period over.");
               if (expiredproposal.yes > 0) {
                   try {
                       await getminimumfund(expiredproposal.id, bot);
                       console.log(`Initial funding check requested for proposal ${expiredproposal.id}`);
                       await bot.telegram.sendMessage(
                           Number(expiredproposal.chatId),
                           `Voting complete. Members who voted "Yes" now have 5 minutes to ensure their wallets are funded.`
                       );

                       console.log(`Waiting 5 minutes for funding...`);
                       setTimeout(async() => {
                           console.log(`Funding period over for proposal ${expiredproposal.id}. Checking funds...`);
                           await checkfund(expiredproposal.id);
                           const fundedProposal = await prisma.proposal.findUnique({
                               where: { id: expiredproposal.id }
                           });

                           if (!fundedProposal) {
                               console.log("Proposal not found after funding check");
                               return;
                           }
                           const quoteButton = Markup.inlineKeyboard([
                               Markup.button.callback('🚀 Get Quote from Jupiter', `get_quote:${fundedProposal.id}`)
                           ]);

                           const confirmationMessage = `
📊 **Funding Period Complete!**

**Status:**
• Members with sufficient funds: ${fundedProposal.Members.length}

**Next Step:**
You can now get the swap quote from Jupiter.

Click the button below to get the quote:
                           `;
                    
                           await bot.telegram.sendMessage(
                               Number(fundedProposal.chatId),
                               confirmationMessage,
                               { ...quoteButton, parse_mode: 'Markdown' }
                           );

                       }, FUNDING_PERIOD_MS);
                     
                   } catch (fundingError) {
                       console.error("Failed to check funding requirements:", fundingError);
                   }
               }
           } catch (e) {
               console.error("Failed to handle expired proposal:", e);
           } finally {
              
           }
        }, VOTING_PERIOD_MS)

        return ctx.scene.leave();
    }
);
