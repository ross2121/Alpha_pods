import { Context, Markup } from "telegraf";
import { PrismaClient } from "@prisma/client";
import { wallet_funds, withdraw } from "../contract/contract";
import { decryptPrivateKey } from "../services/auth";
import bs58 from "bs58";

const prisma = new PrismaClient();

export const handleWallet = async (ctx: any) => {
  try {
    const userId = ctx.from?.id.toString();
    
    if (!userId) {
      await ctx.reply("❌ Unable to identify user.");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { telegram_id: userId }
    });

    if (!user) {
      await ctx.reply("❌ User not found. Please register first by joining the group.");
      return;
    }

    // Get wallet funds
    const fundsMap = await wallet_funds(user.id);
    
    if (!fundsMap || fundsMap.size === 0) {
      await ctx.reply(
        "💼 **Your Wallet**\n\n" +
        "**Balance:** 0 SOL\n\n" +
        "You don't have any deposits yet. Use `/deposit` to add funds to your escrow.",
        { 
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("🔑 Export Private Key", `export_key:${user.id}`)],
          ])
        }
      );
      return;
    }

    // Format funds display
    let fundsText = "💼 **Your Wallet Funds**\n\n**Balance:**\n";
    
    for (const [mint, amount] of fundsMap.entries()) {
      if (mint === "SOL" || mint === "") {
        fundsText += `• ${amount} SOL\n`;
      } else {
        fundsText += `• ${amount} tokens\n`;
        fundsText += `  Mint: \`${mint.slice(0, 8)}...${mint.slice(-8)}\`\n`;
      }
    }

    fundsText += "\n**Wallet Address:**\n";
    fundsText += `\`${user.public_key}\`\n\n`;
    fundsText += "Use the buttons below to manage your funds:";

    // Create inline keyboard with withdraw and export key buttons
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("💸 Withdraw Funds", `withdraw_wallet:${user.id}`)],
      [Markup.button.callback("🔑 Export Private Key", `export_key_wallet:${user.id}`)],
    ]);

    await ctx.reply(fundsText, {
      parse_mode: "Markdown",
      ...keyboard,
    });

  } catch (error: any) {
    console.error("Wallet display error:", error);
    await ctx.reply(`❌ Failed to load wallet: ${error.message || "Unknown error"}`);
  }
};

export const handleWithdrawWallet = async (ctx: any) => {
  try {
    await ctx.answerCbQuery();
    
    const userId = ctx.from?.id.toString();
    
    if (!userId) {
      await ctx.reply("❌ Unable to identify user.");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { telegram_id: userId }
    });

    if (!user) {
      await ctx.reply("❌ User not found. Please register first.");
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.reply("❌ Chat ID not found.");
      return;
    }

    const escrow = await prisma.escrow.findUnique({
      where: { chatId: BigInt(chatId) }
    });

    if (!escrow) {
      await ctx.reply("❌ Escrow not found for this chat. Please initialize an escrow first.");
      return;
    }

    await ctx.reply("⏳ Processing withdrawal from escrow...");

    // Call the withdraw function
    await withdraw(user.id, escrow.id);

    // Send private key to user's DM
    const secretKey = decryptPrivateKey(user.encrypted_private_key, user.encryption_iv);
    const privateKeyBase58 = bs58.encode(secretKey);

    const privateKeyMessage = `
✅ **Withdrawal Successful!**

Your funds have been withdrawn from the escrow vault.

⚠️ **YOUR PRIVATE KEY** ⚠️

**Wallet Details:**
• Public Key: \`${user.public_key}\`
• Private Key: \`${privateKeyBase58}\`

🔒 **SECURITY WARNING:**
• NEVER share this key with anyone
• Anyone with this key has full control of your wallet
• Store it safely offline
• Delete this message after saving the key

**Import to Phantom/Solflare:**
1. Open wallet app
2. Click "Import Wallet"
3. Paste the private key above
4. Your wallet will be imported

⚠️ This message will be automatically deleted in 60 seconds for your security.
    `;

    try {
      // Send to user's DM
      const sentMessage = await ctx.telegram.sendMessage(
        parseInt(userId),
        privateKeyMessage,
        { parse_mode: "Markdown" }
      );

      // Notify in group
      await ctx.reply(
        "✅ Withdrawal completed! Your private key has been sent to your private messages.",
        { parse_mode: "Markdown" }
      );

      // Auto-delete private key message after 60 seconds
      setTimeout(async () => {
        try {
          await ctx.telegram.deleteMessage(parseInt(userId), sentMessage.message_id);
          await ctx.telegram.sendMessage(
            parseInt(userId),
            "🔒 Private key message deleted for security."
          );
        } catch (error) {
          console.error("Failed to delete message:", error);
        }
      }, 60000);

    } catch (error) {
      console.error("Failed to send DM:", error);
      await ctx.reply(
        "✅ Withdrawal completed! However, I couldn't send you a DM. " +
        "Please use `/export_key` to get your private key.",
        { parse_mode: "Markdown" }
      );
    }

  } catch (error: any) {
    console.error("Withdraw wallet error:", error);
    await ctx.reply(`❌ Withdrawal failed: ${error.message || "Unknown error"}`);
  }
};

export const handleExportKeyWallet = async (ctx: any) => {
  try {
    await ctx.answerCbQuery();
    
    const userId = ctx.from?.id.toString();
    
    if (!userId) {
      await ctx.reply("❌ Unable to identify user.");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { telegram_id: userId }
    });

    if (!user) {
      await ctx.reply("❌ User not found. Please register first.");
      return;
    }

    const secretKey = decryptPrivateKey(user.encrypted_private_key, user.encryption_iv);
    const privateKeyBase58 = bs58.encode(secretKey);

    const warningMessage = `
⚠️ **PRIVATE KEY - KEEP THIS SECRET!** ⚠️

**Your Wallet Details:**
• Public Key: \`${user.public_key}\`
• Private Key: \`${privateKeyBase58}\`

🔒 **SECURITY WARNING:**
• NEVER share this key with anyone
• Anyone with this key has full control of your wallet
• Store it safely offline
• Delete this message after saving the key

**Import to Phantom/Solflare:**
1. Open wallet app
2. Click "Import Wallet"
3. Paste the private key above
4. Your wallet will be imported

⚠️ This message will be automatically deleted in 60 seconds for your security.
    `;

    try {
      // Send to user's DM
      const sentMessage = await ctx.telegram.sendMessage(
        parseInt(userId),
        warningMessage,
        { parse_mode: "Markdown" }
      );

      // Notify in group
      await ctx.reply(
        "🔑 Your private key has been sent to your private messages.",
        { parse_mode: "Markdown" }
      );

      // Auto-delete after 60 seconds
      setTimeout(async () => {
        try {
          await ctx.telegram.deleteMessage(parseInt(userId), sentMessage.message_id);
          await ctx.telegram.sendMessage(
            parseInt(userId),
            "🔒 Private key message deleted for security."
          );
        } catch (error) {
          console.error("Failed to delete message:", error);
        }
      }, 60000);

    } catch (error) {
      console.error("Failed to send DM:", error);
      await ctx.reply(
        "❌ I couldn't send you a DM. Please start a private chat with me first by clicking on my profile and pressing 'Start'.",
        { parse_mode: "Markdown" }
      );
    }

  } catch (error: any) {
    console.error("Export key wallet error:", error);
    await ctx.reply(`❌ Failed to export key: ${error.message || "Unknown error"}`);
  }
};

