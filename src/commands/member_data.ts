import { Keypair } from "@solana/web3.js"
import { encryptPrivateKey } from "../services/auth";
import { PrismaClient, Role } from "@prisma/client";
import { PrivyClient } from "@privy-io/server-auth";

export const add_member=async(telegramId:string,name:string,role:Role)=>{
    const prisma=new PrismaClient();
    console.log("user check");
    const keypair=new Keypair();
    const user=await prisma.user.findFirst({
      where:{
        telegram_id:telegramId
      }
    });
    if(user){
      console.log("false");
      return; 
       }
  const appId=process.env.APP_ID;
  const appsecret=process.env.APP_SECRET;
  if(!appId||!appsecret){
    console.log("No app id found")
    return;
  }
  const privy=new PrivyClient(appId,appsecret)
  
  const Privyuser = await privy.importUser({
    linkedAccounts: [{
        type: 'custom_auth',
        customUserId: telegramId
    }]
    
});
if(!Privyuser){
  return;
}
const {id, address} = await privy.walletApi.createWallet({
  chainType:'solana',
  owner: {userId: Privyuser.id},
});
const Prismauser=await prisma.user.create({
  data:{
    id:Number(telegramId),
      telegram_id:telegramId,
      name:name,
      public_key:address,
      Privy_id:id,
      role
  }
});

console.log("USer",Privyuser);
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