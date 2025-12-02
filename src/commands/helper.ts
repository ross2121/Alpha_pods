import { getMint, NATIVE_MINT } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import axios from "axios";

export const calculateTVL=async(pooladdress:String)=>{
    const api = await axios.get(
      `https://devnet-dlmm-api.meteora.ag/pair/${pooladdress}`
    );
    console.log("data",api.data);
    console.log(NATIVE_MINT.toBase58());
    const isSolx=api.data.mint_x==NATIVE_MINT.toBase58();
    const isSolY=api.data.mint_y==NATIVE_MINT.toBase58();
    const data=api.data;
    if (!isSolx && !isSolY) {
      throw new Error("Neither token is SOL - can't calculate TVL");
    }
     const connection=new Connection("https://api.devnet.solana.com");
     let decimals;
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
    
    console.log("ded",decimaly);
    const amountX = data.reserve_x_amount / Math.pow(10, decimalx);
    const amountY = data.reserve_y_amount / Math.pow(10, decimaly);
    console.log("amountx",amountX)
    console.log("amount y",amountY);
    let valX_in_SOL = 0;
    let valY_in_SOL = 0;
    console.log("decimal",decimals);
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