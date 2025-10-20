import { getquote } from "./services/jupiter_swap"
import express, { json } from "express";
import { Telegraf,Markup } from "telegraf";
import dotenv from "dotenv";
dotenv.config();
const bot = new Telegraf(process.env.TELEGRAM_API || "");
const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback("Swap", "Swap")],
    [Markup.button.callback("Add member", "add member")],
    [Markup.button.callback("🔄 Swap Tokens", "swap_tokens")],
    [Markup.button.callback("💼 Manage Wallet", "manage_wallet")],
    [Markup.button.callback("🚀 Start Strategy", "start_strategy")],
    [Markup.button.callback("⏹️ Stop Strategy", "stop_strategy")],
    [Markup.button.callback("📈 Exit Position", "exit_position")]
]);
const app=express();
app.use(json);

const main=async()=>{
    const quotemint="6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN";
    const basemint="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const amount=1;
await getquote(quotemint,basemint,amount)
}
main();