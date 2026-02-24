import { Markup } from "telegraf";
import { PrismaClient } from "@prisma/client";
import { MyContext } from "./Proposal";

const prisma = new PrismaClient();

// /alerts - show and manage governance alerts per realm
export const handleAlertsCommand = async (ctx: MyContext) => {
  const from = ctx.from;
  if (!from) {
    await ctx.reply("Could not detect your Telegram user. Try again in a direct chat with the bot.");
    return;
  }

  const telegramId = String(from.id);

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });

  if (!user) {
    await ctx.reply("I couldn't find your user. Please send /start first so I can register you.");
    return;
  }

  // Fetch all realms plus this user's subscription (if any) for each
  const realms = await prisma.realm.findMany({
    include: {
      subscriptions: {
        where: { userId: user.id },
      },
    },
    orderBy: { name: "asc" },
  });

  if (!realms.length) {
    await ctx.reply(
      "No governance realms are indexed yet.\n\n" +
      "Once proposals are created and indexed, you can manage alerts here."
    );
    return;
  }

  const lines: string[] = [];
  const keyboardRows: ReturnType<typeof Markup.button.callback>[][] = [];

  for (const realm of realms) {
    const sub = realm.subscriptions[0];
    const status = sub ? "✅ Subscribed" : "❌ Not subscribed";
    const np = sub ? (sub.notify_on_new_proposal ? "ON" : "OFF") : "-";
    const fr = sub ? (sub.notify_on_final_result ? "ON" : "OFF") : "-";

    lines.push(
      `• *${realm.name}*\n` +
      `  Status: ${status}\n` +
      `  New proposals: ${np} | Final results: ${fr}`
    );

    const label = sub ? `Disable alerts for ${realm.name}` : `Enable alerts for ${realm.name}`;
    keyboardRows.push([
      Markup.button.callback(label, `alerts_toggle:${realm.id}`),
    ]);
  }

  const text =
    "🔔 *Your governance alerts*\n\n" +
    lines.join("\n\n") +
    "\n\nTap a button below to enable/disable alerts per realm.\n\n" +
    "This controls:\n" +
    "• New proposal notifications\n" +
    "• Final result notifications (Executed / Cancelled / Defeated)";

  const keyboard = Markup.inlineKeyboard(keyboardRows);

  await ctx.reply(text, {
    parse_mode: "Markdown",
    ...keyboard,
  });
};

// Callback: toggle alerts for a given realm
export const handleAlertsToggleAction = async (ctx: MyContext) => {
  const from = ctx.from;
  const cb = ctx.callbackQuery as any;
  const data: string | undefined = cb?.data;

  if (!from || !data) {
    await ctx.answerCbQuery("Something went wrong.");
    return;
  }

  const telegramId = String(from.id);
  const parts = data.split(":"); // alerts_toggle:<realmId>
  if (parts.length !== 2 || parts[0] !== "alerts_toggle") {
    await ctx.answerCbQuery("Invalid action.");
    return;
  }

  const realmId = parts[1];

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });

  if (!user) {
    await ctx.answerCbQuery("User not found. Send /start first.");
    return;
  }

  const realm = await prisma.realm.findUnique({
    where: { id: realmId },
  });

  if (!realm) {
    await ctx.answerCbQuery("Realm not found.");
    return;
  }

  let subscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      realmId: realm.id,
    },
  });

  if (!subscription) {
    // Create and enable alerts
    subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        realmId: realm.id,
        notify_on_new_proposal: true,
        notify_on_final_result: true,
      },
    });

    await ctx.answerCbQuery(`Alerts enabled for ${realm.name}`);
  } else {
    // Toggle: if anything is ON, turn both OFF; else turn both ON
    const currentlyOn = subscription.notify_on_new_proposal || subscription.notify_on_final_result;
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        notify_on_new_proposal: !currentlyOn,
        notify_on_final_result: !currentlyOn,
      },
    });

    await ctx.answerCbQuery(
      currentlyOn
        ? `Alerts disabled for ${realm.name}`
        : `Alerts enabled for ${realm.name}`
    );
  }

  // Optionally refresh the list for better UX
  try {
    await handleAlertsCommand(ctx);
  } catch (e) {
    console.error("[alerts] Failed to refresh alerts message:", e);
  }
};


