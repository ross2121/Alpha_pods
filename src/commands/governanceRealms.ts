import { Scenes } from "telegraf";
import { MyContext } from "./Proposal";
import {
  depositGoverningTokensForTelegramUser,
  createGovernanceForRealm,
  createNativeTreasuryForGovernance,
  createOnchainProposal,
  castYesNoVote,
} from "../services/governanceRealms";
import { Role, PrismaClient, GovernanceProposalState } from "@prisma/client";

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

// /gov_vote wizard: pick proposal from DB, then choose yes/no and mint
export const createGovVoteWizard = () =>
  new Scenes.WizardScene<MyContext>(
    "gov_vote_wizard",
    async (ctx) => {
      if (!ctx.from) {
        await ctx.reply("Could not detect your Telegram user.");
        return ctx.scene.leave();
      }

      const proposals = await prisma.governanceProposal.findMany({
        where: {
          state: {
            in: [
              GovernanceProposalState.Draft,
              GovernanceProposalState.Voting,
              GovernanceProposalState.Succeeded,
            ],
          } as any,
        },
        include: {
          realm: true,
        },
        orderBy: {
          voting_start: "desc",
        },
        take: 10,
      });

      if (!proposals.length) {
        await ctx.reply(
          "I couldn't find any indexed governance proposals yet.\n\n" +
            "Once proposals are created and indexed, you can vote on them here."
        );
        return ctx.scene.leave();
      }

      (ctx.wizard.state as any).proposals = proposals;

      const lines = proposals.map((p, idx) => {
        const num = idx + 1;
        const title = p.title || "Untitled";
        const realmName = p.realm.name;
        const shortPk =
          p.proposal_pubkey.slice(0, 4) +
          "..." +
          p.proposal_pubkey.slice(-4);
        const state = p.state;
        return `${num}) [${realmName}] ${title} (${state}) \`${shortPk}\``;
      });

      await ctx.reply(
        "🗳️ *Choose a proposal to vote on*\n\n" +
          lines.join("\n") +
          "\n\nReply with the number of the proposal.",
        { parse_mode: "Markdown" }
      );

      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please reply with the proposal number (e.g. 1).");
        return;
      }

      const text = ctx.message.text.trim();
      const idx = Number(text);
      const proposals = (ctx.wizard.state as any).proposals as any[];

      if (!Number.isInteger(idx) || idx < 1 || idx > proposals.length) {
        await ctx.reply(
          `Please send a valid number between 1 and ${proposals.length}.`
        );
        return;
      }

      const selected = proposals[idx - 1];
      (ctx.wizard.state as any).selectedProposal = selected;

      await ctx.reply(
        "Great. Now reply with your vote:\n\n" +
          "`yes` – vote in favour\n" +
          "`no` – vote against",
        { parse_mode: "Markdown" }
      );

      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please reply with `yes` or `no`.");
        return;
      }

      const text = ctx.message.text.trim().toLowerCase();
      if (text !== "yes" && text !== "no") {
        await ctx.reply("Please reply with exactly `yes` or `no`.");
        return;
      }

      (ctx.wizard.state as any).voteSide = text;

      await ctx.reply(
        "Finally, send the *community mint* address used for this governance token.",
        { parse_mode: "Markdown" }
      );

      return ctx.wizard.next();
    },
    async (ctx) => {
      if (!("message" in ctx) || !ctx.message || !("text" in ctx.message)) {
        await ctx.reply("Please send the community mint address as text.");
        return;
      }

      const communityMint = ctx.message.text.trim();
      const state = ctx.wizard.state as any;
      const selected = state.selectedProposal as any;
      const voteSide = state.voteSide as "yes" | "no";

      const from = ctx.from;
      if (!from) {
        await ctx.reply("Could not detect your Telegram user.");
        return ctx.scene.leave();
      }

      const realmPubkey = selected.realm.pubkey as string;
      const governancePubkey = selected.governance_pubkey as string;
      const proposalPubkey = selected.proposal_pubkey as string;

      await ctx.reply(
        `⏳ Casting *${voteSide.toUpperCase()}* vote on proposal...\n\n` +
          `Realm: \`${realmPubkey}\`\n` +
          `Governance: \`${governancePubkey}\`\n` +
          `Proposal: \`${proposalPubkey}\`\n` +
          `Mint: \`${communityMint}\``,
        { parse_mode: "Markdown" }
      );

      try {
        const { voteRecordAddress, signature } = await castYesNoVote({
          telegramId: String(from.id),
          realmPubkey,
          governancePubkey,
          proposalPubkey,
          communityMint,
          vote: voteSide,
        });

        await ctx.reply(
          "✅ *Vote cast on-chain!*\n\n" +
            `*Vote record:*\n\`${voteRecordAddress.toBase58()}\`\n\n` +
            `*Transaction:*\n\`${signature}\``,
          { parse_mode: "Markdown" }
        );
      } catch (error: any) {
        console.error("[telegram] /gov_vote wizard error:", error);
        await ctx.reply(
          "❌ Failed to cast vote:\n" +
            `\`${error?.message || String(error)}\``,
          { parse_mode: "Markdown" }
        );
      }

      return ctx.scene.leave();
    }
  );

export const handleGovVoteCommand = async (ctx: MyContext) => {
  await ctx.scene.enter("gov_vote_wizard");
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


