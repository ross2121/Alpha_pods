
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js"
import dotenv from "dotenv";
import * as idl from "../idl/alpha_pods.json";
import { PrismaClient } from "@prisma/client";
import { AlphaPods } from "../idl/alpha_pods";
import { keyboard } from "telegraf/typings/markup";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
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

const prisma = new PrismaClient();
const lamportsToSol = (lamports: anchor.BN): number => {
  return lamports.toNumber() / LAMPORTS_PER_SOL;
};

export const deposit = async (amountInSol: number, member: Keypair, chatid: BigInt,userid:string) => {
  const escrowRow = await prisma.escrow.findUnique({
    where: {
      chatId: Number(chatid),
    },
  });
  console.log("eccsadass");
  const user=await prisma.user.findUnique({
    where:{
      id:userid
    }
  })
  if(!user){
    return;
  }
  if (!escrowRow) {
    throw new Error("Escrow not found for chatId");
  }
  const escrowPda = new PublicKey(escrowRow.escrow_pda);
  const [escrowVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowPda.toBuffer()],
    program.programId
  );
  const amountInLamports = new anchor.BN(Math.floor(amountInSol * anchor.web3.LAMPORTS_PER_SOL));
  const sig = await program.methods
    .deposit(amountInLamports)
    .accountsStrict({
      member: member.publicKey,
      escrow: escrowPda,
      vault: escrowVaultPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([member])
    .rpc();
  console.log("tx",sig);
  const deposit = await prisma.deposit.findUnique({
    where: {
     telegram_id_escrowId_mint:{
      telegram_id:user.telegram_id,
      escrowId:escrowRow.id,
      mint:""
     }
    },
  });
console.log("check1");


  if (!deposit) {
    await prisma.deposit.create({
      data: {
        telegram_id:user.telegram_id,
        amount: parseFloat(amountInSol.toFixed(9)),
        mint: "",
        escrowId: escrowRow.id,
        userId:user.id
      },
    });
  } else {
    await prisma.deposit.update({
      where: {
        id: deposit.id,
      },
      data: {
        amount: {
          increment: parseFloat(amountInSol.toFixed(9)), 
        },
      },
    });
  }

  return sig;
};

export const withdraw=async(userid:string,escrow_id:string)=>{
  const prisma=new PrismaClient();
  const Deposit=await prisma.deposit.findMany({
      where:{
          id:userid
      }
  })
  const escrow=await prisma.escrow.findUnique({
    where:{
      id:escrow_id
    }
  });
  if(!escrow){
    return;
  }
  const  escrow_pda=new PublicKey(escrow.escrow_pda);
  const [escrow_vault_pda,bump]=PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      escrow_pda.toBuffer()
    ],
    program.programId
  )
const user=await prisma.user.findUnique({
  where:{
    id:userid
  }
})
if(!user){
  return;
}
  for(let i=0;i<Deposit.length;i++){
     const mint=Deposit[i].mint;
     if(mint==""){
       const tx=await program.methods.withdraw(new anchor.BN(Deposit[i].amount)).accountsStrict({
        member:user.public_key,
        escrow:escrow.escrow_pda,
        vault:escrow_vault_pda,
        systemProgram:SystemProgram.programId
       }).rpc();
       await prisma.deposit.update({
        where:{
          id:Deposit[i].id
        },data:{
          amount:0
        }
       })
       console.log("txn",tx)
     }else{
      const mint=new PublicKey(Deposit[i].mint||"");
      const vault_mint=await getAssociatedTokenAddress(mint,escrow_pda,false);
      const user_mint=await getAssociatedTokenAddress(mint,new PublicKey(user.public_key));
        const tx=await program.methods.withdrawMint(new anchor.BN(Deposit[i].amount)).accountsStrict({
          member:user.public_key,
          escrow:escrow.escrow_pda,
          vault:vault_mint,
          tokenProgram:TOKEN_PROGRAM_ID,
          systemProgram:SystemProgram.programId,
          mint:Deposit[i].mint || "",
          memberAta:user_mint
        }).rpc();
        await prisma.deposit.update({
          where:{
            id:Deposit[i].id
          },data:{
            amount:0
          }
        })
        console.log("tsx mint",tx)
      }
  }
}
export const wallet_funds=async(userid:string)=>{
const prisma=new  PrismaClient();
const userdeposit=await prisma.deposit.findMany({
  where:{
    id:userid
  }
})
if(!userdeposit){
  return;
}
const map=new Map<string, number>();
for(let i=0;i<userdeposit.length;i++){
  const mint=userdeposit[i].mint;
  const amount=userdeposit[i].amount;
  if(!mint || mint==""){
    // Accumulate SOL amounts
    const currentSol = map.get("SOL") || 0;
    map.set("SOL", currentSol + amount);
  }else{
    // Accumulate token amounts
    const currentAmount = map.get(mint) || 0;
    map.set(mint, currentAmount + amount);
  }
}
return map;
}

// export const withdraw = async (amount: anchor.BN, member: Keypair, chatid: BigInt) => {
//   const escrowRow = await prisma.escrow.findUnique({
//     where: {
//       chatId: Number(chatid),
//     },
//   });
//   if (!escrowRow) {
//     throw new Error("Escrow not found for chatId");
//   }

//   const escrowPda = new PublicKey(escrowRow.escrow_pda);
//   const [escrowVaultPda] = PublicKey.findProgramAddressSync(
//     [Buffer.from("vault"), escrowPda.toBuffer()],
//     program.programId
//   );
//   const sig = await program.methods
//     .withdraw(amount)
//     .accountsStrict({
//       member: member.publicKey,
//       vault: escrowVaultPda,
//       escrow: escrowPda,
//       systemProgram: SystemProgram.programId,
//     })
//     .signers([member])
//     .rpc();

//   const amountInSol = lamportsToSol(amount);

//   const deposit = await prisma.deposit.findUnique({
//     where: {
//       telegram_id_escrowId_mint: {
//         publicKey: member.publicKey.toString(),
//         escrowId: escrowRow.id,
//         mint: "",
//       },
//     },
//   });

//   if (!deposit) {
//     throw new Error("Withdrawal succeeded but no deposit record found in DB.");
//   }

//   if (deposit.amount < amountInSol) {

//     throw new Error(
//       `DB sync error: Withdrawal amount (${amountInSol}) is greater than DB balance (${deposit.amount})`
//     );
//   }


//   await prisma.deposit.update({
//     where: {
//       id: deposit.id,
//     },
//     data: {
//       amount: {
//         decrement: amountInSol, 
//       },
//     },
//   });

//   return sig;
// };

