import { Composer, Markup, Scenes, session, Telegraf } from "telegraf";
import { admin_middleware } from "../middleware/admin";
import  dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { PrismaClient } from "@prisma/client";
import { checkadminfund, checkfund, getminimumfund } from "./fund";
const getTokenInfo = async (mintAddress: any) => {
    const url = process.env.HELIUS_RPC_URL || "https://devnet.helius-rpc.com/?api-key=1f13a790-f758-4d3e-8263-660d6b629709";
    console.log("url", url);
    console.log("mint", mintAddress);
    try {
      const response = await fetch(url, {
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
      if (!result || !result.token_info) {
        return {
          symbol: "Unknown Token",
          price_info: {
            price_per_token: "N/A",
            currency: "Unknown"
          }
        };
      }
      
      return result.token_info;
    } catch (error) {
      console.error("Error fetching token info:", error);
      return {
        symbol: "Unknown Token",
        price_info: {
          price_per_token: "N/A",
          currency: "Unknown"
        }
      };
    }
  };
interface MyWizardSession extends Scenes.WizardSessionData {
    state: {
        mint: string;
        amount: number; 
    };
}
export interface MyContext extends Scenes.WizardContext<MyWizardSession> {}
const prisma =new PrismaClient();
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
        console.log(proposal);
        const VOTING_PERIOD_MS = 0.1 * 60 * 1000;
        const FUNDING_PERIOD_MS = 10000; // 10 seconds 

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
              
               try {
                   await bot.telegram.editMessageText(
                       Number(expiredproposal.chatId),
                       Number(expiredproposal.messagId),
                       undefined,
                       expiredText,
                       {parse_mode:"Markdown"}
                   );
               } catch (editError) {
                   console.log("Failed to edit message (may be deleted or inaccessible):", editError);

                   try {
                       await bot.telegram.sendMessage(
                           Number(expiredproposal.chatId),
                           expiredText,
                           {parse_mode:"Markdown"}
                       );
                   } catch (sendError) {
                       console.error("Failed to send expiration message:", sendError);
                   }
               }

               console.log("Voting period over.");
               if (expiredproposal.yes > 0) {
                   try {
                       await getminimumfund(expiredproposal.id, bot);
                       console.log(`Initial funding check requested for proposal ${expiredproposal.id}`);
                       try {
                           await bot.telegram.sendMessage(
                               Number(expiredproposal.chatId),
                               `Voting complete. Members who voted "Yes" now have 5 minutes to ensure their wallets are funded.`
                           );
                       } catch (msgError) {
                           console.error("Failed to send funding message:", msgError);
                       }

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
                              Markup.button.callback('🚀 Get Best DLMM Pool', `execute_swap:${fundedProposal.id}`)
                          ]);
                          if(fundedProposal.Members.length==0){
                             const message="0 members have appropiate funds";
                            await bot.telegram.sendMessage(
                                Number(fundedProposal.chatId),
                                message,
                                // { ...quoteButton, parse_mode: 'Markdown' }
                            );
                            return;
                          }

                          const confirmationMessage = `
📊 **Funding Period Complete!**

**Status:**
• Members with sufficient funds: ${fundedProposal.Members.length}

**Next Step:**
The system will search all Meteora DLMM pools to find the best rate for your swap!

Click the button below to get the best pool:
                          `;
                    
                           try {
                               await bot.telegram.sendMessage(
                                   Number(fundedProposal.chatId),
                                   confirmationMessage,
                                   { ...quoteButton, parse_mode: 'Markdown' }
                               );
                           } catch (confirmError) {
                               console.error("Failed to send confirmation message:", confirmError);
                           }

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
export const createliqudityWizards= (bot: any) => new Scenes.WizardScene<MyContext>(
    'liquidity_wizard',
    async (ctx) => {
        await ctx.reply('Please enter the mint  you want to liquidate:');
        return ctx.wizard.next(); 
    },
    new Composer<MyContext>(Scenes.WizardScene.on('text',async(ctx)=>{         
         if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Invalid input. Please send the mint address as text.');
            return; 
        }
        try {
            const public_key = new PublicKey(ctx.message.text);
            console.log("Valid PublicKey:", public_key.toBase58());
            const source = ((ctx.wizard.state as any)?.from || 'liquidity') as 'liquidity' | 'swap';
            const header = '🏊 Propose Liquidity Addition';
            const body = 'This will create a liquidity proposal for members to vote on.';
            await ctx.reply(`${header}\n\n${body}\n\nMint set to:\n\`${public_key.toBase58()}\``, { parse_mode: 'Markdown' });
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
      
      await ctx.reply(`Great! The token you have chosen is ${symbol} . Now, enter the minimum liquidty amount in SOL:`);
      return ctx.wizard.next();
    })),
    async(ctx)=>{
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Invalid input. Please send the amount as text.');
            return; 
        }
        const amount=parseFloat(ctx.message.text);
        const state=(ctx.wizard.state as MyWizardSession['state']);
        if (!state.mint || isNaN(amount) || amount <= 0) {
            await ctx.reply('That is not a valid amount. Please enter a positive number.');
            return;
        }
        const mint = (ctx.wizard.state as MyWizardSession['state']).mint;
        state.mint=mint;
        state.amount = amount;
        const strategyKeyboard = Markup.inlineKeyboard([
            Markup.button.callback(`Simple Strategy`, `strat:simple`), 
            Markup.button.callback(`Complex Strategy`, `strat:complex`)
        ]);
        await ctx.reply(
            `Amount set to ${amount} SOL.\n\nNow, choose the **Strategy** you want to execute:`,
            {
                ...strategyKeyboard,
                parse_mode: 'Markdown'
            }
        );
        return ctx.wizard.next();

    },
    async (ctx) => {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
            await ctx.reply('Please click one of the button above to select a strategy');
            return; 
        }
        const action=ctx.callbackQuery.data;
        const state=ctx.wizard.state as MyWizardSession['state'];
        let strategyName:any = "Unknown";
    if (action === 'strat:simple') strategyName = "Simple";
    else if (action === 'strat:complex') strategyName = "Complex";
    else {
        await ctx.reply("Invalid selection.");
        return;
    }
       
        const voteKeyboard = Markup.inlineKeyboard([
            Markup.button.callback(`👍 Yes (0)`, `vote:yes:${state.mint}`),
            Markup.button.callback(`👎 No (0)`, `vote:no:${state.mint}`)
        ]);
        const proposalMsg = await ctx.reply(
            `New Proposal! 🗳️\n\n` +
            `**Mint:** \`${state.mint}\`\n` +
            `**Amount:** \`${state.amount} SOL\`\n` +
            `**Strategy:** \`${strategyName}\`\n\n` + // Now we have the strategy!
            `Should we proceed with this liquidity?`,
            {
                ...voteKeyboard,
                parse_mode: 'Markdown'
            }
        );
    
        // const strategykeyboard=Markup.inlineKeyboard([
        //     Markup.button.callback(`Simple Strategy`,`strategy:Simple`),
        //    Markup.button.callback("Complex Strategy",`strategy:Complex`)
        // ])
        // const StrateyType=await ctx.reply(
        //         `Choose the type of strategy you want to execute`,
        //         {
        //             ...strategykeyboard,
        //             parse_mode:'Markdown'
        //         }
        // );
        //   console.log("strategu",StrateyType);
        const creatorTelegramId = ctx.from?.id?.toString() || "";
        const proposal = await prisma.proposal.create({
           data:{
             mint: state.mint,
            amount: state.amount,
            yes: 0,
            no: 0,
            Strategy:strategyName|| "Simple",
            chatId:BigInt(proposalMsg.chat.id),
            messagId:BigInt(proposalMsg.message_id),
            createdAt:BigInt(Date.now()),
            Votestatus: "Running",
            ProposalStatus: "Running",
            Members:[creatorTelegramId],
            mintb:"LIQUIDITY_PROPOSAL"
           }
        })
        console.log(proposal);
        const VOTING_PERIOD_MS = 0.1 * 60 * 1000;
        const FUNDING_PERIOD_MS = 10000; 

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
              
               try {
                   await bot.telegram.editMessageText(
                       Number(expiredproposal.chatId),
                       Number(expiredproposal.messagId),
                       undefined,
                       expiredText,
                       {parse_mode:"Markdown"}
                   );
               } catch (editError) {
                   console.log("Failed to edit message (may be deleted or inaccessible):", editError);

                   try {
                       await bot.telegram.sendMessage(
                           Number(expiredproposal.chatId),
                           expiredText,
                           {parse_mode:"Markdown"}
                       );
                   } catch (sendError) {
                       console.error("Failed to send expiration message:", sendError);
                   }
               }
               let temp:boolean=false;
               let temp2:boolean=true
              console.log("Voting period over.");
              if (expiredproposal.yes > 0) {
                  try {
                      const result=await getminimumfund(expiredproposal.id, bot);
                      temp=result;
                      
                      console.log("result",result);
                      console.log(`Initial funding check requested for proposal ${expiredproposal.id}`);
                      try {
                          await bot.telegram.sendMessage(
                              Number(expiredproposal.chatId),
                              `Voting complete. Members who voted "Yes" now have 10 seconds to ensure their wallets are funded.`
                          );
                      } catch (msgError) {
                          console.error("Failed to send funding message:", msgError);
                      }
  
                      console.log(`Waiting 10 seconds for funding...`);
                     
                      
                       console.log("tee");
                      setTimeout(async() => {
                          console.log(`Funding period over for proposal ${expiredproposal.id}. Checking funds...`);
                          if(!temp){
                          await checkfund(expiredproposal.id);
                          }
                          const admincheck=await checkadminfund(expiredproposal.id,bot);
                          console.log(admincheck);
                          if(!admincheck){
                              await bot.telegram.sendMessage(
                                  Number(expiredproposal.chatId),
                                  `Admin dont have enough fund to execute please fund the admin wallet to execute`
                              )
                              return;
                          }
                           const fundedProposal = await prisma.proposal.findUnique({
                               where: { id: expiredproposal.id }
                           });

                           if (!fundedProposal) {
                               console.log("Proposal not found after funding check");
                               return;
                           }
                          const actionCb = `execute_liquidity:${fundedProposal.id}`;
                          const quoteButton = Markup.inlineKeyboard([
                              Markup.button.callback('🚀 Execute Liquidity', actionCb)
                          ]);
                          if(fundedProposal.Members.length==0){
                             const message="0 members have appropiate funds";
                            await bot.telegram.sendMessage(
                                Number(fundedProposal.chatId),
                                message,
                                // { ...quoteButton, parse_mode: 'Markdown' }
                            );
                            return;
                          }

                          const confirmationMessage = `
📊 **Funding Period Complete!**

**Status:**
• Members with sufficient funds: ${fundedProposal.Members.length}

**Next Step:**
Execute the liquidity addition now.

Click the button below to continue:
                          `;
                    
                           try {
                               await bot.telegram.sendMessage(
                                   Number(fundedProposal.chatId),
                                   confirmationMessage,
                                   { ...quoteButton, parse_mode: 'Markdown' }
                               );
                           } catch (confirmError) {
                               console.error("Failed to send confirmation message:", confirmError);
                           }

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
//https://tpg.sanctum.so/v1/mainnet?apiKey=01K8QQN2YWWXAMWPAD3J95F8YT