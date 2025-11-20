import { PrismaClient } from "@prisma/client";
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, NATIVE_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { AlphaPods } from "../idl/alpha_pods";
import * as idl from "../idl/alpha_pods.json";
import dotenv from "dotenv";
import DLMM, { deriveEventAuthority } from "@meteora-ag/dlmm";
import { deposit, swap } from "../contract/contract";
import { decryptPrivateKey } from "../services/auth";
import { transaction } from "./txn";
import { executeLP } from "./liquidity";
import { getfund } from "./fund";
import { updatebalance } from "../services/balance";
dotenv.config();
const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com");
const PROGRAM_ID=new PublicKey("2UxzDQnXYxnANW3ugTbjn3XhiSaqtfzpBKVqmh1nHL3A");
const METORA_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");

export const handlswap=async(token_y:PublicKey,amount:number,escrow_pda:string)=>{
   const tokenxmint=NATIVE_MINT;
   const connection=new Connection("https://api.devnet.solana.com");
   const dlmm=await DLMM.getLbPairs(connection);
   const escrowPda = new PublicKey(escrow_pda);
   console.log("escrow",escrowPda);
   const [escrow_vault_pda,bump] = PublicKey.findProgramAddressSync(
     [
       Buffer.from("vault"),
       escrowPda.toBuffer(),
     ],
     PROGRAM_ID
   );
   console.log("escorw vault",escrow_vault_pda);
   let poolsAttempted = 0;
   let poolsChecked = 0;
   const MIN_POOLS_TO_CHECK = 30;
   const errors: string[] = [];
  console.log(`\nSearching through ${dlmm.length} total pools...`);
  for(let i=0;i<dlmm.length;i++){
    if((dlmm[i].account.tokenXMint.equals(tokenxmint) && dlmm[i].account.tokenYMint.equals(token_y)) || (dlmm[i].account.tokenYMint.equals(NATIVE_MINT) && dlmm[i].account.tokenXMint.equals(token_y))){
      console.log("2");
      poolsChecked++;
      poolsAttempted++;
      const istokenx=dlmm[i].account.tokenXMint.equals(NATIVE_MINT);
      const swapXforY=istokenx;
      console.log(`\n[Pool ${poolsChecked}/${MIN_POOLS_TO_CHECK}] Checking: ${dlmm[i].publicKey.toBase58()}`);
      try{
         const pool=await DLMM.create(connection,dlmm[i].publicKey);
         const binArrays=await pool.getBinArrayForSwap(swapXforY, 20);
         const swapQuote =pool.swapQuote(
          new anchor.BN(amount),
          swapXforY,
          new anchor.BN(100),
          binArrays,
          false,
          2
         );
         console.log(` Quote successful: ${(swapQuote.minOutAmount.toNumber() / 1e9).toFixed(6)} tokens`); 
         const vaulta = await getAssociatedTokenAddress(dlmm[i].account.tokenXMint, escrowPda, true);
         const vaultb = await getAssociatedTokenAddress(dlmm[i].account.tokenYMint, escrowPda, true);
         const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);
         const binArrayAccounts = binArrays.map(binArray => ({
           pubkey: binArray.publicKey,
           isSigner: false,
           isWritable: true,
         }));
        const userTokenIn = swapXforY ? vaulta : vaultb;
        const userTokenOut = swapXforY ? vaultb : vaulta;
        const bitmapExtensionToUse = null;
        
       const swapTx=await swap(amount,swapQuote.minOutAmount,pool.pubkey,userTokenIn,userTokenOut,escrowPda,vaulta,vaultb,escrow_vault_pda,dlmm[i].account.tokenXMint,dlmm[i].account.tokenYMint,dlmm[i].account.reserveX,dlmm[i].account.reserveY,dlmm[i].account.oracle,binArrayAccounts
       )
        
        
     console.log(`\n SWAP SUCCESSFUL!`);
     console.log(`Transaction: ${swapTx}`);
    const token=await connection.getParsedAccountInfo(token_y);
    const parsedData =
      token.value?.data &&
      typeof token.value.data === "object" &&
      "parsed" in token.value.data
        ? token.value.data.parsed
        : null;
    const decimals = parsedData?.info?.decimals;
    console.log("token", parsedData);
     console.log("original",swapQuote.outAmount.toNumber()/decimals);
     const humanAmount = swapQuote.outAmount.toNumber() / Math.pow(10, decimals);
     console.log("dadas",humanAmount);
      const amount_out=swapQuote.outAmount.toNumber()/decimals;
     console.log(`Pool: ${dlmm[i].publicKey.toBase58()}`);
     console.log("swap amount out",humanAmount);
     return {
      txn:swapTx,
      amount_out:humanAmount,
      amount_out_smallest_unit: swapQuote.outAmount.toNumber(),
      amount_in:amount
     }
     
      }catch(e: any){
        const errorMsg = e?.message || e?.toString() || "Unknown error";
        if (e?.stack) {
          console.error("Stack:", e.stack);
        }
        if (e?.logs) {
          console.error("Program logs:");
          try { e.logs.forEach((log: string) => console.error("  ", log)); } catch {}
        }
        if (e?.data?.logs) {
          console.error("Program logs (data.logs):");
          try { e.data.logs.forEach((log: string) => console.error("  ", log)); } catch {}
        }
        console.error("Raw error object:", e);
        errors.push(`Pool ${poolsChecked}: ${errorMsg}`);
        continue;
      }
    }
  }
  
  console.error(`\n SWAP FAILED after checking ${poolsAttempted} pools`);
  console.error(`\nErrors encountered:`);
  errors.forEach(err => console.error(`  - ${err}`));
  
  throw new Error(
    `No suitable pool found after checking ${poolsAttempted} pools. ` +
    `Common issues: insufficient liquidity, pool requires bitmap extension, or token not supported on devnet. ` +
    `Try with a different token or on mainnet.`
  );
}

export const executedSwapProposal=async(proposal_id:string)=>{
  const prisma=new PrismaClient();
  try{
      const proposal=await prisma.proposal.findUnique({
        where:{
          id:proposal_id
        }
      });
      if(!proposal){
        return;
      }
      const escrow=await prisma.escrow.findUnique({
        where:{
          chatId:proposal.chatId
        }
      });
      if(!escrow){
        return;
      }
     
      await getfund(proposal_id);
      const totalamount=proposal.Members.length*proposal.amount;
      const swapResult=await handlswap(
        new PublicKey(proposal.mint),
        totalamount*LAMPORTS_PER_SOL,
        escrow.escrow_pda
      );

      for (const memberId of proposal.Members) {
        await updatebalance(swapResult.amount_out, swapResult.amount_in, proposal_id, memberId);
      }
      
      console.log("swapresd",swapResult)
      await prisma.proposal.delete({where:{
        id:proposal.id
      }});
      return {
        success: true,
        message: "Swap executed successfully!",
        transaction: swapResult.txn,
        amount_out:swapResult.amount_out
      };

  }catch(error:any){
     console.log("Execute Swap error");
    
  }
  return {
    success: false,
    message: "Not found"
  };
}


