import { PrismaClient } from "@prisma/client";
import { getquote } from "../services/jupiter_swap";
import axios from "axios";

const ORDER_URL="https://lite-api.jup.ag/ultra/v1";
export const handleSwap = async (signed_txn:string,requestid:string) => {
    const url = 'https://lite-api.jup.ag/ultra/v1/execute';
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: '{"signedTransaction":"<string>","requestId":"<string>"}'
    };
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

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
    return {
        ...response.data,
        mint: basemint,
        inputMint: quotemint,
        outputMint: basemint
    };
  } catch (error) {
    console.error("Error fetching order:", error);
    throw error;
  }
  
    
};
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
      
        const quoteResult = await getQuote(proposal_id);
        
        if (quoteResult) {
  
            const inputAmount = parseInt(quoteResult.inAmount) / 1e9;
            const outputAmount = parseInt(quoteResult.outAmount) / 1e6;
            const priceImpact = parseFloat(quoteResult.priceImpactPct) * 100;
            const feePercent = quoteResult.feeBps / 100; 
            
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

