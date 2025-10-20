import { Keypair } from "@solana/web3.js"
import { encryptPrivateKey } from "../services/auth";
import { PrismaClient, Role } from "@prisma/client";

export const add_member=async(telegramId:string,name:string,role:Role)=>{
    const prisma=new PrismaClient();
    const keypair=new Keypair();
    const private_key=encryptPrivateKey(keypair.secretKey);
    const user=await prisma.user.findFirst({
      where:{
        telegram_id:telegramId
      }
    });
    if(user){
      return; 
       }
  await prisma.user.create({
    data:{
        telegram_id:telegramId,
        name:name,
        public_key:keypair.publicKey.toBase58(),
        encrypted_private_key:private_key.encrypted,
        encryption_iv:private_key.iv,
        role
    }
  });
}
export const delete_member=async( telegram_id:string)=>{
  const prisma=new PrismaClient();
  const user=await prisma.user.findUnique({
    where:{
      telegram_id:telegram_id
    }
  });
  if(!user){
    return;
  }
  await prisma.user.delete({
    where:{
      telegram_id:telegram_id
    }
  });
  
}