import { PrismaClient } from "@prisma/client"
import { decryptPrivateKey } from "../services/auth";
import { Keypair } from "@solana/web3.js";
import { deposit } from "../contract/contract";
import { BN } from "@coral-xyz/anchor";

export const transaction=async(proposal_id:string)=>{
const prisma=new PrismaClient();
const proposal=await prisma.proposal.findUnique({
    where:{
        id:proposal_id
    }
});
if(!proposal){
    return;
}
  for (const member of proposal.Members){
    const member_info=await prisma.user.findUnique({
        where:{
            telegram_id:member
        }
    })
    if(!member_info){
        return;
    }
    const secretkey=decryptPrivateKey(member_info.encrypted_private_key,member_info.encryption_iv);
    const keypair=Keypair.fromSecretKey(secretkey);
    await   deposit(new BN(proposal.amount),keypair,proposal.chatId)
  } 
  
}
export const swaptxn=async(proposal_id:string)=>{
const prisma=new PrismaClient();
const proposal=await prisma.proposal.findUnique({
    where:{
        id:proposal_id
    }
});
const escrow=await prisma.escrow.findUnique({
    where:{
        chatId:proposal?.chatId
    }
});



}