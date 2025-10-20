import { Keypair } from "@solana/web3.js"
import { encryptPrivateKey } from "../services/auth";
import { PrismaClient, Role } from "@prisma/client";

export const Member_Data=async(telegramId:string,name:string,role:Role)=>{
    const prisma=new PrismaClient();
    const keypair=new Keypair();
    const private_key=encryptPrivateKey(keypair.secretKey);
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
