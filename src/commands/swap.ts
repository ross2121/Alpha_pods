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

