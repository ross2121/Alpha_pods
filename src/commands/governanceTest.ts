import { MyContext } from "./Proposal";
import { simulateGovernanceNotificationsForTelegramUser } from "../services/governanceIndexer";

export const handleTestGovernanceAlerts = async (ctx: MyContext) => {
  const from = ctx.from;
  if (!from) {
    await ctx.reply("Could not detect your Telegram user. Try again in a direct chat with the bot.");
    return;
  }

  const telegramId = String(from.id);

  await ctx.reply(
    "🚀 Running governance alerts test for your account...\n\n" +
    "You should shortly receive:\n" +
    "1) New proposal notification\n" +
    "2) New vote notification\n" +
    "3) Proposal executed notification"
  );

  try {
    const result = await simulateGovernanceNotificationsForTelegramUser(telegramId);
    await ctx.reply(
      "✅ Test triggered successfully.\n\n" +
      "If you did not receive any notifications, check:\n" +
      "- That you have DMs open with the bot\n" +
      "- Server logs for any errors\n\n" +
      `Realm: \`${result.realmPubkey}\`\nProposal: \`${result.proposalPubkey}\``,
      { parse_mode: "Markdown" }
    );
  } catch (error: any) {
    console.error("[telegram] /test_alerts error:", error);
    await ctx.reply(
      "❌ Failed to run governance alerts test.\n" +
      `Error: ${error?.message || String(error)}\n\n` +
      "Make sure you have used /start at least once so your user is created."
    );
  }
};


