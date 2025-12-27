import { PrismaClient } from "@prisma/client"
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
import { deposit } from "../contract/contract";
import { decryptPrivateKey } from "../services/auth";
dotenv.config();
export const getminimumfund = async (proposal_id: string, bot: any)=> {
    const prisma = new PrismaClient();
    const url = process.env.RPC_URL;
    console.log("url",url);
    const connection = new Connection(url || "");
    
    const proposal = await prisma.proposal.findUnique({
        where: {
            id: proposal_id
        }
    });
    const escrow=await prisma.escrow.findUnique({
        where:{
            chatId:proposal?.chatId
        }
    });
    if(!escrow){
        return false;
    }
    const members = proposal?.Members;
    if (!members || members.length === 0) {
        console.log("No members found for proposal");
        return false;
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
        const deposit=await prisma.deposit.findUnique({
            where:{
                telegram_id_escrowId_mint:{
                      telegram_id:memberc,
                      escrowId:escrow?.id,
                      mint:""
                }
            }
        })
        const deposit_amount=deposit?.amount ||0;
        if(deposit_amount >=proposal.amount){
              return true;
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
    return false;
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
export const checkadminfund=async(proposal_id:string,bot:any)=>{
    const prisma=new PrismaClient();
    const proposal=await prisma.proposal.findUnique({
        where:{
            id:proposal_id
        }
    });
    if(!proposal){
        console.log(" no proposal");
        return false;
    } 
    let admin;
    for(let i=0;i<proposal.Members.length;i++){
        const member=await prisma.user.findUnique({
            where:{
                telegram_id:proposal.Members[i]
            }
        });
        if(member?.role=="admin"){
             admin=member;
             break;
        }
    }
    if(!admin){
        console.log("addmin");
        return false;
    }
    const escrow=await prisma.escrow.findUnique({
        where:{
            chatId:proposal.chatId
        }
    });
    if(!escrow){
        console.log("fescrow");
        return false;
    }
    const deposits=await prisma.deposit.findUnique({
        where:{
            telegram_id_escrowId_mint:{
                telegram_id:admin?.telegram_id,
                 escrowId:escrow.id,
                 mint:""
            }
        }
    });
    const connection=new Connection("https://api.devnet.solana.com");
    const amount=await connection.getBalance(new PublicKey(admin.public_key));
      const sol=amount/LAMPORTS_PER_SOL;
      if(sol<1){
      setTimeout(async()=>{
const shortfall=1-sol;
        const fundingMessage = `
🚨 **Funding Required for Approved Proposal** 🚨

The proposal you voted "Yes" for has been approved! However, your wallet needs more SOL to participate.

**Proposal Details:**
• Mint: \`${proposal!.mint}\`
• Required Amount: ${proposal!.amount} SOL
• Your Current Balance: ${deposits?.amount.toFixed(4)} SOL
• Shortfall: ${shortfall.toFixed(4)} SOL

**Your Wallet Address:**
\`${admin.public_key}\`

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
                    parseInt(admin.telegram_id),
                    fundingMessage,
                    { parse_mode: 'Markdown' }
                );
                console.log(`Funding message sent to user ${admin.telegram_id}`);
            } catch (error) {
                console.error(`Failed to send funding message to user ${admin.telegram_id}:`, error);
            }
            
      },10000)
    }
    const updated_sol=await connection.getBalance(new PublicKey(admin.public_key));
    const sols=updated_sol/LAMPORTS_PER_SOL;
    if(sols<1){
        console.log("dadsadsd 1")
       return false;
    }
    if(!deposits){
        console.log("deposit")
        // const seretkey=decryptPrivateKey(admin.encrypted_private_key,admin.encryption_iv);
        // const keypair=Keypair.fromSecretKey(seretkey);
        await deposit(1,proposal.chatId,admin.id);
        return true;
    }
    if(deposits?.amount<1){
        const amount=1-deposits.amount;
        console.log("amount",amount);
       
        await deposit(amount,proposal.chatId,admin.id);
    }
     return true;
}
export const deductamount=async(proposal_id:string,amounts:number,isdepositing:boolean)=>{
    const prisma=new PrismaClient();
    const proposal=await prisma.proposal.findUnique({
        where:{
            id:proposal_id
        }
    });
    if(!proposal){
        return false;
    } 
    let admin;

    for(let i=0;i<proposal.Members.length;i++){
        const member=await prisma.user.findUnique({
            where:{
                telegram_id:proposal.Members[i]
            }
        });
        if(member?.role=="admin"){
             admin=member;
             break;
        }
    }
    if(!admin){
        return false;
    }
    const escrow=await prisma.escrow.findUnique({
        where:{
            chatId:proposal.chatId
        }
    });
    if(!escrow){
        return false;
    }
    console.log("amoundasddadas",amounts);   
    if(!isdepositing){
    await prisma.deposit.update({
        where:{
            telegram_id_escrowId_mint:{
                telegram_id:admin?.telegram_id,
                 escrowId:escrow.id,
                 mint:""
            }
        },data:{
            amount:{
                decrement:amounts
            }
        }
    });

}else{
    await prisma.deposit.update({
        where:{
            telegram_id_escrowId_mint:{
                telegram_id:admin?.telegram_id,
                escrowId:escrow.id,
                mint:""
            }
        },data:{
            amount:{
                increment:amounts
            }
        }
    })
}
}
export const getfund = async (proposalid: string) => {
    const prisma = new PrismaClient();
    const proposal = await prisma.proposal.findUnique({
      where: { 
        id: proposalid
      }
    });
    if (!proposal) {
        console.log("No proposal found");
      return;
    }
    const escrow = await prisma.escrow.findFirst({
      where: {
        chatId: Number(proposal.chatId)
      }
    });
    
    if (!escrow) {
        console.log("No escrow found");
      return;
    }
    
    for (let i = 0; i < proposal.Members.length; i++) {
      const deposits = await prisma.deposit.findFirst({
        where: {
          telegram_id: proposal.Members[i],
          escrowId: escrow.id,
          mint: ""
        }
      });
    
      let amount: number;
      
      if (!deposits) {
        amount = proposal.amount;
      } else if (deposits.amount >= proposal.amount) {
  
        continue;
      } else {
        amount = proposal.amount - deposits.amount;
      }
  
      const user = await prisma.user.findUnique({
        where: {
          telegram_id: proposal.Members[i]
        }
      });
      
      if (!user) {
        console.log(`User not found for telegram_id: ${proposal.Members[i]}`);
        continue;
      }
      
      try {
        // const private_key = decryptPrivateKey(user.encrypted_private_key, user.encryption_iv);
        // const keypair = Keypair.fromSecretKey(private_key);
        await deposit(amount, proposal.chatId, user.id);
        console.log(` Deposited ${amount} SOL for user ${user.telegram_id}`);
      } catch (e) {
        console.log(`Error depositing for user ${user.telegram_id}:`, e);
      
      }
    }
  };