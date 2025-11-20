import DLMM, { binIdToBinArrayIndex, deriveBinArray, deriveEventAuthority } from "@meteora-ag/dlmm";
import { PrismaClient } from "@prisma/client";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Context } from "telegraf";
import { closePosition, removeLiqudity } from "../contract/contract";
import { getAssociatedTokenAddress, getMint, NATIVE_MINT } from "@solana/spl-token";
import { sendmoney } from "../services/balance";
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
      const tokenYMint = matchingPair.account.tokenYMint
      const activeBinId = matchingPair.account.activeId;
      const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);
      const lowerBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(position.lowerBinId));
      const upperBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(position.upperBinId));
      const [binArrayLower] = deriveBinArray(poolPubkey, lowerBinArrayIndex, METORA_PROGRAM_ID);
      const [binArrayUpper] = deriveBinArray(poolPubkey, upperBinArrayIndex, METORA_PROGRAM_ID);
      const vaulta = await getAssociatedTokenAddress(tokenXMint, escrowPda, true);
      const vaultb = await getAssociatedTokenAddress(tokenYMint, escrowPda, true);
      const balance_before_vaulta = await connection.getTokenAccountBalance(vaulta);
      const balance_before_vaultb = await connection.getTokenAccountBalance(vaultb);
      console.log("balance before", balance_before_vaulta, balance_before_vaultb);
      await ctx.reply("💧 Removing liquidity...");
      const binLiquidityReduction = [{ binId: activeBinId, bpsToRemove: 10000 }];
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
        // Calculate per-member amounts
        const numMembers = proposal.Members.length;
        if (numMembers === 0) {
          await ctx.reply("❌ No members found in proposal. Cannot distribute funds.");
        } else {
          let solAmountLamports: number;
          let tokenAmountSmallestUnit: number;
          const tokenMint = mintA === NATIVE_MINT.toBase58() ? tokenYMint : tokenXMint;
          const tokenMintInfo = await getMint(connection, tokenMint);
          const tokenDecimals = tokenMintInfo.decimals;
          const tokenDecimalsMultiplier = Math.pow(10, tokenDecimals);    
          if(mintA === NATIVE_MINT.toBase58()){
      
            solAmountLamports = Number(amountA);
            tokenAmountSmallestUnit = Number(amountb);
          } else {
        
            tokenAmountSmallestUnit = Number(amountA);
            solAmountLamports = Number(amountb);
          }
          const totalSolAmount = solAmountLamports / LAMPORTS_PER_SOL;
          const totalTokenAmount = tokenAmountSmallestUnit / tokenDecimalsMultiplier;
          const solAmountPerMember = totalSolAmount / numMembers;
          const tokenAmountPerMember = totalTokenAmount / numMembers;
          
          console.log("Total SOL (lamports):", solAmountLamports);
          console.log("Total SOL (SOL):", totalSolAmount);
          console.log("Total Token (smallest units):", tokenAmountSmallestUnit);
          console.log("Total Token (tokens):", totalTokenAmount);
          console.log("Token decimals:", tokenDecimals);
          console.log("SOL per member:", solAmountPerMember);
          console.log("Token per member:", tokenAmountPerMember);
      
          await sendmoney(solAmountPerMember, tokenAmountPerMember, proposal.id);
        }
      }
      const beforesol=await connection.getBalance(new PublicKey(escrow_vault_pda));
      const beforeamount=beforesol/LAMPORTS_PER_SOL;
      const closeTx = await closePosition(poolPubkey,positionPubkey,binArrayLower,binArrayUpper,escrowPda,escrow_vault_pda);
   
      await connection.confirmTransaction(closeTx, "confirmed");
      if(!proposal){
        return;
      }
      const aftersol=await connection.getBalance(new PublicKey(escrow_vault_pda));
      const afteramount=aftersol/LAMPORTS_PER_SOL;
      const amount=afteramount-beforeamount;
      await deductamount(proposal?.id,amount,true);
      await prisma.liquidityPosition.update({
        where: { id: positionId.toString() },
        data: { isActive: false }
      });
  
      const successMessage = `
   **Position Closed Successfully!**
  
  **Details:**
  • Position: \`${position.positionAddress}\`
  • Liquidity removed and position closed
  
  **Transactions:**
  • Remove Liquidity: \`${removeLiquidityTx}\`
  • Close Position: \`${closeTx}\`
  
  Funds have been returned to the escrow vault! 
      `;
  
      await ctx.reply(successMessage, { parse_mode: "Markdown" });
  
    } catch (error: any) {
      console.error("Error closing position:", error);
      let errorMsg = "❌ Failed to close position.";
      
      if (error.logs) {
        console.error("Program logs:", error.logs);
      }
      
      await ctx.reply(errorMsg);
    }
  };