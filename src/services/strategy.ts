import { BN } from "@coral-xyz/anchor";
import { StrategyType } from "@meteora-ag/dlmm";
import test from "node:test";

export const  simplestrategy=(activebinId:number,binStep:number,amountx:BN,amounty:BN)=>{
    const { minBinId, maxBinId } = percentageRangeToBinIds(activebinId, binStep, -2, 2);
    const { amountX, amountY } = calculateTokenDistribution(amountx, amounty, 100, 100);
  let strategies={
    amountX,
    amountY,
    activeId: activebinId,
    maxActiveBinSlippage: 10,
    strategyParameters: {
      minBinId,
      maxBinId,
      strategyType: { spotBalanced: {} },
      parameteres: new Array(64).fill(0)
    }
  }

  return strategies;
}
export const volatileStrategy=(activeBinId:number,binstep:number,amountx:BN,amounty:BN)=>{
const {minBinId,maxBinId}=percentageRangeToBinIds(activeBinId,binstep,-75,0);
const {amountX,amountY}=calculateTokenDistribution(amountx,amounty,0,100);
let strategies={
    amountX,
    amountY,
    activeId:activeBinId,
    maxActiveBinSlippage:10,
    strategyParameters:{
        minBinId,
        maxBinId,
        strategyType:{bidAskBalanced:{}},
        parameteres: new Array(64).fill(0)
    }
}
return strategies;
}
export const customstrategy=(strategies_type:string,binstep:number,amountx:BN,amounty:BN,lowerange:number,upperrange:number,tokenx_percentage:number,token_y_percentage:number,activeBinId:number )=>{
const {minBinId,maxBinId}=percentageRangeToBinIds(activeBinId,binstep,lowerange,upperrange);
const {amountX,amountY}=calculateTokenDistribution(amountx,amounty,100,100);
console.log("amount x",Number(amountX));
console.log("amount y",Number(amountY));
console.log("amount before",Number(amountx));
console.log("amount y before",Number(amounty));
const amountxbn=new BN(amountx);
const amountybn=new BN(amounty);

let strategies={
  amountX,
  amountY,
  activeId:activeBinId,
  maxActiveBinSlippage:10,
  strategyParameters:{
    minBinId,
    maxBinId,
    strategyType: { [strategies_type]: {} },
    parameteres: new Array(64).fill(0)
  }
}
return strategies;
}
interface strategies{
    curveBalanced:string 
      spotBalanced:string
        bidAskBalanced:string
}
export function percentageRangeToBinIds(
    activeBinId: number,
    binStep: number,
    lowerPercent: number,
    upperPercent: number
  ): { minBinId: number; maxBinId: number } {
    // Each bin represents (binStep / 10000) price change
    // For binStep 75: each bin = 0.75% price change
    const binsPerPercent = 100 / binStep; //  100/75 = 1.33 bins per 1%
    
    const minBinId = Math.floor(activeBinId + (lowerPercent * binsPerPercent));
    const maxBinId = Math.ceil(activeBinId + (upperPercent * binsPerPercent));
    
    return { minBinId, maxBinId };
  }
  export function calculateTokenDistribution(
    totalAmountX: BN,
    totalAmountY:  BN,
    tokenXPercent: number,
    tokenYPercent: number
  ): { amountX: BN; amountY: BN } {
    const amountX = totalAmountX.mul(new  BN(tokenXPercent)).div(new  BN(100));
    const amountY = totalAmountY.mul(new  BN(tokenYPercent)).div(new BN(100));
    return { amountX, amountY };
  }