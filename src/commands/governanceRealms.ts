import { Scenes } from "telegraf";
import { MyContext } from "./Proposal";
import {
  depositGoverningTokensForTelegramUser,
  createGovernanceForRealm,
  createNativeTreasuryForGovernance,
  createOnchainProposal,
  castYesNoVote,
} from "../services/governanceRealms";
import { Role, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// /deposit_power wizard
export const createDepositPowerWizard = () =>
  new Scenes.WizardScene<MyContext>(
    "deposit_power_wizard",
    async (ctx) => {
      if (!ctx.from) {
        await ctx.reply("Could not detect your Telegram user.");
        return ctx.scene.leave();
      }

      await ctx.reply(
        "🔑 *Deposit governing tokens for voting power*\n\n" +
          "Step 1/3: Please send the *Realm address* (realm pubkey).",
        { parse_mode: "Markdown" }
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the realm address as text.");
        return;
      }
      const realm = ctx.message.text.trim();
      (ctx.wizard.state as any).realm = realm;

      await ctx.reply(
        "Step 2/3: Send the *community mint* address for the governance token.",
        { parse_mode: "Markdown" }
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the community mint address as text.");
        return;
      }
      const mint = ctx.message.text.trim();
      (ctx.wizard.state as any).communityMint = mint;

      await ctx.reply(
        "Step 3/3: How many *raw tokens* do you want to deposit?\n\n" +
          "For now, enter the amount in the smallest units (like lamports for SOL).",
        { parse_mode: "Markdown" }
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the amount as a number.");
        return;
      }

      const amountText = ctx.message.text.trim();
      const amountNumber = BigInt(amountText);

      const state = ctx.wizard.state as any;
      const realm = state.realm as string;
      const communityMint = state.communityMint as string;

      const from = ctx.from;
      if (!from) {
        await ctx.reply("Could not detect your Telegram user.");
        return ctx.scene.leave();
      }

      await ctx.reply(
        `⏳ Depositing governing tokens...\n\nRealm: \`${realm}\`\nMint: \`${communityMint}\`\nAmount (raw): \`${amountNumber.toString()}\``,
        { parse_mode: "Markdown" }
      );

      try {
        const { tokenOwnerRecordAddress, signature } =
          await depositGoverningTokensForTelegramUser({
            telegramId: String(from.id),
            realmPubkey: realm,
            communityMint,
            amountRaw: amountNumber,
          });

        await ctx.reply(
          "✅ *Deposit successful!*\n\n" +
            `*Token Owner Record:*\n\`${tokenOwnerRecordAddress.toBase58()}\`\n\n` +
            `*Transaction:*\n\`${signature}\``,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        console.error("[telegram] /deposit_power error:", error);
        await ctx.reply(
          "❌ Failed to deposit governing tokens:\n" +
            `\`${error?.message || String(error)}\``,
          { parse_mode: "Markdown" }
        );
      }

      return ctx.scene.leave();
    }
  );

// /setup_governance wizard (admin only)
export const createSetupGovernanceWizard = () =>
  new Scenes.WizardScene<MyContext>(
    "setup_governance_wizard",
    async (ctx) => {
      const from = ctx.from;
      if (!from) {
        await ctx.reply("Could not detect your Telegram user.");
        return ctx.scene.leave();
      }

      const user = await prisma.user.findUnique({
        where: { telegram_id: String(from.id) },
      });

      if (!user || user.role !== Role.admin) {
        await ctx.reply("❌ Only admin users can set up governance.");
        return ctx.scene.leave();
      }

      (ctx.wizard.state as any).adminUser = user;

      await ctx.reply(
        "⚙️ *Setup Governance for a Realm*\n\n" +
          "Step 1/3: Send the *Realm address* (realm pubkey).",
        { parse_mode: "Markdown" }
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the realm address as text.");
        return;
      }
      const realm = ctx.message.text.trim();
      (ctx.wizard.state as any).realm = realm;

      await ctx.reply(
        "Step 2/3: Send the *community mint* address for the governance token.",
        { parse_mode: "Markdown" }
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the community mint address as text.");
        return;
      }
      const mint = ctx.message.text.trim();
      (ctx.wizard.state as any).communityMint = mint;

      await ctx.reply(
        "Step 3/3: Enter minimum *raw* tokens required to create a proposal (smallest units).",
        { parse_mode: "Markdown" }
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the amount as a number.");
        return;
      }

      const minText = ctx.message.text.trim();
      const minAmount = BigInt(minText);

      const state = ctx.wizard.state as any;
      const realm = state.realm as string;
      const communityMint = state.communityMint as string;
      const from = ctx.from;

      if (!from) {
        await ctx.reply("Could not detect your Telegram user.");
        return ctx.scene.leave();
      }

      await ctx.reply(
        `⏳ Creating governance + native treasury...\n\nRealm: \`${realm}\`\nMint: \`${communityMint}\`\nMin tokens to propose (raw): \`${minAmount.toString()}\``,
        { parse_mode: "Markdown" }
      );

      try {
        const { governanceAddress, signature: govSig } =
          await createGovernanceForRealm({
            telegramId: String(from.id),
            realmPubkey: realm,
            communityMint,
            minTokensToPropose: minAmount,
            baseVotingTimeSeconds: 3 * 24 * 60 * 60,
          });

        const { treasuryAddress, signature: treasurySig } =
          await createNativeTreasuryForGovernance({
            telegramId: String(from.id),
            governancePubkey: governanceAddress.toBase58(),
          });

        await ctx.reply(
          "✅ *Governance setup complete!*\n\n" +
            `*Governance address:*\n\`${governanceAddress.toBase58()}\`\n\n` +
            `*Treasury (DAO wallet):*\n\`${treasuryAddress.toBase58()}\`\n\n` +
            `*Governance tx:*\n\`${govSig}\`\n\n` +
            `*Treasury tx:*\n\`${treasurySig}\``,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        console.error("[telegram] /setup_governance error:", error);
        await ctx.reply(
          "❌ Failed to set up governance:\n" +
            `\`${error?.message || String(error)}\``,
          { parse_mode: "Markdown" }
        );
      }

      return ctx.scene.leave();
    }
  );

// /gov_propose wizard
export const createGovProposeWizard = () =>
  new Scenes.WizardScene<MyContext>(
    "gov_propose_wizard",
    async (ctx) => {
      if (!ctx.from) {
        await ctx.reply("Could not detect your Telegram user.");
        return ctx.scene.leave();
      }

      await ctx.reply(
        "🗳️ *Create on-chain governance proposal*\n\n" +
          "Step 1/4: Send the *Realm address*.",
        { parse_mode: "Markdown" }
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the realm address as text.");
        return;
      }
      (ctx.wizard.state as any).realm = ctx.message.text.trim();
      await ctx.reply(
        "Step 2/4: Send the *Governance address* (governance pubkey).",
        { parse_mode: "Markdown" }
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the governance address as text.");
        return;
      }
      (ctx.wizard.state as any).governance = ctx.message.text.trim();
      await ctx.reply(
        "Step 3/4: Send the *community mint* address for the governance token.",
        { parse_mode: "Markdown" }
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the community mint as text.");
        return;
      }
      (ctx.wizard.state as any).communityMint = ctx.message.text.trim();
      await ctx.reply(
        "Step 4/4: Send the *proposal title* on the first line, and an optional *description / forum link* on the second line.\n\nExample:\n`Fund Developer Grant`\n`https://forum.example.com/proposal-1`",
        { parse_mode: "Markdown" }
      );
      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the proposal title/description as text.");
        return;
      }
      const text = ctx.message.text.trim();
      const [titleLine, descriptionLine] = text.split("\n");

      const state = ctx.wizard.state as any;
      const realm = state.realm as string;
      const governance = state.governance as string;
      const communityMint = state.communityMint as string;
      const name = titleLine || "Untitled Proposal";
      const descriptionLink = descriptionLine || "";

      const from = ctx.from;
      if (!from) {
        await ctx.reply("Could not detect your Telegram user.");
        return ctx.scene.leave();
      }

      await ctx.reply(
        "⏳ Creating on-chain proposal...\n\n" +
          `Realm: \`${realm}\`\n` +
          `Governance: \`${governance}\`\n` +
          `Mint: \`${communityMint}\`\n` +
          `Title: \`${name}\``,
        { parse_mode: "Markdown" }
      );

      try {
        const { proposalAddress, signature } = await createOnchainProposal({
          telegramId: String(from.id),
          realmPubkey: realm,
          governancePubkey: governance,
          communityMint,
          name,
          descriptionLink,
        });

        await ctx.reply(
          "✅ *Proposal created on-chain!*\n\n" +
            `*Proposal address:*\n\`${proposalAddress.toBase58()}\`\n\n` +
            `*Transaction:*\n\`${signature}\``,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        console.error("[telegram] /gov_propose error:", error);
        await ctx.reply(
          "❌ Failed to create proposal:\n" +
            `\`${error?.message || String(error)}\``,
          { parse_mode: "Markdown" }
        );
      }

      return ctx.scene.leave();
    }
  );

// /gov_vote command (simple yes/no by manual addresses)
export const handleGovVoteCommand = async (ctx: MyContext) => {
  if (!ctx.from) {
    await ctx.reply("Could not detect your Telegram user.");
    return;
  }

  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const parts = text ? text.trim().split(/\s+/) : [];

  // Expected format:
  // /gov_vote <yes|no> <realm> <governance> <proposal> <communityMint>
  if (parts.length !== 6) {
    await ctx.reply(
      "Usage:\n/gov_vote <yes|no> <realm> <governance> <proposal> <communityMint>",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const vote = parts[1].toLowerCase() === "yes" ? "yes" : "no";
  const realm = parts[2];
  const governance = parts[3];
  const proposal = parts[4];
  const communityMint = parts[5];

  await ctx.reply(
    `⏳ Casting *${vote.toUpperCase()}* vote on proposal...\n\n` +
      `Realm: \`${realm}\`\n` +
      `Governance: \`${governance}\`\n` +
      `Proposal: \`${proposal}\`\n` +
      `Mint: \`${communityMint}\``,
    { parse_mode: "Markdown" }
  );

  try {
    const { voteRecordAddress, signature } = await castYesNoVote({
      telegramId: String(ctx.from.id),
      realmPubkey: realm,
      governancePubkey: governance,
      proposalPubkey: proposal,
      communityMint,
      vote,
    });

    await ctx.reply(
      "✅ *Vote cast on-chain!*\n\n" +
        `*Vote record:*\n\`${voteRecordAddress.toBase58()}\`\n\n` +
        `*Transaction:*\n\`${signature}\``,
      { parse_mode: "Markdown" }
    );
  } catch (error: any) {
    console.error("[telegram] /gov_vote error:", error);
    await ctx.reply(
      "❌ Failed to cast vote:\n" +
        `\`${error?.message || String(error)}\``,
      { parse_mode: "Markdown" }
    );
  }
};

export const handleDepositPowerCommand = async (ctx: MyContext) => {
  await ctx.scene.enter("deposit_power_wizard");
};

export const handleSetupGovernanceCommand = async (ctx: MyContext) => {
  await ctx.scene.enter("setup_governance_wizard");
};

export const handleGovProposeCommand = async (ctx: MyContext) => {
  await ctx.scene.enter("gov_propose_wizard");
};


