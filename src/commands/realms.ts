import { PrismaClient } from "@prisma/client";
import { MyContext } from "./Proposal";

const prisma = new PrismaClient();

const formatRealmLine = (realm: any, sub: any) => {
  const threshold =
    sub?.min_value_usd !== null && sub?.min_value_usd !== undefined
      ? `$${Number(sub.min_value_usd).toLocaleString()}`
      : "none";
  const status = sub ? "following" : "not following";
  return (
    `• *${realm.name}* (${realm.cluster})\n` +
    `  Pubkey: \`${realm.pubkey}\`\n` +
    `  Status: ${status} | Min USD: ${threshold}`
  );
};

export const handleRealmsCommand = async (ctx: MyContext) => {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) {
    await ctx.reply("Could not detect your Telegram user.");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });
  if (!user) {
    await ctx.reply("I couldn't find your user. Please send /start first.");
    return;
  }

  const realms = await prisma.realm.findMany({
    include: {
      subscriptions: {
        where: { userId: user.id },
      },
    },
    orderBy: { name: "asc" },
  });

  if (!realms.length) {
    await ctx.reply("No indexed realms found yet. Once webhooks index realms, they will show up here.");
    return;
  }

  const lines = realms.map((realm) => formatRealmLine(realm, realm.subscriptions[0]));
  await ctx.reply(
    "🏛️ *Indexed Realms*\n\n" +
      lines.join("\n\n") +
      "\n\nUse:\n" +
      "• `/subscribe <realm_pubkey> [min_usd]`\n" +
      "• `/unsubscribe <realm_pubkey>`",
    { parse_mode: "Markdown" }
  );
};

export const handleSubscribeCommand = async (ctx: MyContext) => {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) {
    await ctx.reply("Could not detect your Telegram user.");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });
  if (!user) {
    await ctx.reply("I couldn't find your user. Please send /start first.");
    return;
  }

  const text = ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";
  const parts = text.split(/\s+/);

  if (parts.length < 2) {
    await ctx.reply(
      "Usage:\n" +
        "`/subscribe <realm_pubkey> [min_usd]`\n\n" +
        "Example:\n" +
        "`/subscribe FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK 10000`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const realmPubkey = parts[1];
  const minUsdRaw = parts[2];

  const realm = await prisma.realm.findUnique({
    where: { pubkey: realmPubkey },
  });

  if (!realm) {
    await ctx.reply("Realm not found in indexed data. Use /realms to view available realms.");
    return;
  }

  let minValueUsd: number | null = null;
  if (minUsdRaw !== undefined) {
    const parsed = Number(minUsdRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      await ctx.reply("Invalid min_usd. Use a non-negative number.");
      return;
    }
    minValueUsd = parsed;
  }

  const subscription = await prisma.subscription.upsert({
    where: {
      userId_realmId: {
        userId: user.id,
        realmId: realm.id,
      },
    },
    update: {
      notify_on_new_proposal: true,
      notify_on_final_result: true,
      min_value_usd: minValueUsd,
    },
    create: {
      userId: user.id,
      realmId: realm.id,
      notify_on_new_proposal: true,
      notify_on_final_result: true,
      min_value_usd: minValueUsd,
    },
  });

  await ctx.reply(
    "✅ Subscription updated\n\n" +
      `Realm: *${realm.name}*\n` +
      `Pubkey: \`${realm.pubkey}\`\n` +
      `Min USD filter: ${subscription.min_value_usd !== null ? `$${subscription.min_value_usd}` : "none"}`,
    { parse_mode: "Markdown" }
  );
};

export const handleUnsubscribeCommand = async (ctx: MyContext) => {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) {
    await ctx.reply("Could not detect your Telegram user.");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });
  if (!user) {
    await ctx.reply("I couldn't find your user. Please send /start first.");
    return;
  }

  const text = ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";
  const parts = text.split(/\s+/);

  if (parts.length < 2) {
    await ctx.reply(
      "Usage:\n" +
        "`/unsubscribe <realm_pubkey>`\n\n" +
        "Example:\n" +
        "`/unsubscribe FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const realmPubkey = parts[1];
  const realm = await prisma.realm.findUnique({
    where: { pubkey: realmPubkey },
  });

  if (!realm) {
    await ctx.reply("Realm not found in indexed data.");
    return;
  }

  await prisma.subscription.deleteMany({
    where: {
      userId: user.id,
      realmId: realm.id,
    },
  });

  await ctx.reply(
    `✅ Unsubscribed from *${realm.name}* (\`${realm.pubkey}\`)`,
    { parse_mode: "Markdown" }
  );
};

export const handleSetAlertMinCommand = async (ctx: MyContext) => {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) {
    await ctx.reply("Could not detect your Telegram user.");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });
  if (!user) {
    await ctx.reply("I couldn't find your user. Please send /start first.");
    return;
  }

  const text = ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";
  const parts = text.split(/\s+/);
  if (parts.length < 3) {
    await ctx.reply(
      "Usage:\n" +
        "`/set_alert_min <realm_pubkey> <usd|none>`\n\n" +
        "Examples:\n" +
        "`/set_alert_min FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK 5000`\n" +
        "`/set_alert_min FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK none`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const realmPubkey = parts[1];
  const thresholdInput = parts[2].toLowerCase();
  let minValueUsd: number | null;

  if (thresholdInput === "none") {
    minValueUsd = null;
  } else {
    const parsed = Number(thresholdInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      await ctx.reply("Invalid threshold. Use a non-negative number or `none`.");
      return;
    }
    minValueUsd = parsed;
  }

  const realm = await prisma.realm.findUnique({
    where: { pubkey: realmPubkey },
  });
  if (!realm) {
    await ctx.reply("Realm not found in indexed data. Use /realms.");
    return;
  }

  const subscription = await prisma.subscription.upsert({
    where: {
      userId_realmId: {
        userId: user.id,
        realmId: realm.id,
      },
    },
    update: {
      min_value_usd: minValueUsd,
      notify_on_new_proposal: true,
      notify_on_final_result: true,
    },
    create: {
      userId: user.id,
      realmId: realm.id,
      min_value_usd: minValueUsd,
      notify_on_new_proposal: true,
      notify_on_final_result: true,
      notify_on_authority_change: true,
    },
  });

  await ctx.reply(
    "✅ Min USD alert filter updated\n\n" +
      `Realm: *${realm.name}*\n` +
      `Min USD: ${subscription.min_value_usd !== null ? `$${subscription.min_value_usd}` : "none"}`,
    { parse_mode: "Markdown" }
  );
};

export const handleAuthorityAlertCommand = async (ctx: MyContext) => {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) {
    await ctx.reply("Could not detect your Telegram user.");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
  });
  if (!user) {
    await ctx.reply("I couldn't find your user. Please send /start first.");
    return;
  }

  const text = ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";
  const parts = text.split(/\s+/);
  if (parts.length < 3) {
    await ctx.reply(
      "Usage:\n" +
        "`/authority_alert <realm_pubkey> <on|off>`\n\n" +
        "Example:\n" +
        "`/authority_alert FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK off`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const realmPubkey = parts[1];
  const toggle = parts[2].toLowerCase();
  if (toggle !== "on" && toggle !== "off") {
    await ctx.reply("Second argument must be `on` or `off`.");
    return;
  }

  const realm = await prisma.realm.findUnique({
    where: { pubkey: realmPubkey },
  });
  if (!realm) {
    await ctx.reply("Realm not found in indexed data. Use /realms.");
    return;
  }

  const subscription = await prisma.subscription.upsert({
    where: {
      userId_realmId: {
        userId: user.id,
        realmId: realm.id,
      },
    },
    update: {
      notify_on_authority_change: toggle === "on",
      notify_on_new_proposal: true,
      notify_on_final_result: true,
    },
    create: {
      userId: user.id,
      realmId: realm.id,
      notify_on_new_proposal: true,
      notify_on_final_result: true,
      notify_on_authority_change: toggle === "on",
    },
  });

  await ctx.reply(
    "✅ Authority-change alert preference updated\n\n" +
      `Realm: *${realm.name}*\n` +
      `notify_on_authority_change: *${subscription.notify_on_authority_change ? "ON" : "OFF"}*`,
    { parse_mode: "Markdown" }
  );
};
