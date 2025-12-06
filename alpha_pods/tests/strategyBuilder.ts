import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

/**
 * Convert percentage range to bin IDs
 * @param activeBinId Current active bin ID
 * @param binStep Bin step (e.g., 25 = 0.25%, 75 = 0.75%)
 * @param lowerPercent Lower percentage (e.g., -2 for -2%)
 * @param upperPercent Upper percentage (e.g., +2 for +2%)
 */
export function percentageRangeToBinIds(
  activeBinId: number,
  binStep: number,
  lowerPercent: number,
  upperPercent: number
): { minBinId: number; maxBinId: number } {
  // Each bin represents (binStep / 10000) price change
  // For binStep 75: each bin = 0.75% price change
  const binsPerPercent = 100 / binStep; // e.g., 100/75 = 1.33 bins per 1%
  
  const minBinId = Math.floor(activeBinId + (lowerPercent * binsPerPercent));
  const maxBinId = Math.ceil(activeBinId + (upperPercent * binsPerPercent));
  
  return { minBinId, maxBinId };
}

/**
 * Calculate token amounts based on distribution percentages
 * @param totalAmountX Total amount of token X
 * @param totalAmountY Total amount of token Y
 * @param tokenXPercent Percentage for token X (0-100)
 * @param tokenYPercent Percentage for token Y (0-100)
 */
export function calculateTokenDistribution(
  totalAmountX: anchor.BN,
  totalAmountY: anchor.BN,
  tokenXPercent: number,
  tokenYPercent: number
): { amountX: anchor.BN; amountY: anchor.BN } {
  const amountX = totalAmountX.mul(new anchor.BN(tokenXPercent)).div(new anchor.BN(100));
  const amountY = totalAmountY.mul(new anchor.BN(tokenYPercent)).div(new anchor.BN(100));
  return { amountX, amountY };
}

/**
 * Heart-Attack Strategy Configuration
 * - High-risk, high-reward
 * - Spot strategy
 * - Range: -2% to +2%
 * - 50% X, 50% Y
 */
export function createHeartAttackStrategy(
  activeBinId: number,
  binStep: number,
  totalAmountX: anchor.BN,
  totalAmountY: anchor.BN
) {
  const { minBinId, maxBinId } = percentageRangeToBinIds(activeBinId, binStep, -2, 2);
  const { amountX, amountY } = calculateTokenDistribution(totalAmountX, totalAmountY, 50, 50);
  
  return {
    name: "Heart-Attack",
    description: "High-risk, high-reward strategy",
    liquidityParameter: {
      amountX,
      amountY,
      activeId: activeBinId,
      maxActiveBinSlippage: 10,
      strategyParameters: {
        minBinId,
        maxBinId,
        strategyType: { spotBalanced: {} },
        parameteres: new Array(64).fill(0)
      }
    },
    takeProfitPercent: 50,
    stopLossPercent: -50
  };
}

/**
 * Multi-Day Strategy Configuration
 * - Balanced strategy with moderate risk
 * - Bid-Ask strategy
 * - Range: -65% to 0%
 * - 0% X, 100% Y
 */
export function createMultiDayStrategy(
  activeBinId: number,
  binStep: number,
  totalAmountX: anchor.BN,
  totalAmountY: anchor.BN
) {
  const { minBinId, maxBinId } = percentageRangeToBinIds(activeBinId, binStep, -65, 0);
  const { amountX, amountY } = calculateTokenDistribution(totalAmountX, totalAmountY, 0, 100);
  
  return {
    name: "Multi-Day",
    description: "Balanced strategy with moderate risk",
    liquidityParameter: {
      amountX,
      amountY,
      activeId: activeBinId,
      maxActiveBinSlippage: 10,
      strategyParameters: {
        minBinId,
        maxBinId,
        strategyType: { bidAskBalanced: {} },
        parameteres: new Array(64).fill(0)
      }
    },
    takeProfitPercent: 30,
    stopLossPercent: -30
  };
}

/**
 * Generic strategy builder
 */
export function createStrategy(
  name: string,
  strategyType: 'spotBalanced' | 'curveBalanced' | 'bidAskBalanced' | 'bidAskOneSide' | 'bidAskImBalanced',
  activeBinId: number,
  binStep: number,
  lowerPercent: number,
  upperPercent: number,
  totalAmountX: anchor.BN,
  totalAmountY: anchor.BN,
  tokenXPercent: number,
  tokenYPercent: number,
  takeProfitPercent?: number,
  stopLossPercent?: number
) {
  const { minBinId, maxBinId } = percentageRangeToBinIds(activeBinId, binStep, lowerPercent, upperPercent);
  const { amountX, amountY } = calculateTokenDistribution(totalAmountX, totalAmountY, tokenXPercent, tokenYPercent);
  
  const strategyTypeMap = {
    spotBalanced: { spotBalanced: {} },
    curveBalanced: { curveBalanced: {} },
    bidAskBalanced: { bidAskBalanced: {} },
    bidAskOneSide: { bidAskOneSide: {} },
    bidAskImBalanced: { bidAskImBalanced: {} }
  };
  
  return {
    name,
    liquidityParameter: {
      amountX,
      amountY,
      activeId: activeBinId,
      maxActiveBinSlippage: 10,
      strategyParameters: {
        minBinId,
        maxBinId,
        strategyType: strategyTypeMap[strategyType],
        parameteres: new Array(64).fill(0)
      }
    },
    takeProfitPercent,
    stopLossPercent
  };
}

