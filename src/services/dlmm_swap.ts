import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import DLMM, { binIdToBinArrayIndex, deriveBinArray, deriveEventAuthority } from "@meteora-ag/dlmm";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount, NATIVE_MINT, createSyncNativeInstruction, transfer } from "@solana/spl-token";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { AlphaPods } from "../idl/alpha_pods";
import * as idl from "../idl/alpha_pods.json";
import dotenv from "dotenv";

dotenv.config();

const METORA_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");

interface PoolInfo {
  publicKey: PublicKey;
  account: any;
  liquidity: number;
  feeBps: number;
  binStep: number;
  pricePerToken: number;
}

interface BestPoolResult {
  pool: PoolInfo;
  estimatedOut: anchor.BN;
  priceImpact: number;
}
export async function getDLMMPools(
  connection: Connection,
  tokenXMint: PublicKey,
  tokenYMint: PublicKey
): Promise<PoolInfo[]> {
  try {
    const allPairs = await DLMM.getLbPairs(connection);
    
  
    const matchingPairs = allPairs.filter(pair => 
      (pair.account.tokenXMint.toBase58() === tokenXMint.toBase58() &&
       pair.account.tokenYMint.toBase58() === tokenYMint.toBase58()) ||
      (pair.account.tokenXMint.toBase58() === tokenYMint.toBase58() &&
       pair.account.tokenYMint.toBase58() === tokenXMint.toBase58())
    );

    console.log("matching pairs",matchingPairs);
    const pools: PoolInfo[] = matchingPairs.map(pair => {
      const reserveX = pair.account.reserveX ? parseFloat(pair.account.reserveX.toString()) : 0;
      const reserveY = pair.account.reserveY ? parseFloat(pair.account.reserveY.toString()) : 0;
      const liquidity = reserveX + reserveY;
      const pricePerToken = reserveY > 0 ? reserveX / reserveY : 0;

      return {
        publicKey: pair.publicKey,
        account: pair.account,
        liquidity,
        feeBps: pair.account.parameters?.baseFactor || 0,
        binStep: pair.account.binStep,
        pricePerToken
      };
    });

    return pools;
  } catch (error) {
    console.error("Error fetching DLMM pools:", error);
    return [];
  }
}

async function getPoolSwapQuote(
  connection: Connection,
  poolPubkey: PublicKey,
  amountIn: anchor.BN,
  swapForY: boolean,
  poolAccount: any
): Promise<{ minOutAmount: anchor.BN; fee: anchor.BN; priceImpact: string } | null> {
  try {
   
    const reserveX = parseFloat(poolAccount.reserveX?.toString() || "0");
    const reserveY = parseFloat(poolAccount.reserveY?.toString() || "0");
    
    if (reserveX === 0 || reserveY === 0) {
      return null;
    }
    
    const amountInFloat = parseFloat(amountIn.toString());
    
    const outputAmount = swapForY 
      ? (reserveX * amountInFloat) / (reserveY + amountInFloat)
      : (reserveY * amountInFloat) / (reserveX + amountInFloat);
    
    // Apply fee
    const feeBps = poolAccount.parameters?.baseFactor || 25;
    const outputAfterFee = outputAmount * (1 - feeBps / 10000);
    
    // Calculate price impact
    const priceImpact = ((amountInFloat / (swapForY ? reserveY : reserveX)) * 100).toFixed(4);
    
    return {
      minOutAmount: new anchor.BN(Math.floor(outputAfterFee * 0.99)), // 1% slippage
      fee: new anchor.BN(Math.floor(outputAmount - outputAfterFee)),
      priceImpact: priceImpact
    };
  } catch (error) {
    return null;
  }
}

export async function getBestDLMMPool(
  connection: Connection,
  tokenXMint: PublicKey,
  tokenYMint: PublicKey,
  amountIn: anchor.BN,
  swapForY: boolean = true
): Promise<BestPoolResult | null> {
  try {
    const pools = await getDLMMPools(connection, tokenXMint, tokenYMint);
    
    if (pools.length === 0) {
      console.log("No DLMM pools found for this token pair");
      return null;
    }

    console.log(`Found ${pools.length} pools for token pair`);


    const poolQuotes = await Promise.all(
      pools.map(async (pool) => {
        const quote = await getPoolSwapQuote(connection, pool.publicKey, amountIn, swapForY, pool.account);
        return { pool, quote };
      })
    );
    const validQuotes = poolQuotes.filter(pq => pq.quote !== null);

    if (validQuotes.length === 0) {
      console.log("No valid quotes received");
      return null;
    }

    const scoredPools = validQuotes.map(({ pool, quote }) => {
      const outputAmount = parseFloat(quote!.minOutAmount.toString());
      const priceImpact = parseFloat(quote!.priceImpact);
      const liquidity = pool.liquidity;
      const feeBps = pool.feeBps;

    
      const outputScore = outputAmount;
      const impactScore = Math.max(0, 100 - Math.abs(priceImpact * 100));
      const liquidityScore = liquidity / 1e9;
      const feeScore = Math.max(0, 1000 - feeBps);

      const totalScore = 
        (outputScore * 0.4) +
        (impactScore * 0.3) +
        (liquidityScore * 0.2) +
        (feeScore * 0.1);

      return {
        pool,
        quote: quote!,
        score: totalScore
      };
    });

    // Sort by score (highest first)
    scoredPools.sort((a, b) => b.score - a.score);

    const best = scoredPools[0];
    
    console.log(`Best pool selected: ${best.pool.publicKey.toString()}`);
    console.log(`Output: ${best.quote.minOutAmount.toString()}`);
    console.log(`Price Impact: ${best.quote.priceImpact}%`);
    console.log(`Liquidity: ${best.pool.liquidity}`);
    console.log(`Fee: ${best.pool.feeBps} bps`);

    return {
      pool: best.pool,
      estimatedOut: best.quote.minOutAmount,
      priceImpact: parseFloat(best.quote.priceImpact)
    };
  } catch (error) {
    console.error("Error selecting best pool:", error);
    return null;
  }
}


export async function executeSwapViaDLMM(
  connection: Connection,
  program: Program<AlphaPods>,
  escrowPda: PublicKey,
  tokenXMint: PublicKey,
  tokenYMint: PublicKey,
  amountIn: anchor.BN,
  adminKeypair: Keypair
): Promise<{ signature: string; outputAmount: string } | null> {
  try {
    const METORA_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
    const DLMM_SDK = (await import('@meteora-ag/dlmm')).default;
    const allPairs = await DLMM_SDK.getLbPairs(connection);
    
    const targetPoolKey = new PublicKey("3RrtUag8F8aw6jAhTF4RxwvQmFX6KEXJUZ6zDL3eKaJE");
    const matchingPair = allPairs.find(pair => pair.publicKey.toBase58() === targetPoolKey.toBase58());
    
    if (!matchingPair) {
      console.log("⚠️  No matching pair found");
      return null;
    }
    console.log("mathc",matchingPair)
    console.log("\n📊 Pool State:");
    console.log("Pool Address:", matchingPair.publicKey.toString());
    console.log("Active Bin ID:", matchingPair.account.activeId);
    console.log("Bin Step:", matchingPair.account.binStep);
    console.log("Token X Mint:", matchingPair.account.tokenXMint.toString());
    console.log("Token Y Mint:", matchingPair.account.tokenYMint.toString());
    console.log("Reserve X:", matchingPair.account.reserveX.toString());
    console.log("Reserve Y:", matchingPair.account.reserveY.toString());
    console.log("Oracle:", matchingPair.account.oracle.toString());

    const vaulta = await getAssociatedTokenAddress(tokenXMint, escrowPda, true);
    const vaultb = await getAssociatedTokenAddress(tokenYMint, escrowPda, true);

    const vaultaInfo = await connection.getAccountInfo(vaulta);
    if (!vaultaInfo) {
      console.log("Creating vaulta...");
      const createVaultaTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          adminKeypair.publicKey,
          vaulta,
          escrowPda,
          tokenXMint
        )
      );
      await sendAndConfirmTransaction(connection, createVaultaTx, [adminKeypair]);
    }

    const vaultbInfo = await connection.getAccountInfo(vaultb);
    if (!vaultbInfo) {
      console.log("Creating vaultb...");
      const createVaultbTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          adminKeypair.publicKey,
          vaultb,
          escrowPda,
          tokenYMint
        )
      );
      await sendAndConfirmTransaction(connection, createVaultbTx, [adminKeypair]);
    }

    // Wrap SOL to WSOL and transfer to appropriate vault
    console.log("\n🔄 Wrapping SOL to WSOL...");
    const wsolAccount = await getAssociatedTokenAddress(NATIVE_MINT, adminKeypair.publicKey);
    
    const wrapTransaction = new Transaction();
    const wsolAccountInfo = await connection.getAccountInfo(wsolAccount);
    if (!wsolAccountInfo) {
      wrapTransaction.add(
        createAssociatedTokenAccountInstruction(
          adminKeypair.publicKey,
          wsolAccount,
          adminKeypair.publicKey,
          NATIVE_MINT
        )
      );
    }
    
    wrapTransaction.add(
      SystemProgram.transfer({
        fromPubkey: adminKeypair.publicKey,
        toPubkey: wsolAccount,
        lamports: amountIn.toNumber(),
      })
    );
    
    wrapTransaction.add(
      createSyncNativeInstruction(wsolAccount, TOKEN_PROGRAM_ID)
    );
    
    await sendAndConfirmTransaction(connection, wrapTransaction, [adminKeypair]);
    console.log("✅ Wrapped SOL!");

    // Transfer WSOL to the vault that matches NATIVE_MINT
    console.log("Transferring WSOL to escrow vault...");
    const targetVault = tokenYMint.equals(NATIVE_MINT) ? vaultb : vaulta;
    await transfer(
      connection,
      adminKeypair,
      wsolAccount,
      targetVault,
      adminKeypair,
      amountIn.toNumber()
    );

    let pool = deriveBinArray(matchingPair.publicKey, binIdToBinArrayIndex(new anchor.BN(matchingPair.account.activeId)), METORA_PROGRAM_ID);

    const activeBinArrayAccountMeta = {
      pubkey: pool[0],
      isSigner: false,
      isWritable: true, 
    };
    const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);

    console.log("\n🚀 Executing swap transaction...");

    const txSignature = await program.methods
      .swap(amountIn, new anchor.BN(0))
      .accountsStrict({
        lbPair: matchingPair.publicKey,
        binArrayBitmapExtension: null,
        reserveX: matchingPair.account.reserveX,
        reserveY: matchingPair.account.reserveY,
        userTokenIn: vaultb,
        userTokenOut: vaulta,
        escrow: escrowPda,
        vaulta: vaulta,
        vaultb: vaultb,
        tokenXMint: tokenXMint,
        tokenYMint: tokenYMint,
        oracle: matchingPair.account.oracle,
        hostFeeIn: null,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        tokenXProgram: TOKEN_PROGRAM_ID,
        tokenYProgram: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([activeBinArrayAccountMeta])
      .rpc();

    console.log("✅ Swap successful!");
    console.log("Transaction signature:", txSignature);

    await connection.confirmTransaction(txSignature, "confirmed");
    try {
      const userTokenXAccount = await getAccount(connection, vaulta);
      const userTokenYAccount = await getAccount(connection, vaultb);

      console.log("\n💰 Final Balances:");
      console.log("User Token X balance:", userTokenXAccount.amount.toString());
      console.log("User Token Y balance:", userTokenYAccount.amount.toString());
      
      return {
        signature: txSignature,
        outputAmount: userTokenXAccount.amount.toString()
      };
    } catch (accountError) {
      console.log("Note: Could not fetch token account balances");
      return {
        signature: txSignature,
        outputAmount: "0"
      };
    }

  } catch (error: any) {
    console.error("\n❌ Swap failed:", error);
    
    if (error.logs) {
      console.error("\n📋 Program Logs:");
      error.logs.forEach((log: string) => console.error(log));
    }
    
    throw error;
  }
}

/**
 * Get all pools with their details for display
 */
export async function getAllPoolsInfo(
  connection: Connection,
  tokenXMint: PublicKey,
  tokenYMint: PublicKey
): Promise<string> {
  const pools = await getDLMMPools(connection, tokenXMint, tokenYMint);
  
  if (pools.length === 0) {
    return "No pools found for this token pair.";
  }

  let message = `📊 **Available DLMM Pools** (${pools.length} found)\n\n`;
  
  pools.forEach((pool, index) => {
    const liquidityInSol = pool.liquidity / 1e9;
    message += `**Pool ${index + 1}:**\n`;
    message += `• Address: \`${pool.publicKey.toString().slice(0, 8)}...${pool.publicKey.toString().slice(-8)}\`\n`;
    message += `• Liquidity: ${liquidityInSol.toFixed(2)} SOL\n`;
    message += `• Bin Step: ${pool.binStep} bps\n`;
    message += `• Fee: ${pool.feeBps} bps\n`;
    message += `• Price: ${pool.pricePerToken.toFixed(6)}\n\n`;
  });

  return message;
}

