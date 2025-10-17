import { getquote } from "./services/jupiter_swap"
import express, { json } from "express";
import dotenv from "dotenv";
dotenv.config();
const app=express();
app.use(json);
const main=async()=>{
    const quotemint="6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN";
    const basemint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const amount=1;
await getquote(quotemint,basemint,amount)
}
main();