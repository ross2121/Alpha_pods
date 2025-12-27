import { PrismaClient } from "@prisma/client";
import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, NATIVE_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

import dotenv from "dotenv";
import DLMM, { binIdToBinArrayIndex, deriveBinArrayBitmapExtension, deriveEventAuthority, isOverflowDefaultBinArrayBitmap } from "@meteora-ag/dlmm";
import {  swap } from "../contract/contract";
import { getfund } from "./fund";
import { updatebalance } from "../services/balance";
dotenv.config();
import { PythHttpClient, getPythProgramKeyForCluster } from "@pythnetwork/client";
import { MeteoraPoolType } from "../services/type";

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
  const map=new Map<String,number>();
let maxamount=0;
let quote:any;
let poolpublickey:any;
let account=null;
let count=0;
let first;
let second;
if(tokenxmint.toBase58()[0]<token_y.toBase58()[0]){
     first=tokenxmint.toBase58();
     second=token_y.toBase58();
}else{
  first=token_y.toBase58();
  second=tokenxmint.toBase58();
}
const Poolapi=await fetch(`https://devnet-dlmm-api.meteora.ag/pair/group_pair/${first}-${second}`)
const allPairs:MeteoraPoolType[]=await Poolapi.json();
  for (let i=0;i<allPairs.length;i++){ 
      count++;
      const istokenx=new PublicKey(allPairs[i].mint_x).equals(NATIVE_MINT);
      const swapXforY=istokenx;
      const pool=await DLMM.create(connection,new PublicKey(allPairs[i].address));
      const amounttokena=allPairs[i].reserve_x_amount;
      const amounttokenb=allPairs[i].reserve_y_amount;
      const binArrays=await pool.getBinArrayForSwap(swapXforY, 20);
      if(istokenx){
         if(amounttokena<amount){
          console.log("true");
          continue;
         }
      } else{
          if(amounttokenb<amount){
            console.log("true");
            continue;
          }
      }
      try {
        const swapQuote = pool.swapQuote(
          new anchor.BN(amount),
          swapXforY,
          new anchor.BN(100),
          binArrays,
          false,
          2
        );
        const current = swapQuote.outAmount;
        if(Number(current) > maxamount){
          maxamount = Number(current);  
          poolpublickey =allPairs[i].address;
          quote = swapQuote;
          const allDLMMPairs = await DLMM.getLbPairs(connection);
    const createdPair = allDLMMPairs.find(p => p.publicKey.equals(new PublicKey(allPairs[i].address)));
          account = createdPair?.account;
        } 
      } catch(quoteError: any) {
        if(quoteError?.message?.includes("Insufficient liquidity")) {
          console.log("Skipping pool - insufficient liquidity in bin arrays");
          continue;
        }
        throw quoteError;
      }
  
}
  console.log("count",count);
  let maxpublickey=null;
console.log("final ",quote);
     if(!account){
      console.log("chedd");
      return;
          }  
          maxpublickey=new PublicKey(poolpublickey);   
          const istokenx=account.tokenXMint.equals(NATIVE_MINT);
      const swapXforY=istokenx;
      console.log(`\n[Pool ${poolsChecked}/${MIN_POOLS_TO_CHECK}] Checking: ${maxpublickey.toBase58()}`);
      try{
         const pool=await DLMM.create(connection,maxpublickey);
         const binArrays=await pool.getBinArrayForSwap(swapXforY, 20);
         const swapQuote =quote;
         console.log("swap quote",swapQuote);
    
         const activeBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(account.activeId));
         let bitmapExtensionToUse: PublicKey | null = null;
         
         if (isOverflowDefaultBinArrayBitmap(activeBinArrayIndex)) {
           bitmapExtensionToUse = deriveBinArrayBitmapExtension(maxpublickey, METORA_PROGRAM_ID)[0];
           console.log("Pool requires bitmap extension:", bitmapExtensionToUse.toBase58());
         } else {
           console.log("Pool does not require bitmap extension");
         }
         console.log(` Quote successful: ${(swapQuote.minOutAmount.toNumber() / 1e9).toFixed(6)} tokens`); 
         const vaulta = await getAssociatedTokenAddress(account.tokenXMint, escrowPda, true);
         const vaultb = await getAssociatedTokenAddress(account.tokenYMint, escrowPda, true);
         const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);
         const binArrayAccounts = binArrays.map(binArray => ({
           pubkey: binArray.publicKey,
           isSigner: false,
           isWritable: true,
         }));
        const userTokenIn = swapXforY ? vaulta : vaultb;
        const userTokenOut = swapXforY ? vaultb : vaulta;
       const swapTx=await swap(amount,swapQuote.minOutAmount,pool.pubkey,userTokenIn,userTokenOut,escrowPda,vaulta,vaultb,escrow_vault_pda,account.tokenXMint,account.tokenYMint,account.reserveX,account.reserveY,account.oracle,binArrayAccounts,bitmapExtensionToUse
       );
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
     console.log(`Pool: ${maxpublickey.toBase58()}`);
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
        console.log("NO proposal found")
        return;
      }
      const escrow=await prisma.escrow.findUnique({
        where:{
          chatId:proposal.chatId
        }
      });
      if(!escrow){
        console.log("NO escrow  found")
        return;
      }
      await getfund(proposal_id);
      const totalamount=proposal.Members.length*proposal.amount;
      const swapResult=await handlswap(
        new PublicKey(proposal.mint),
        totalamount*LAMPORTS_PER_SOL,
        escrow.escrow_pda
      );
      if(!swapResult){
      return
      }
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

    console.error("Error message:", error?.message || error);
    
    if (error?.stack) {
      console.error("Stack trace:", error.stack);
    }
    
    if (error?.logs) {
      console.error("\n📋 Transaction logs:");
      error.logs.forEach((log: string) => console.error("  ", log));
    }
    
    throw error; 
     
  }
  return {
    success: false,
    message: "Not found"
  };
}


