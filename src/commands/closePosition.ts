import DLMM, { binIdToBinArrayIndex, deriveBinArray, deriveEventAuthority } from "@meteora-ag/dlmm";
import { PrismaClient } from "@prisma/client";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Context } from "telegraf";
import { addbin, closePosition, removeLiqudity } from "../contract/contract";
import { getAssociatedTokenAddress, getMint, NATIVE_MINT } from "@solana/spl-token";
import {  updatebalance_afterlp } from "../services/balance";
import { deductamount } from "./fund";
import * as anchor from "@coral-xyz/anchor";
export const executeClosePosition = async (ctx: Context, positionId: string) => {
  const prisma=new PrismaClient();
  const PROGRAM_ID=new PublicKey("2UxzDQnXYxnANW3ugTbjn3XhiSaqtfzpBKVqmh1nHL3A");
  const connection=new Connection("https://api.devnet.solana.com");
  const METORA_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
    try {
      await ctx.answerCbQuery("⏳ Closing position...");
      await ctx.reply("⏳ Closing liquidity position... This may take a moment.");
      console.log("Closing position with ID:",positionId);
      const position = await prisma.liquidityPosition.findUnique({
        where: { id: positionId },
        include: { escrow: true }
      });
      if (!position || !position.isActive) {
        await ctx.reply(" Position not found or already closed.");
        return;
      }
      const escrowPda = new PublicKey(position.escrow.escrow_pda);
      console.log("escrow",escrowPda);
      const [escrow_vault_pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), escrowPda.toBuffer()],
      PROGRAM_ID
      );
      console.log("pda",escrow_vault_pda);
      const positionPubkey = new PublicKey(position.positionAddress);
      const poolPubkey = new PublicKey(position.poolAddress);
      const allPairs = await DLMM.getLbPairs(connection);
      const matchingPair = allPairs.find(pair => pair.publicKey.toBase58() === poolPubkey.toBase58());
  
      if (!matchingPair) {
        await ctx.reply(" Pool not found.");
        return;
      }
      const tokenXMint = matchingPair.account.tokenXMint;
      const tokenYMint = matchingPair.account.tokenYMint;
      const lowerBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(position.lowerBinId));
      const upperBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(position.upperBinId));
      const [binArrayLower] = deriveBinArray(poolPubkey, lowerBinArrayIndex, METORA_PROGRAM_ID);
      let [binArrayUpper] = deriveBinArray(poolPubkey, upperBinArrayIndex, METORA_PROGRAM_ID);
      const vaulta = await getAssociatedTokenAddress(tokenXMint, escrowPda, true);
      const vaultb = await getAssociatedTokenAddress(tokenYMint, escrowPda, true);
      const balance_before_vaulta = await connection.getTokenAccountBalance(vaulta);
      const balance_before_vaultb = await connection.getTokenAccountBalance(vaultb);
      console.log("balance before", balance_before_vaulta, balance_before_vaultb);
      await ctx.reply("💧 Removing liquidity...");
      const dlmmPool = await DLMM.create(connection, poolPubkey);  
      const positionData = await dlmmPool.getPosition(positionPubkey);
      // for(let i=0;i<positionData.positionData.positionBinData.length;i++){
      //       if(positionData.positionData.positionBinData[i].binId==position.lowerBinId||positionData.positionData.positionBinData[i].binId==position.upperBinId){
      //         console.log(`data ${i}`,positionData.positionData.positionBinData)
      //       }
      // }
       console.log("data",positionData.positionData);
       
      const binLiquidityReduction = positionData.positionData.positionBinData.map(bin => ({
        binId: bin.binId,
        bpsToRemove: 10000 
      }));
      const binArraysNeeded = new Set<number>();
      for (let binId = position.lowerBinId; binId <= position.upperBinId; binId++) {
        binArraysNeeded.add(binIdToBinArrayIndex(new anchor.BN(binId)).toNumber());
      }
      const binArrayPubkeys = Array.from(binArraysNeeded).map(index => 
        deriveBinArray(poolPubkey, new anchor.BN(index), METORA_PROGRAM_ID)[0]
      );
  
      console.log("lowerbin array",binArrayLower);
      console.log("upper bin arrya",binArrayUpper);
      if(binArrayLower.equals(binArrayUpper)){
        const placeholderIndex = upperBinArrayIndex.add(new anchor.BN(1));
        [binArrayUpper] = deriveBinArray(
          matchingPair.publicKey,
          placeholderIndex,
          METORA_PROGRAM_ID
        );
        if(!binArrayUpper){
            await addbin(upperBinArrayIndex,matchingPair.publicKey,binArrayUpper,escrowPda,escrow_vault_pda)
        } 
      }
       
      const removeLiquidityTx=await removeLiqudity(binLiquidityReduction,poolPubkey,positionPubkey,matchingPair,escrowPda,escrow_vault_pda,vaulta,vaultb,tokenXMint,tokenYMint,binArrayLower,binArrayUpper);
      
      await connection.confirmTransaction(removeLiquidityTx, "confirmed");
      await ctx.reply("🔒 Closing position...");
      const after_closing_vaulta = await connection.getTokenAccountBalance(vaulta);
      const after_closing_vaultb = await connection.getTokenAccountBalance(vaultb);
                               
        console.log("after closing", after_closing_vaulta, after_closing_vaultb);
      
      const amountA = new anchor.BN(after_closing_vaulta.value.amount).sub(new anchor.BN(balance_before_vaulta.value.amount));
      const amountb=new anchor.BN(after_closing_vaultb.value.amount).sub(new anchor.BN(balance_before_vaultb.value.amount));
      const mintA = tokenXMint.toBase58();
      const mintB = tokenYMint.toBase58();
      
      console.log("Amount A (raw):", amountA.toString(), "Mint A:", mintA);
      console.log("Amount B (raw):", amountb.toString(), "Mint B:", mintB);
      console.log("binarya id",position.lowerBinId);
      console.log("binarray id",position.upperBinId);
      const proposal = await prisma.proposal.findFirst({
        where: {
          chatId: position.chatId,
          mint: position.tokenMint,
          mintb: "LIQUIDITY_PROPOSAL"
        }
      });
      
      if (!proposal) {
        console.log("No proposal found for position, cannot distribute funds");
        await ctx.reply("❌ Could not find the original proposal. Funds are in the escrow vault but cannot be distributed automatically.");
      } else {
        const numMembers = proposal.Members.length;
        if (numMembers === 0) {
          await ctx.reply("❌ No members found in proposal. Cannot distribute funds.");
        } else {
            
          let tokenAmountPerMember=0;
           let solAmountPerMember;
          if(matchingPair.account.tokenXMint==NATIVE_MINT){
            const tokenMintInfo=await getMint(connection,matchingPair.account.tokenYMint); 
            const tokenamount=Number(positionData.positionData.totalYAmount)/Math.pow(10, tokenMintInfo.decimals);
            console.log("decimal",tokenMintInfo);
            console.log("das",tokenMintInfo.decimals);
            tokenAmountPerMember=tokenamount/numMembers;
            console.log("token amount",tokenAmountPerMember);
            const solamount=Number(positionData.positionData.totalXAmount)/LAMPORTS_PER_SOL;
               solAmountPerMember=solamount/numMembers;
               console.log("Sol amount",solAmountPerMember);
          }else{
            const tokenMintInfo=await getMint(connection,matchingPair.account.tokenXMint); 
            console.log("decimal",tokenMintInfo);
            console.log("das",tokenMintInfo.decimals);
            const tokenAmount=Number(positionData.positionData.totalXAmount)/ Math.pow(10, tokenMintInfo.decimals);
            console.log("token amount",tokenAmountPerMember);
            tokenAmountPerMember=tokenAmount/numMembers;
            const solamount=Number(positionData.positionData.totalYAmount)/LAMPORTS_PER_SOL;
            solAmountPerMember=solamount/numMembers; 
            console.log("Sol amount per member",solAmountPerMember);
  
          }
          
       console.log("usdc",matchingPair.account.tokenXMint)
          await updatebalance_afterlp(solAmountPerMember, tokenAmountPerMember, proposal.id);
        }
      }
      const beforesol=await connection.getBalance(new PublicKey(escrow_vault_pda));
      console.log("before sol",beforesol);
      const beforeamount=beforesol/LAMPORTS_PER_SOL;
      console.log("before amount",beforeamount);
      const closeTx = await closePosition(poolPubkey,positionPubkey,binArrayLower,binArrayUpper,escrowPda,escrow_vault_pda);
      await new Promise(resolve => setTimeout(resolve, 2000)); 
      if(!proposal){
        return;
      }
      const aftersol = await connection.getBalance(
        new PublicKey(escrow_vault_pda),
        "confirmed"
      );
      const afteramount=aftersol/LAMPORTS_PER_SOL;
      const amount=afteramount-beforeamount;
      console.log("proposal amount",amount);
      console.log("after amount",afteramount);
      console.log("before amount",beforeamount);
      await deductamount(proposal?.id,amount,false);
      await prisma.liquidityPosition.update({
        where: { id: positionId.toString() },
        data: { isActive: false }
      });
  
      const solscanRemoveLiqUrl = `https://solscan.io/tx/${removeLiquidityTx}?cluster=devnet`;
      const solscanCloseTxUrl = `https://solscan.io/tx/${closeTx}?cluster=devnet`;
      const solscanPositionUrl = `https://solscan.io/account/${position.positionAddress}?cluster=devnet`;
      
      const successMessage = `
✅ **Position Closed Successfully!**
  
  **Details:**
• Position: [${position.positionAddress}](${solscanPositionUrl})
  • Liquidity removed and position closed
  
  **Transactions:**
• Remove Liquidity: [View on Solscan](${solscanRemoveLiqUrl})
• Close Position: [View on Solscan](${solscanCloseTxUrl})
  
💰 Funds have been returned to the escrow vault!
      `;
  
      await ctx.reply(successMessage, { parse_mode: "Markdown", link_preview_options: { is_disabled: true } });
    
    } catch (error: any) {
      console.error("Error closing position:", error);
      let errorMsg = "❌ Failed to close position.";
      
      if (error.logs) {
        console.error("Program logs:", error.logs);
      }
      
      await ctx.reply(errorMsg);
    }
  };