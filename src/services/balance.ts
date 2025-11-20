import { PrismaClient } from "@prisma/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const updatebalance=async(amount_out:number,amount_in:number,proposal_id:string,telegram_id:string)=>{
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
    const tokensReceivedPerMember = amount_out / proposal.Members.length;
    
    
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
    
    const token_deposit=await prisma.deposit.findUnique({
      where:{
        telegram_id_escrowId_mint:{
          telegram_id:telegram_id,
          mint:proposal.mint,
          escrowId:escrow.id
        }
      }
    })
    
    if(token_deposit){
      await prisma.deposit.update({
        where:{
          id:token_deposit.id
        },
        data:{
          amount:{
            increment: tokensReceivedPerMember
          }
        }
      })
    } else {
    
      await prisma.deposit.create({
        data:{
          telegram_id:telegram_id,
          escrowId:escrow.id,
          mint:proposal.mint,
          amount: tokensReceivedPerMember,
          userId:user.id
        }
      })
    }
    
    }
    export const sendmoney=async(amount_x:number,amount_y:number,proposal_id:string)=>{
    const prisma=new PrismaClient();
    console.log("proposal id",proposal_id);
    console.log("check1");
    const proposal=await prisma.proposal.findUnique({
      where:{
        id:proposal_id
      }
    });
    if(!proposal){  
      console.log("No proposal")
      return;
    }
    const escrow=await prisma.escrow.findUnique({
      where:{
        chatId:proposal.chatId
      }
    });
    if(!escrow){
      console.log("No escroe");
      return;
    }
    console.log("dasdasd");
    for(let i=0;i<proposal.Members.length;i++){
      const user=await prisma.user.findUnique({
        where:{
          telegram_id:proposal.Members[i]
        }
      });
      if(!user){
        console.log(`User ${proposal.Members[i]} not found, skipping`);
        continue;
      }
    
      const solDeposit=await prisma.deposit.findUnique({
        where:{
          telegram_id_escrowId_mint:{
            telegram_id:proposal.Members[i],
            escrowId:escrow.id,
            mint:""
          }
        }
      });
      if(solDeposit){
        await prisma.deposit.update({
          where:{
            id:solDeposit.id
          },
          data:{
            amount:{
              increment:amount_x
            }
          }
        });
      } else {
        await prisma.deposit.create({
          data:{
            telegram_id:proposal.Members[i],
            escrowId:escrow.id,
            mint:"",
            amount:amount_x,
            userId:user.id
          }
        });
      }
    
    
      const tokenDeposit=await prisma.deposit.findUnique({
        where:{
          telegram_id_escrowId_mint:{
            mint:proposal.mint,
            telegram_id:proposal.Members[i],
            escrowId:escrow.id
          }
        }
      });
      if(tokenDeposit){
        await prisma.deposit.update({
          where:{
            id:tokenDeposit.id
          },
          data:{
            amount:{
              increment:amount_y
            }
          }
        });
      } else {
        await prisma.deposit.create({
          data:{
            telegram_id:proposal.Members[i],
            escrowId:escrow.id,
            mint:proposal.mint,
            amount:amount_y,
            userId:user.id
          }
        });
      }
    }
    }