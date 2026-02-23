import { PublicKey } from '@solana/web3.js';
import { PrismaClient, Role } from '@prisma/client';
import dotenv from 'dotenv';
import { createdao } from '../services/createdao';
import { Scenes } from 'telegraf';

dotenv.config();

const prisma = new PrismaClient();

// DAO creation wizard: ask realm name, community mint, optional council mint
export const createDaoWizard = () =>
  new Scenes.WizardScene<any>(
    'dao_wizard',
    // Step 1: verify admin and ask for realm name
    async (ctx) => {
      const telegramId = ctx.from?.id?.toString();
      if (!telegramId) {
        await ctx.reply('❌ Unable to identify admin user.');
        return ctx.scene.leave();
      }

      const user = await prisma.user.findUnique({
        where: { telegram_id: telegramId },
      });

      if (!user || user.role !== Role.admin) {
        await ctx.reply('❌ Only an admin user can create a DAO realm.');
        return ctx.scene.leave();
      }

      (ctx.wizard.state as any).adminUser = user;
      await ctx.reply(
        '📝 Please enter a name for your DAO realm (e.g. `My DAO`):',
        { parse_mode: 'Markdown' }
      );
      return ctx.wizard.next();
    },
    // Step 2: get realm name, ask for community mint
    async (ctx) => {
      if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Please send the DAO name as text.');
        return;
      }
      const realmName = ctx.message.text.trim();
      if (!realmName) {
        await ctx.reply('❌ DAO name cannot be empty. Please try again.');
        return;
      }
      (ctx.wizard.state as any).realmName = realmName;

      await ctx.reply(
        '🔑 Now send the *community token mint* address (SPL token) that will govern this DAO:\n\n' +
          'Example: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`',
        { parse_mode: 'Markdown' }
      );
      return ctx.wizard.next();
    },
    // Step 3: get community mint, ask for council mint
    async (ctx) => {
      if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Please send the community mint as text.');
        return;
      }
      const mintText = ctx.message.text.trim();
      try {
        // validate mint
        const pk = new PublicKey(mintText);
        (ctx.wizard.state as any).communityMint = pk.toBase58();
      } catch {
        await ctx.reply('❌ Invalid community mint. Please send a valid Solana address.');
        return;
      }

      await ctx.reply(
        '👥 Optional: send a *council mint* address for a council token.\n' +
          'If you do **not** want a council, type `none`.',
        { parse_mode: 'Markdown' }
      );
      return ctx.wizard.next();
    },
    // Step 4: get council mint (or none) and create the realm
    async (ctx) => {
      if (!ctx.message || !('text' in ctx.message)) {
        await ctx.reply('❌ Please send the council mint as text, or `none`.');
        return;
      }
      const councilText = ctx.message.text.trim();
      let councilMintPk: PublicKey | undefined = undefined;
      if (councilText.toLowerCase() !== 'none') {
        try {
          councilMintPk = new PublicKey(councilText);
        } catch {
          await ctx.reply('❌ Invalid council mint. Please send a valid address or `none`.');
          return;
        }
      }

      const state = ctx.wizard.state as any;
      const user = state.adminUser;
      const realmName: string = state.realmName;
      const communityMintStr: string = state.communityMint;

      if (!user || !realmName || !communityMintStr) {
        await ctx.reply('❌ Missing data in DAO wizard. Please try `/createdao` again.');
        return ctx.scene.leave();
      }

      const realmAuthority = new PublicKey(user.public_key);
      const communityMintPk = new PublicKey(communityMintStr);

      await ctx.reply(
        '⏳ Creating DAO realm on-chain as group admin (Privy)...',
        { parse_mode: 'Markdown' }
      );

      try {
        const { realmAddress, signature } = await createdao(
          realmName,
          realmAuthority,
          BigInt(user.id),
          user.Privy_id,
          communityMintPk,
          councilMintPk
        );
        // Assume mainnet by default for link; user can adjust cluster as needed
        const solscanUrl = `https://solscan.io/tx/${signature}`;

        await ctx.reply(
          `✅ *DAO Created Successfully!*\n\n` +
            `*Realm name:*\n\`${realmName}\`\n\n` +
            `*Realm authority (admin):*\n\`${realmAuthority.toBase58()}\`\n\n` +
            `*Realm address:*\n\`${realmAddress.toBase58()}\`\n\n` +
            `*Transaction:*\n[${signature}](${solscanUrl})`,
          {
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: true },
          }
        );
      } catch (error: any) {
        console.error('Failed to create DAO realm:', error);
        await ctx.reply(
          `❌ Failed to create DAO realm:\n\`${error?.message || String(error)}\``,
          { parse_mode: 'Markdown' }
        );
      }

      return ctx.scene.leave();
    }
  );

export const handleCreateDaoCommand = async (ctx: any) => {
  // Enter the DAO creation wizard (admin check is also done in the first step)
  await ctx.scene.enter('dao_wizard');
};