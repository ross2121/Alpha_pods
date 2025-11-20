import { PrismaClient } from "@prisma/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const deposit_lp=async(amount_x:number,propoal_id:string)=>{
    const prisma=new PrismaClient();
    const proposal=await prisma.proposal.findUnique({
      where:{
        id:propoal_id
      }
    });
    if(!proposal){
      return;
    }
    const escrow=await prisma.escrow.findUnique({
      where:{
        chatId:proposal.chatId
      }
    })
    if(!escrow){
      return;
    }
    for(let i=0;i<proposal.Members.length;i++){
        await prisma.deposit.update({
        where:{
          telegram_id_escrowId_mint:{
            telegram_id:proposal.Members[i],
            escrowId:escrow?.id,
            mint:"",
          }
        },data:{
          amount:{
            decrement:amount_x
          }
        }
       })
    }
    }
    export const update_lp_balance=async(amount_in:number,proposal_id:string,telegram_id:string)=>{
        const prisma=new PrismaClient();
      const proposal=await prisma.proposal.findUnique({
        where:{
          id:proposal_id
        }
      })
      if(!proposal){
        return;
      }
      const escrow=await prisma.escrow.findUnique({
        where:{
          chatId:proposal.chatId
        }
      })
      if(!escrow){
        return;
      }
      const user=await prisma.user.findUnique({
        where:{
          telegram_id:telegram_id
        }
      })
      if(!user){
        return;
      }
      const solSpentPerMember = amount_in / (proposal.Members.length * LAMPORTS_PER_SOL); 
      
      const deposit=await prisma.deposit.findUnique({
        where:{
          telegram_id_escrowId_mint:{
             telegram_id:telegram_id,
             escrowId:escrow.id,
             mint:""
          }
        }
      })
      if(deposit){
        await prisma.deposit.update({
          where:{
           id:deposit.id
          },
          data:{
            amount:{
              decrement: solSpentPerMember
            }
          }
        })
      }
      
      }