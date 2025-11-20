
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction } from "@solana/web3.js"
import dotenv from "dotenv";
import * as idl from "../idl/alpha_pods.json";
import { PrismaClient } from "@prisma/client";
import { AlphaPods } from "../idl/alpha_pods";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, transfer } from "@solana/spl-token";
import { deriveEventAuthority } from "@meteora-ag/dlmm";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
dotenv.config();
const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com");
const secretKeyArray=[123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224];
const secretKey = new Uint8Array(secretKeyArray);
const METORA_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);
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
        const [vault_pda,_]=PublicKey.findProgramAddressSync(
          [
            Buffer.from("vault"),
            escrowPda.toBuffer()
          ],program.programId
        )
        console.log("Escrow PDA:", escrowPda.toBase58());
        console.log("vault pda",vault_pda);
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
       const amount=0.1 * LAMPORTS_PER_SOL;
       try{const getlateshblockhash=await connection.getLatestBlockhash();
      const tranfer=new Transaction().add(
        SystemProgram.transfer({
          fromPubkey:superadmin.publicKey,
          toPubkey:vault_pda,
          lamports:amount
        })
      )
      tranfer.recentBlockhash = getlateshblockhash.blockhash;
      tranfer.feePayer = superadmin.publicKey;
      const signature=await sendAndConfirmTransaction(
        connection,
        tranfer,
        [superadmin]
      )
      console.log("sign",signature);
    }catch(e:any){
        console.profile(e);
      }

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
  
    const currentSol = map.get("SOL") || 0;
    map.set("SOL", currentSol + amount);
  }else{
    const currentAmount = map.get(mint) || 0;
    map.set(mint, currentAmount + amount);
  }
}
return map;
}
export const createposition=async(lowerBinId:any,width:any,lppair:PublicKey,positionKeypair:Keypair,escrowPda:PublicKey,
  escrow_vault_pda:PublicKey
)=>{
  const createPositionTx = await program.methods
  .addPostion(lowerBinId, width)
  .accountsStrict({
    lbPair:lppair,
    position: positionKeypair.publicKey,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    escrow: escrowPda,
    vault: escrow_vault_pda,
    dlmmProgram: METORA_PROGRAM_ID,
    eventAuthority: eventAuthority,
    systemProgram: SystemProgram.programId,
  })
  .signers([positionKeypair])
  .rpc();
  return createPositionTx;
}
export const addbin=async(lowerBinArrayIndex:any,lb_pair:PublicKey,
  binArrayLower:PublicKey,escrowPda:PublicKey,escrow_vault_pda:PublicKey
)=>{
  const  CreateBinArrayTx = await program.methods
  .addBin(new anchor.BN(lowerBinArrayIndex.toNumber()))
  .accountsStrict({
    lbPair: lb_pair,
    binArray: binArrayLower,
    escrow: escrowPda,
    systemProgram: SystemProgram.programId,
    dlmmProgram: METORA_PROGRAM_ID,
    vault: escrow_vault_pda
  })
  .rpc();
  return CreateBinArrayTx
}
export const addliquidity=async(liquidityParameter:any,lb_pair:PublicKey,
  binArrayLower:PublicKey,escrowPda:PublicKey,escrow_vault_pda:PublicKey,
  position_public_key:PublicKey,matchingPair:any,
binArrayUpper:PublicKey,vaulta:PublicKey,vaultb:PublicKey,poolTokenXMint:PublicKey,
poolTokenYMint:PublicKey,poolTokenXProgramId:PublicKey,poolTokenYProgramId:PublicKey
)=>{  
  const txSignature = await program.methods
  .addLiquidity(liquidityParameter)
  .accountsStrict({
    lbPair: matchingPair.publicKey,
    position: position_public_key,
    binArrayBitmapExtension: null,
    reserveX: matchingPair.account.reserveX,
    reserveY: matchingPair.account.reserveY,
    binArrayLower: binArrayLower,
    binArrayUpper: binArrayUpper,
    vaulta: vaulta,
    vaultb: vaultb,
    tokenXMint: poolTokenXMint,
    tokenYMint: poolTokenYMint,
    vault: escrow_vault_pda,
    escrow: escrowPda,
    dlmmProgram: METORA_PROGRAM_ID,
    eventAuthority: eventAuthority,
    tokenXProgram: poolTokenXProgramId,
    tokenYProgram: poolTokenYProgramId,
  tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  associatedTokenProgram: ASSOCIATED_PROGRAM_ID
  })
  .rpc();
  return txSignature 
}    
export const removeLiqudity=async(binLiquidityReduction:any,poolPubkey:PublicKey,positionPubkey:PublicKey,matchingPair:any,
  escrowPda:PublicKey,escrow_vault_pda:PublicKey,vaulta:PublicKey,vaultb:PublicKey,tokenXMint:PublicKey,tokenYMint:PublicKey,
  binArrayLower:PublicKey,binArrayUpper:PublicKey
)=>{
  const removeLiquidityTx = await program.methods
  .removeLiqudity(binLiquidityReduction)
  .accountsStrict({
    lbPair: poolPubkey,
    binArrayBitmapExtension: null,
    position: positionPubkey,
    reserveX: matchingPair.account.reserveX,
    reserveY: matchingPair.account.reserveY,
    escrow: escrowPda,
    vault: escrow_vault_pda,
    vaulta: vaulta,
    vaultb: vaultb,
    tokenXMint: tokenXMint,
    tokenYMint: tokenYMint,
    binArrayLower: binArrayLower,
    binArrayUpper: binArrayUpper,
    dlmmProgram: METORA_PROGRAM_ID,
    eventAuthority: eventAuthority,
    tokenXProgram: TOKEN_PROGRAM_ID,
    tokenYProgram: TOKEN_PROGRAM_ID,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
  return removeLiquidityTx;
}
export const closePosition=async(lbPair:PublicKey,positionPubkey:PublicKey,binArrayLower:PublicKey,binArrayUpper:PublicKey,escrowPda:PublicKey,escrow_vault_pda:PublicKey)=>{
  const closeTx = await program.methods
      .closePosition()
      .accountsStrict({
        lbPair: lbPair,
        position: positionPubkey,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        escrow: escrowPda,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        vault: escrow_vault_pda
      })
      .rpc();
      return closeTx;
}
export const swap=async(amount:number,minAmountOut:anchor.BN,poolPubkey:PublicKey,userTokenIn:PublicKey,userTokenOut:PublicKey,
escrowPda:PublicKey,vaulta:PublicKey,vaultb:PublicKey,escrow_vault_pda:PublicKey,tokenxmint:PublicKey,
tokenymint:PublicKey,reserveX:PublicKey,reserveY:PublicKey,oracle:PublicKey,binArrayAccounts:any
)=>{
     
  const swapTx = await program.methods
  .swap(new anchor.BN(amount), minAmountOut)
  .accountsStrict({
    lbPair: poolPubkey,
    userTokenIn: userTokenIn,
    userTokenOut: userTokenOut,
    tokenXMint: tokenxmint,
    tokenXProgram: TOKEN_PROGRAM_ID,
    tokenYMint: tokenymint,
    tokenYProgram: TOKEN_PROGRAM_ID,
    hostFeeIn: null,
    binArrayBitmapExtension:null,
    escrow: escrowPda,
    vaulta: vaulta,
    vaultb: vaultb,
    reserveX: reserveX,
    reserveY: reserveY,
    oracle: oracle,
    dlmmProgram: METORA_PROGRAM_ID,
    eventAuthority: eventAuthority,
    vault:escrow_vault_pda,
    systemProgram: SystemProgram.programId,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram:TOKEN_PROGRAM_ID
  })
  .remainingAccounts(binArrayAccounts)
  .rpc();
  return swapTx;
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

