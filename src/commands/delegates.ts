import { PrismaClient } from "@prisma/client";
import { MyContext } from "./Proposal";

const prisma = new PrismaClient();

const formatDelegateLine = (entry: any) => {
  const delegate = entry.delegate;
  const stats = entry;

  const name = delegate.display_name || delegate.wallet_pubkey.slice(0, 8) + "...";
  const handle = delegate.telegram_handle
    ? ` (@${delegate.telegram_handle})`
    : "";

  const participation = stats.participation_rate
    ? `${(stats.participation_rate * 100).toFixed(1)}%`
    : "n/a";

  return (
    `• *${name}*${handle}\n` +
    `  Wallet: \`${delegate.wallet_pubkey}\`\n` +
    `  Total votes: ${stats.total_votes}\n` +
    `  Participation: ${participation}`
  );
};

export const handleDelegatesCommand = async (ctx: MyContext) => {
  const telegramId = ctx.from?.id?.toString();
  if (!telegramId) {
    await ctx.reply("Could not detect your Telegram user.");
    return;
  }

  const text = ctx.message && "text" in ctx.message ? ctx.message.text.trim() : "";
  const parts = text.split(/\s+/);

  if (parts.length < 2) {
    await ctx.reply(
      "Usage:\n" +
        "`/delegates <realm_pubkey>`\n\n" +
        "Example:\n" +
        "`/delegates FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const realmPubkey = parts[1];

  const realm = await prisma.realm.findUnique({
    where: { pubkey: realmPubkey },
    include: {
      delegateStats: {
        include: { delegate: true },
        orderBy: { total_votes: "desc" },
        take: 10,
      },
    },
  });

  if (!realm) {
    await ctx.reply(
      "Realm not found in indexed data. Use /realms to see available realms."
    );
    return;
  }

  if (!realm.delegateStats.length) {
    await ctx.reply(
      `No delegates found yet for *${realm.name}*.\n\n` +
        "Once delegates create profiles and vote on proposals, they will appear here.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const lines = realm.delegateStats.map((entry) => formatDelegateLine(entry));

  await ctx.reply(
    `🧑‍⚖️ *Top delegates for ${realm.name}*\n\n` +
      lines.join("\n\n") +
      "\n\nYou can delegate to one of these wallets using:\n" +
      "`/delegate_to <realm_pubkey> <delegate_wallet>`",
    { parse_mode: "Markdown" }
  );
};

export const handleDelegateToCommand = async (ctx: MyContext) => {
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
        "`/delegate_to <realm_pubkey> <delegate_wallet>`\n\n" +
        "Example:\n" +
        "`/delegate_to FMEWULPSGR1BKVJK4K7xTBaG7EQ5fawwrEwBmBTmyTuK 9xYsv1...`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const realmPubkey = parts[1];
  const delegateWallet = parts[2];

  const realm = await prisma.realm.findUnique({
    where: { pubkey: realmPubkey },
  });

  if (!realm) {
    await ctx.reply(
      "Realm not found in indexed data. Use /realms to see available realms."
    );
    return;
  }

  // Ensure Delegate profile exists (basic auto-create if missing)
  let delegate = await prisma.delegate.findUnique({
    where: { wallet_pubkey: delegateWallet },
  });

  if (!delegate) {
    delegate = await prisma.delegate.create({
      data: {
        wallet_pubkey: delegateWallet,
        display_name: delegateWallet.slice(0, 8) + "...",
      },
    });
  }

  // Create or update Delegation record
  const delegation = await prisma.delegation.upsert({
    where: {
      delegator_wallet_realmId: {
        delegator_wallet: user.public_key,
        realmId: realm.id,
      },
    },
    update: {
      delegateId: delegate.id,
    },
    create: {
      realmId: realm.id,
      delegator_wallet: user.public_key,
      delegateId: delegate.id,
    },
  });

  await ctx.reply(
    "✅ Delegation updated\n\n" +
      `Realm: *${realm.name}*\n` +
      `Your wallet: \`${user.public_key}\`\n` +
      `Delegate: \`${delegate.wallet_pubkey}\``,
    { parse_mode: "Markdown" }
  );
};

