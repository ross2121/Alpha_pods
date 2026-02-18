import {
  withCreateRealm,
  MintMaxVoteWeightSource,
} from '@realms-today/spl-governance';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { PrismaClient, Role } from '@prisma/client';
import dotenv from 'dotenv';
import { privyauthorization } from '../services/auth';
import { createdao } from '../services/createdao';

dotenv.config();

const prisma = new PrismaClient();


export const handleCreateDaoCommand = async (ctx: any) => {
  try {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) {
      await ctx.reply('❌ Unable to identify admin user.');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { telegram_id: telegramId },
    });

    if (!user || user.role !== Role.admin) {
      await ctx.reply('❌ Only an admin user can create a DAO realm.');
      return;
    }
    const realmAuthority = new PublicKey(user.public_key); 
    const realmName = 'My DAO3s2ss3';

    await ctx.reply('⏳ Creating DAO realm on devnet as group admin (Privy)...');

    const { realmAddress, signature } = await createdao(
      realmName,
      realmAuthority,
      BigInt(user.id),
      user.Privy_id
    );
    const solscanUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;

    await ctx.reply(
      `✅ *DAO Created Successfully!*\n\n` +
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
};