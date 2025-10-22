import { getquote } from "../services/jupiter_swap";

export const handleSwap = async (ctx: any) => {
    // Add your swap logic here
    ctx.reply("Swap functionality coming soon!");
};

export const main = async () => {
    const quotemint = "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN";
    const basemint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const amount = 1;
    await getquote(quotemint, basemint, amount);
};
