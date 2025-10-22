import { PrismaClient } from "@prisma/client"
import { Context } from "telegraf";

export const admin_middleware = async (ctx: Context, next: () => Promise<void>) => {
    const telegram_id = ctx.from?.id.toString();
    if (!telegram_id) {
        await ctx.reply("Unable to identify user");
        return;
    }

    const prisma = new PrismaClient();
    const admin = await prisma.user.findUnique({
        where: {
            telegram_id: telegram_id
        }
    });
    
    if (!admin || admin.role === "user") {
        await ctx.reply("Access denied. Admin privileges required.");
        return;
    }
    
    await next();
}