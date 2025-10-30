import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import DLMM, { binIdToBinArrayIndex, deriveBinArray, deriveEventAuthority } from "@meteora-ag/dlmm";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";
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

/**
 * Get all DLMM pools for a token pair
 */
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

/**
 * Get swap quote for a specific pool
 */
async function getPoolSwapQuote(
  connection: Connection,
  poolPubkey: PublicKey,
  amountIn: anchor.BN,
  swapForY: boolean
): Promise<{ minOutAmount: anchor.BN; fee: anchor.BN; priceImpact: string } | null> {
  try {
    const dlmmPool = await DLMM.create(connection, poolPubkey);
    
    const swapQuote = await dlmmPool.swapQuote(
      amountIn,
      swapForY,
      new anchor.BN(100),
      []
    );

    return {
      minOutAmount: swapQuote.minOutAmount,
      fee: swapQuote.fee,
      priceImpact: swapQuote.priceImpact.toString()
    };
  } catch (error) {
    console.error(`Error getting quote for pool ${poolPubkey.toString()}:`, error);
    return null;
  }
}

/**
 * Select the best pool based on multiple criteria
 */
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

    // Get quotes for all pools
    const poolQuotes = await Promise.all(
      pools.map(async (pool) => {
        const quote = await getPoolSwapQuote(connection, pool.publicKey, amountIn, swapForY);
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

/**
 * Execute swap via the AlphaPods contract
 */
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
    // Find the best pool
    const bestPoolResult = await getBestDLMMPool(
      connection,
      tokenXMint,
      tokenYMint,
      amountIn,
      true // swapping Y for X (SOL for token)
    );

    if (!bestPoolResult) {
      throw new Error("No suitable pool found");
    }

    const { pool, estimatedOut } = bestPoolResult;

    console.log(`Executing swap on pool: ${pool.publicKey.toString()}`);
    console.log(`Amount In: ${amountIn.toString()}`);
    console.log(`Min Amount Out: ${estimatedOut.toString()}`);

    // Derive vault ATAs
    const vaulta = await getAssociatedTokenAddress(tokenXMint, escrowPda, true);
    const vaultb = await getAssociatedTokenAddress(tokenYMint, escrowPda, true);

    // Create vault accounts if they don't exist
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

    // Get bin arrays for the swap
    const dlmmPool = await DLMM.create(connection, pool.publicKey);
    const swapQuote = await dlmmPool.swapQuote(
      amountIn,
      true,
      new anchor.BN(100),
      []
    );
    
    const binArrays = swapQuote.binArraysPubkey || [];
    const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);

    // Execute swap via contract
    const txSignature = await program.methods
      .swap(amountIn, estimatedOut)
      .accountsStrict({
        lbPair: pool.publicKey,
        binArrayBitmapExtension: null,
        reserveX: pool.account.reserveX,
        reserveY: pool.account.reserveY,
        userTokenIn: vaultb,
        userTokenOut: vaulta,
        escrow: escrowPda,
        vaulta: vaulta,
        vaultb: vaultb,
        tokenXMint: tokenXMint,
        tokenYMint: tokenYMint,
        oracle: pool.account.oracle,
        hostFeeIn: null,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        tokenXProgram: TOKEN_PROGRAM_ID,
        tokenYProgram: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(
        binArrays.map(binArray => ({
          pubkey: binArray,
          isSigner: false,
          isWritable: true,
        }))
      )
      .rpc();

    console.log("✅ Swap successful!");
    console.log("Transaction signature:", txSignature);

    // Get final balance
    const vaultaAccount = await getAccount(connection, vaulta);
    const outputAmount = vaultaAccount.amount.toString();

    return {
      signature: txSignature,
      outputAmount
    };
  } catch (error) {
    console.error("Error executing swap:", error);
    return null;
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

