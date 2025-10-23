import { PrismaClient } from "@prisma/client";
import { getquote } from "../services/jupiter_swap";


export const handleSwap = async (ctx: any) => {
   
    ctx.reply("Swap functionality coming soon!");
};
export const sendquote=async(proposal_id:string)=>{
    console.log("check2");
const prisma=new PrismaClient();
const proposal=await prisma.proposal.findUnique({
    where:{
        id:proposal_id
    }
});
console.log("check3");
if(!proposal){
    return;
}
console.log("check4");
const inputMint  = "So11111111111111111111111111111111111111112"; // Correct SOL mint address
const amount=proposal.Members.length * proposal.amount * 1000000000; // Convert SOL to lamports
const url = `https://lite-api.jup.ag/ultra/v1/order?inputMint=${proposal.mint}&outputMint=${inputMint}&amount=${amount}`
const options = {method: 'GET', body: undefined};
console.log("check6");
try {
  const response = await fetch(url, options);
  console.log(response);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
}

// sendquote("5082ab0c-a328-4469-b1fd-85f190b85339");
export const main = async () => {
    const quotemint = "So11111111111111111111111111111111111111112"; // Correct SOL mint address
    const basemint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const amount = 1000000000; // 1 SOL in lamports
    await getquote(quotemint, basemint, amount);
};
