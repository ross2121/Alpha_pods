import { getMint, NATIVE_MINT } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import axios from "axios";
import { log } from "console";

export const calculateTVL=async(pooladdress:String)=>{
    const api = await axios.get(
      `https://devnet-dlmm-api.meteora.ag/pair/${pooladdress}`
    );
    console.log(NATIVE_MINT.toBase58());
    const isSolx=api.data.mint_x==NATIVE_MINT.toBase58();
    const isSolY=api.data.mint_y==NATIVE_MINT.toBase58();
    const data=api.data;
    if (!isSolx && !isSolY) {
      throw new Error("Neither token is SOL - can't calculate TVL");
    }
     const connection=new Connection("https://api.devnet.solana.com");
     let decimalx;
     let decimaly;
     if(isSolx){
     const mintinfo=await getMint(connection,new PublicKey(api.data.mint_y));
     decimaly=mintinfo.decimals;
  decimalx=9;
    }else{
      const mintinfo=await getMint(connection,new PublicKey(api.data.mint_x));
      decimalx=mintinfo.decimals;
      decimaly=9;
    }
    console.log("ded",decimalx);
    const amountX = data.reserve_x_amount / Math.pow(10, decimalx);
    const amountY = data.reserve_y_amount / Math.pow(10, decimaly);
    console.log("amountx",amountX)
    console.log("amount y",amountY);
    let valX_in_SOL = 0;
    let valY_in_SOL = 0;
    if (isSolx) {
      valX_in_SOL = amountX;
      valY_in_SOL = amountY * (1 / data.current_price);
    } else {
      valY_in_SOL = amountY;
      valX_in_SOL = amountX * data.current_price;
    }
  console.log("vual",valX_in_SOL);
  console.log("dasdas",valY_in_SOL);
    return valX_in_SOL + valY_in_SOL;
  }
  export const YeildScore=async(fees:number,volume:number,reserve_x_amount:number,reserve_y_amount:number,mint_y:string,current_Price:number)=>{
    if (!fees ||  fees < 0  || isNaN(fees) ) {
      return 0;
    }
    const connection=new Connection("https://api.devnet.solana.com");
    const safeVolume = volume && volume >= 0 ? volume : 0;
    const solRaw =reserve_y_amount;
    const tokenRaw =reserve_x_amount;
    const mintinfo=await getMint(connection,new PublicKey(mint_y));
    const decimaly=mintinfo.decimals;
    const solReal = solRaw / Math.pow(10, 9);
const tokenReal = tokenRaw / Math.pow(10, decimaly);
const tokenValueInSol = tokenReal * current_Price;
const totalLiquidityInSol = solReal + tokenValueInSol;
const solPriceUsd = 190; 
const totalLiquidityUsd = totalLiquidityInSol * solPriceUsd;
    const fee = (fees / totalLiquidityUsd) * 100;
    const tvl = totalLiquidityUsd > 0 ? Math.log10(totalLiquidityUsd) : 0;
    const efficiency = totalLiquidityUsd > 0 ? safeVolume / totalLiquidityUsd : 0;
  
    const score = fee * tvl * efficiency;
    
  
    return isNaN(score) || !isFinite(score) ? 0 : score;
  }