
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js"
import dotenv from "dotenv";

import * as idl from "../idl/alpha_pods.json";

import { PrismaClient } from "@prisma/client";
import { AlphaPods } from "../idl/alpha_pods";
dotenv.config();
const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com");

const secretKeyArray=[123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224];
const secretKey = new Uint8Array(secretKeyArray);
const    superadmin = Keypair.fromSecretKey(secretKey);
const wallet=new anchor.Wallet(superadmin);
const provider = new anchor.AnchorProvider(connection, wallet, {
commitment: "confirmed",
})
const program = new Program<AlphaPods>(idl as AlphaPods, provider)
export const init = async (
    adminKeypair: Keypair,
    chat_id:BigInt
) => {
    try {
        const escrowSeed =Math.floor(Math.random() * 1000000)
    
        const [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("escrow"),
                adminKeypair.publicKey.toBuffer(),
                Buffer.from(new anchor.BN(escrowSeed).toArrayLike(Buffer, "le", 8)),
            ],
            program.programId
        );
        console.log("Escrow PDA:", escrowPda.toBase58());
        console.log("Escrow Bump:", escrowBump);
        console.log("Seed:", escrowSeed);
        const tx = await program.methods
            .initialize(new anchor.BN(escrowSeed))
            .accountsStrict({
                admin: adminKeypair.publicKey,
                creator:superadmin.publicKey,
                escrow: escrowPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([adminKeypair,superadmin])
            .rpc();
       const prisma=new PrismaClient();
       await prisma.escrow.create({
        data:{
            escrow_pda:escrowPda.toString(),
            seed:escrowSeed.toString(),
            chatId: Number(chat_id),
             creator_pubkey:adminKeypair.publicKey.toString()

        }
       })
        console.log("Initialize transaction signature:", tx);
        
        
    } catch (error) {
        console.error("Error initializing escrow:", error);
        return {
            success: false,
    
        };
    }
};
export const deposit=async(amount:number,member:Keypair,chatid:BigInt)=>{
  const prisma=new PrismaClient();
  const escrow=await prisma.escrow.findUnique({
    where:{
        chatId:Number(chatid)
    }
  })
   const tx=await program.methods.depositSol(amount).accountsStrict({
        member:member.publicKey,
        escrow: new PublicKey(escrow?.escrow_pda || ""),
        systemProgram:SystemProgram.programId
   }).signers([member]).rpc();
  console.log(tx);


}


