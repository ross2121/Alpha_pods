import { Markup } from "telegraf";

export const handleStart = async (ctx: any) => {
  const welcomeMessage = `
🚀 **Welcome to AlphaPods Bot!**

Your decentralized group treasury management solution on Solana.

**📋 Available Commands:**

**👥 Group Management:**
• \`/membercount\` - Check group member count
• \`/myinfo\` - View your user information
• \`/market\` - View market information

**💼 Proposal & Voting:**
• \`/propose\` - Create a new proposal (Admin only)
• Vote on proposals via inline buttons

**💱 Swap & Trading:**
• \`/swap\` or use Swap button - Execute token swaps
• View quotes and execute swaps via DLMM pools

**🏊 Liquidity Management:**
• \`/add_liquidity\` - Add liquidity to pools (Admin only)
• \`/view_positions\` - View your liquidity positions
• \`/close_position\` - Close a liquidity position (Admin only)
• \`/execute_liquidity\` - Execute liquidity operations (Admin only)

**💰 Treasury & Wallet:**
• \`/fund\` - View minimum funding requirements
• \`/withdraw <amount>\` - Withdraw SOL from escrow vault
• \`/export_key\` - Export your private key (secure)

**🎯 Quick Actions:**
Use the buttons below for common actions!
  `;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("💼 Propose", "propose")],
    [Markup.button.callback("🔄 Swap Tokens", "swap_tokens")],
    [Markup.button.callback("🏊 Add Liquidity", "add_liquidity")],
    [Markup.button.callback("📊 View Positions", "view_positions")],
    [Markup.button.callback("🔒 Close Position", "close_position")],
    [Markup.button.callback("📈 Market Info", "market_info")],
  ]);

  await ctx.reply(welcomeMessage, {
    parse_mode: "Markdown",
    ...keyboard,
  });
};