import { PrismaClient } from "@prisma/client";
import { getquote } from "../services/jupiter_swap";
import axios from "axios";

const ORDER_URL="https://lite-api.jup.ag/ultra/v1";
export const handleSwap = async (ctx: any) => {
   
    ctx.reply("Swap functionality coming soon!");
};


// sendquote("5082ab0c-a328-4469-b1fd-85f190b85339");
export const getQuote = async (proposal_id:string) => {
     const prisma=new PrismaClient();
     const proposal=await prisma.proposal.findUnique({
        where:{
            id:proposal_id
        }
     });
     if(!proposal){
        return;
     }
    const quotemint = proposal.mintb || "So11111111111111111111111111111111111111112";
    const basemint = proposal.mint
    const amount = proposal.Members.length * proposal.amount;
    const amountInLamports = Math.floor(amount * 1e9);
    const url = `${ORDER_URL}/order?inputMint=${quotemint}&outputMint=${basemint}&amount=${amountInLamports}`;  
  try {
    const response = await axios.get(url);
    console.log("Order Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching order:", error);
    throw error;
  }
  
    
};

// Handle the execute command
export const handleExecuteSwap = async (ctx: any) => {
    const message = ctx.message?.text;
    
    if (!message || !message.startsWith('/execute')) {
        await ctx.reply("❌ Invalid command format. Use: /execute <proposal_id>");
        return;
    }
    
    const parts = message.split(' ');
    if (parts.length !== 2) {
        await ctx.reply("❌ Invalid command format. Use: /execute <proposal_id>");
        return;
    }
    
    const proposal_id = parts[1];
    
    try {
        await ctx.reply("🔄 Generating quote for the proposal...");
        
        // Get the quote
        const quoteResult = await getQuote(proposal_id);
        
        if (quoteResult) {
            // Format the quote data for Telegram message
            const inputAmount = parseInt(quoteResult.inAmount) / 1e9; // Convert lamports to SOL
            const outputAmount = parseInt(quoteResult.outAmount) / 1e6; // Convert to tokens (assuming 6 decimals)
            const priceImpact = parseFloat(quoteResult.priceImpactPct) * 100; // Convert to percentage
            const feePercent = quoteResult.feeBps / 100; // Convert basis points to percentage
            
            const quoteMessage = `
🎯 **Quote Generated Successfully!** 🎯

**Quote Details:**
• Input: ${inputAmount} SOL
• Output: ~${outputAmount.toFixed(2)} tokens
• Price Impact: ${priceImpact.toFixed(3)}%
• Platform Fee: ${feePercent}%
• Request ID: \`${quoteResult.requestId}\`

**Quote Status:**
✅ Quote generated successfully
⏰ Quote valid until executed
💰 Ready for execution

The quote is now ready for execution!
            `;
            
            await ctx.reply(quoteMessage, { parse_mode: 'Markdown' });
            
        } else {
            await ctx.reply("❌ Failed to generate quote. Please try again later.");
        }
        
    } catch (error) {
        console.error("Error executing swap:", error);
        await ctx.reply("❌ Failed to execute swap. Please try again later.");
    }
};

