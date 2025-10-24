import { PrismaClient } from "@prisma/client"
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
dotenv.config();
export const getminimumfund = async (proposal_id: string, bot: any) => {
    const prisma = new PrismaClient();
    const url = process.env.RPC_URL;
    console.log("url",url);
    const connection = new Connection(url || "");
    
    const proposal = await prisma.proposal.findUnique({
        where: {
            id: proposal_id
        }
    });
    const members = proposal?.Members;
    if (!members || members.length === 0) {
        console.log("No members found for proposal");
        return;
    }
    
    console.log(`Checking funding for ${members.length} members who voted "Yes"`);
    
    for (const memberc of members) {
        const member = await prisma.user.findUnique({
            where: {
                telegram_id: memberc
            }
        });
        
        if (!member) {
            console.log(`User with telegram_id ${memberc} not found`);
            continue;
        }
        
        const public_key = new PublicKey(member.public_key);
        const balance = await connection.getBalance(public_key);
        const balancesol = balance / LAMPORTS_PER_SOL;
        
        if (balancesol < proposal!.amount) {
            const shortfall = proposal!.amount - balancesol;
            
            const fundingMessage = `
🚨 **Funding Required for Approved Proposal** 🚨

The proposal you voted "Yes" for has been approved! However, your wallet needs more SOL to participate.

**Proposal Details:**
• Mint: \`${proposal!.mint}\`
• Required Amount: ${proposal!.amount} SOL
• Your Current Balance: ${balancesol.toFixed(4)} SOL
• Shortfall: ${shortfall.toFixed(4)} SOL

**Your Wallet Address:**
\`${member.public_key}\`

Please fund your wallet with at least ${shortfall.toFixed(4)} SOL to participate in this approved proposal.

You can get SOL from exchanges like:
• Binance
• Coinbase
• Jupiter (for swapping other tokens)
• Or any other Solana-compatible exchange

**Note:** This proposal has already been approved by the community vote!
            `;
            
            try {
                await bot.telegram.sendMessage(
                    parseInt(member.telegram_id),
                    fundingMessage,
                    { parse_mode: 'Markdown' }
                );
                console.log(`Funding message sent to user ${member.telegram_id}`);
            } catch (error) {
                console.error(`Failed to send funding message to user ${member.telegram_id}:`, error);
            }
        }
    }
};
export const checkfund=async(proposal_id:string)=>{
   const prisma=new PrismaClient();
   const url = process.env.RPC_URL;
   const connection=new Connection(url||"");
   const proposal=await prisma.proposal.findUnique({
       where:{
          id:proposal_id
       }
   });
   if(!proposal){
    return;
   }
   for  (const member of proposal.Members){
      const user=await prisma.user.findUnique({
        where:{
            telegram_id:member
        }
      });
      const publickey=new PublicKey(user?.public_key||"");
      const balance=await connection.getBalance(publickey);
       const amount=balance/LAMPORTS_PER_SOL;
       if(proposal.amount>amount){
          proposal.Members = proposal.Members.filter(memberId => memberId !== member);
          await prisma.proposal.update({
            where: {
              id: proposal.id
            },
            data: {
              Members: proposal.Members
            }
          });
       }
     
   }
}