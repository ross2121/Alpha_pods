import { Scenes, Markup, Context } from "telegraf";
import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID, 
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
  transfer,
  getAccount,
  getMint
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AlphaPods } from "../idl/alpha_pods";
import * as idl from "../idl/alpha_pods.json";
import DLMM, { binIdToBinArrayIndex, deriveBinArray, deriveEventAuthority } from "@meteora-ag/dlmm";
import { PrismaClient } from "@prisma/client";
import { deposit } from "../contract/contract";
import { decryptPrivateKey } from "../services/auth";
import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import { error } from "console";
import { deposit_lp, executedSwapProposal, handlswap, sendmoney } from "./swap";
import { checkadminfund, deductamount } from "./fund";

const prisma = new PrismaClient();
const METORA_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");

interface LiquiditySessionData extends Scenes.WizardSessionData {
  mint?: string;
  amount?: string;
  escrowPda?: string;
  chatId?: number;
  __scenes?: any;
}

type LiquidityContext = Scenes.WizardContext<LiquiditySessionData>;


function getProgram(connection: Connection, adminKeypair: Keypair): Program<AlphaPods> {
  const wallet = new anchor.Wallet(adminKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program<AlphaPods>(idl as AlphaPods, provider);
}

const askMintStep = async (ctx: LiquidityContext) => {
  await ctx.reply(
    "🏊 **Propose Liquidity Addition**\n\n" +
    "This will create a proposal for members to vote on.\n\n" +
    "Please provide the token mint address you want to add liquidity for:\n\n" +
    "Example: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`",
    { parse_mode: "Markdown" }
  );
  return ctx.wizard.next();
};


const findPoolsStep = async (ctx: LiquidityContext) => {
  if (!ctx.message || !("text" in ctx.message)) {
    await ctx.reply("❌ Please provide a valid mint address.");
    return;
  }

  const mintAddress = ctx.message.text.trim();
  
  try {
    const tokenMint = new PublicKey(mintAddress);
    (ctx.wizard.state as any).mint = mintAddress;
    (ctx.wizard.state as any).chatId = ctx.chat?.id;

    await ctx.reply("🔍 Searching for DLMM pools...");

    const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com", { commitment: "confirmed" });
    const allPairs = await DLMM.getLbPairs(connection);

    // Find pools with this token paired with SOL
    const matchingPairs = allPairs.filter(pair => 
      (pair.account.tokenXMint.toBase58() === tokenMint.toBase58() && pair.account.tokenYMint.toBase58() === NATIVE_MINT.toBase58()) ||
      (pair.account.tokenYMint.toBase58() === tokenMint.toBase58() && pair.account.tokenXMint.toBase58() === NATIVE_MINT.toBase58())
    );

    if (matchingPairs.length === 0) {
      await ctx.reply("❌ No DLMM pools found for this token paired with SOL.");
      return ctx.scene.leave();
    }

 
    let poolMessage = `✅ Found ${matchingPairs.length} pool(s):\n\n`;
    matchingPairs.forEach((pair, index) => {
      const reserveX = parseFloat(pair.account.reserveX.toString()) / 1e9;
      const reserveY = parseFloat(pair.account.reserveY.toString()) / 1e9;
      poolMessage += `**Pool ${index + 1}:**\n`;
      poolMessage += `• Address: \`${pair.publicKey.toBase58()}\`\n`;
      poolMessage += `• Bin Step: ${pair.account.binStep} bps\n`;
      poolMessage += `• Reserve X: ${reserveX.toFixed(4)}\n`;
      poolMessage += `• Reserve Y: ${reserveY.toFixed(4)}\n\n`;
    });

    poolMessage += "💰 How much SOL should each member contribute?\n";
    poolMessage += "Example: `0.1` (for 0.1 SOL per member)";

    await ctx.reply(poolMessage, { parse_mode: "Markdown" });
    return ctx.wizard.next();
  } catch (error) {
    console.error("Error finding pools:", error);
    await ctx.reply("❌ Invalid mint address or error finding pools.");
    return ctx.scene.leave();
  }
};

const createProposalStep = async (ctx: LiquidityContext) => {
  if (!ctx.message || !("text" in ctx.message)) {
    await ctx.reply("❌ Please provide a valid amount.");
    return;
  }
  const amountStr = ctx.message.text.trim();
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("❌ Please provide a valid positive number.");
    return;
  }
  (ctx.wizard.state as any).amount = amountStr;
  try {
    await ctx.reply("📝 Creating liquidity proposal...");

    const state = ctx.wizard.state as any;
    const chatId = state.chatId;
    const mint = state.mint;
    const creatorTelegramId = ctx.from?.id?.toString() || "";

    const proposalMessage = await ctx.reply(
      `🗳️ **Liquidity Proposal**\n\n` +
      `**Token Mint:** \`${mint}\`\n` +
      `**Amount per member:** ${amount} SOL\n\n` +
      `Should we add liquidity to this pool?\n\n` +
      `Vote to participate! If you vote YES, ${amount} SOL will be collected from your wallet.`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("👍 Yes (0)", `vote_liquidity:yes:${mint}`),
            Markup.button.callback("👎 No (0)", `vote_liquidity:no:${mint}`)
          ]
        ])
      }
    );

    const proposal = await prisma.proposal.create({
      data: {
        mint: mint,
        amount: amount,
        yes: 0,
        no: 0,
        messagId: BigInt(proposalMessage.message_id),
        chatId: BigInt(chatId),
        createdAt: BigInt(Date.now()),
        Votestatus: "Running",
        ProposalStatus: "Running",
        Members: [creatorTelegramId],
        mintb: "LIQUIDITY_PROPOSAL"
      }
    });

    const successMessage = `
✅ **Liquidity Proposal Created!**

**Proposal ID:** \`${proposal.id}\`
**Token:** \`${mint.slice(0, 8)}...${mint.slice(-8)}\`
**Amount per member:** ${amount} SOL

Members can now vote! Those who vote YES will contribute ${amount} SOL to the liquidity pool.

**Voting closes in 5 minutes.**
    `;

    await ctx.reply(successMessage, { parse_mode: "Markdown" });

    setTimeout(async () => {
      const expiredproposal = await prisma.proposal.findUnique({
        where: { id: proposal.id }
      });

      if (!expiredproposal || expiredproposal.Votestatus !== "Running") {
        return;
      }

      const expiredText =
        `Liquidity Proposal EXPIRED ⛔\n\n` +
        `**Token Mint:** \`${expiredproposal.mint}\`\n` +
        `**Amount per member:** \`${expiredproposal.amount} SOL\`\n\n` +
        `**Final Result:** Yes (${expiredproposal.yes}) - No (${expiredproposal.no})`;

      await prisma.proposal.update({
        where: { id: proposal.id },
        data: { 
          Votestatus: "Expired",
        }
      });
      try {
        await ctx.telegram.editMessageText(
          Number(expiredproposal.chatId),
          Number(expiredproposal.messagId),
          undefined,
          expiredText,
          { parse_mode: "Markdown" }
        );
      } catch (editError) {
        console.log("Failed to edit message:", editError);
        try {
          await ctx.telegram.sendMessage(
            Number(expiredproposal.chatId),
            expiredText,
            { parse_mode: "Markdown" }
          );
        } catch (sendError) {
          console.error("Failed to send expiration message:", sendError);
        }
      }

      console.log("Voting period over.");
      if (expiredproposal.yes > 0) {
        try {
          await checkLiquidityFunds(expiredproposal.id, ctx);
          await ctx.telegram.sendMessage(
            Number(expiredproposal.chatId),
            `✅ Voting complete! \n\n${expiredproposal.Members.length} members voted YES.\n\nPlease use \`/execute_liquidity ${expiredproposal.id}\` to collect funds and add liquidity.`,
            { parse_mode: "Markdown" }
          );
        } catch (error) {
          console.error("Error checking funds:", error);
        }
      }
    }, 0.1 * 60 * 1000); 

    return ctx.scene.leave();

  } catch (error: any) {
    console.error("Error creating proposal:", error);
    await ctx.reply("❌ Failed to create liquidity proposal.");
    return ctx.scene.leave();
  }
};
const checkLiquidityFunds = async (proposal_id: string, ctx: any) => {
  const url = process.env.RPC_URL;
  const connection = new Connection(url || "https://api.devnet.solana.com", { commitment: "confirmed" });

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposal_id }
  });

  const members = proposal?.Members;
  if (!members || members.length === 0) {
    console.log("No members found for liquidity proposal");
    return;
  }

  console.log(`Checking funding for ${members.length} members who voted "Yes"`);

  for (const memberTelegramId of members) {
    const member = await prisma.user.findUnique({
      where: { telegram_id: memberTelegramId }
    });

    if (!member) {
      console.log(`User with telegram_id ${memberTelegramId} not found`);
      continue;
    }

    const public_key = new PublicKey(member.public_key);
    const balance = await connection.getBalance(public_key);
    const balancesol = balance / anchor.web3.LAMPORTS_PER_SOL;

    if (balancesol < proposal!.amount) {
      const shortfall = proposal!.amount - balancesol;

      const fundingMessage = `
🚨 **Funding Required for Approved Liquidity Proposal** 🚨

The liquidity proposal you voted "Yes" for has been approved! However, your wallet needs more SOL to participate.

**Proposal Details:**
• Token Mint: \`${proposal!.mint}\`
• Required Amount: ${proposal!.amount} SOL
• Your Current Balance: ${balancesol.toFixed(4)} SOL
• Shortfall: ${shortfall.toFixed(4)} SOL

**Your Wallet Address:**
\`${member.public_key}\`

Please fund your wallet with at least ${shortfall.toFixed(4)} SOL to participate in this approved liquidity proposal.

You can get SOL from exchanges like:
• Binance
• Coinbase
• Jupiter (for swapping other tokens)
• Or any other Solana-compatible exchange

**Note:** This proposal has already been approved by the community vote!
      `;

      try {
        await ctx.telegram.sendMessage(
          parseInt(member.telegram_id),
          fundingMessage,
          { parse_mode: 'Markdown' }
        );
        console.log(`Funding message sent to user ${member.telegram_id}`);
      } catch (error) {
        console.error(`Failed to send funding message to user ${member.telegram_id}:`, error);
      }
    }
  }
};


const removeLiquidityMembersWithoutFunds = async (proposal_id: string) => {
  const url = process.env.RPC_URL;
  const connection = new Connection(url || "https://api.devnet.solana.com", { commitment: "confirmed" });

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposal_id }
  });

  if (!proposal) {
    return;
  }

  for (const memberTelegramId of proposal.Members) {
    const user = await prisma.user.findUnique({
      where: { telegram_id: memberTelegramId }
    });

    if (!user) continue;

    const publickey = new PublicKey(user.public_key);
    const balance = await connection.getBalance(publickey);
    const amount = balance / anchor.web3.LAMPORTS_PER_SOL;

    if (proposal.amount > amount) {
      proposal.Members = proposal.Members.filter(memberId => memberId !== memberTelegramId);
      await prisma.proposal.update({
        where: { id: proposal.id },
        data: { Members: proposal.Members }
      });
      console.log(`Removed member ${memberTelegramId} due to insufficient funds`);
    }
  }
};

export const handleLiquidityVote = async (ctx: any) => {
  const action = ctx.match[1];
  const mint = ctx.match[2];
  const userId = ctx.from.id;

  try {
    const proposal = await prisma.proposal.findUnique({
      where: {
        chatId_messagId: {
          chatId: BigInt(ctx.callbackQuery.message?.chat.id!),
          messagId: BigInt(ctx.callbackQuery.message?.message_id!)
        }
      }
    });

    if (!proposal || proposal.mintb !== "LIQUIDITY_PROPOSAL") {
      return ctx.answerCbQuery('This is not a valid liquidity proposal.');
    }
    const member = proposal.Members || [];
    const newvote = (action === 'yes');
    if (member.includes(userId.toString())) {
      return ctx.answerCbQuery('You have already voted!');
    }

    if (newvote) {
      member.push(userId.toString());
      proposal.yes++;
    } else {
      proposal.no++;
    }

    await prisma.proposal.update({
      where: {
        chatId_messagId: {
          chatId: BigInt(ctx.callbackQuery.message?.chat.id!),
          messagId: BigInt(ctx.callbackQuery.message?.message_id!)
        }
      },
      data: {
        yes: proposal.yes,
        no: proposal.no,
        Members: member
      }
    });

    const newKeyboard = Markup.inlineKeyboard([
      Markup.button.callback(`👍 Yes (${proposal.yes})`, `vote_liquidity:yes:${mint}`),
      Markup.button.callback(`👎 No (${proposal.no})`, `vote_liquidity:no:${mint}`)
    ]);

    try {
      await ctx.editMessageText(
        `🗳️ **Liquidity Proposal**\n\n` +
        `**Token Mint:** \`${proposal.mint}\`\n` +
        `**Amount per member:** ${proposal.amount} SOL\n\n` +
        `Should we add liquidity to this pool?\n\n` +
        `Vote to participate! If you vote YES, ${proposal.amount} SOL will be collected from your wallet.\n\n` +
        `**Votes:** ${proposal.yes} Yes, ${proposal.no} No`,
        {
          ...newKeyboard,
          parse_mode: 'Markdown'
        }
      );
      await ctx.answerCbQuery('Vote counted!');
    } catch (e) {
      console.error("Failed to edit message:", e);
      await ctx.answerCbQuery('Vote counted (message not updated).');
    }
  } catch (error) {
    console.error("Error voting on liquidity:", error);
    await ctx.answerCbQuery('Failed to record vote.');
  }
};


export const createLiquidityWizard = new Scenes.WizardScene<LiquidityContext>(
  "add_liquidity_wizard",
  askMintStep,
  findPoolsStep,
  createProposalStep
);
async function fetchPositionDetails(positionAddress: string) {
  try {
    const response = await fetch(`https://devnet-dlmm-api.meteora.ag/position_v2/${positionAddress}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching position details:", error);
    return null;
  }
}


export const handleViewPositions = async (ctx: Context) => {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.reply("❌ Unable to identify chat.");
      return;
    }

    const positions = await prisma.liquidityPosition.findMany({
      where: {
        chatId: BigInt(chatId),
        isActive: true
      },
      include: {
        escrow: true
      }
    });

    if (positions.length === 0) {
      await ctx.reply("📊 No active liquidity positions found.");
      return;
    }

    await ctx.reply("🔄 Fetching position details from Meteora...");

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const details = await fetchPositionDetails(pos.positionAddress);

      if (!details) {
        const basicMessage = `
📊 **Position ${i + 1}/${positions.length}**

**Basic Info:**
• Address: \`${pos.positionAddress}\`
• Pool: \`${pos.poolAddress.slice(0, 8)}...${pos.poolAddress.slice(-8)}\`
• Token: \`${pos.tokenMint.slice(0, 8)}...${pos.tokenMint.slice(-8)}\`
• Initial Deposit: ${parseFloat(pos.amount) / 1e9} SOL
• Bin Range: ${pos.lowerBinId} - ${pos.upperBinId}
• Created: ${pos.createdAt.toLocaleDateString()}

⚠️ Unable to fetch live data from Meteora API
        `;
        
        await ctx.reply(basicMessage, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🔗 View on Meteora", url: `https://app.meteora.ag/dlmm/${pos.poolAddress}` },
                { text: "📈 DexScreener", url: `https://dexscreener.com/solana/${pos.poolAddress}` }
              ],
              [
                { text: "💰 Claim Fees", callback_data: `claim_fees:${pos.positionAddress}` },
                { text: "🔄 Refresh", callback_data: `refresh_position:${pos.id}` }
              ],
              [
                { text: "🔒 Close & Swap to SOL", callback_data: `close_position:${pos.id}` }
              ]
            ]
          }
        });
        continue;
      }
      const unclaimedFeesUsd = details.total_fee_usd_claimed || 0;
      const unclaimedFeeX = details.total_fee_x_claimed || 0;
      const unclaimedFeeY = details.total_fee_y_claimed || 0;
      const rewardUsd = details.total_reward_usd_claimed || 0;

      // Build detailed message
      const detailedMessage = `
📊 **Position ${i + 1}/${positions.length}** - ${pos.tokenMint.slice(0, 4)}...${pos.tokenMint.slice(-4)}/SOL

**💼 Position Info:**
• Address: \`${pos.positionAddress}\`
• Pool: [\`${pos.poolAddress.slice(0, 8)}...\`](https://app.meteora.ag/dlmm/${pos.poolAddress})
• Owner: \`${details.owner?.slice(0, 8)}...\`
• Created: ${new Date(details.created_at).toLocaleDateString()}

**💰 Total Deposit:**
• Initial: ${(parseFloat(pos.amount) / 1e9).toFixed(4)} SOL
• Current Value: *Calculating...*

**🎁 Unclaimed Fees:**
• Total USD: $${unclaimedFeesUsd.toFixed(4)}
• Token X: ${unclaimedFeeX.toLocaleString()}
• Token Y (SOL): ${unclaimedFeeY.toLocaleString()}

**🌾 Farm Rewards:**
• Total USD: $${rewardUsd.toFixed(4)}

**📊 Liquidity Range:**
• Lower Bin: ${pos.lowerBinId}
• Upper Bin: ${pos.upperBinId}
• Status: ${pos.lowerBinId <= pos.upperBinId ? "✅ In Range" : "⚠️ Out of Range"}

**🔗 Quick Links:**
[Meteora](https://app.meteora.ag/dlmm/${pos.poolAddress}) • [DexScreener](https://dexscreener.com/solana/${pos.poolAddress})
      `;

      await ctx.reply(detailedMessage, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "💰 Claim Fees", callback_data: `claim_fees:${pos.positionAddress}` },
              { text: "🔄 Refresh", callback_data: `refresh_position:${pos.id}` }
            ],
            [
              { text: "🔒 Close & Swap to SOL", callback_data: `close_position:${pos.id}` }
            ]
          ]
        },
        // disable_web_page_preview: true
      });
    }

  } catch (error) {
    console.error("Error viewing positions:", error);
    await ctx.reply("Failed to fetch positions.");
  }
};


export const handleClosePosition = async (ctx: Context) => {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.reply("❌ Unable to identify chat.");
      return;
    }

    const positions = await prisma.liquidityPosition.findMany({
      where: {
        chatId: BigInt(chatId),
        isActive: true
      }
    });

    if (positions.length === 0) {
      await ctx.reply("📊 No active liquidity positions to close.");
      return;
    }

    const buttons = positions.map((pos: any, index: number) => [
      Markup.button.callback(
        `Position ${index + 1}: ${pos.tokenMint.slice(0, 8)}... (${pos.amount} SOL)`,
        `close_position:${pos.id}`
      )
    ]);

    await ctx.reply(
      "🔒 **Close Liquidity Position**\n\nSelect a position to close:",
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error("Error in close position:", error);
    await ctx.reply("Failed to fetch positions.");
  }
};

export const executeClosePosition = async (ctx: Context, positionId: string) => {
  try {
    await ctx.answerCbQuery("⏳ Closing position...");
    await ctx.reply("⏳ Closing liquidity position... This may take a moment.");
    console.log("Closing position with ID:",positionId);
    const position = await prisma.liquidityPosition.findUnique({
      where: { id: positionId },
      include: { escrow: true }
    });

    if (!position || !position.isActive) {
      await ctx.reply(" Position not found or already closed.");
      return;
    }
    const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com", { commitment: "confirmed" });
    const secretKeyArray = [123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224];
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    
    const program = getProgram(connection, adminKeypair);

    const escrowPda = new PublicKey(position.escrow.escrow_pda);
    console.log("escrow",escrowPda);
    const [escrow_vault_pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowPda.toBuffer()],
      program.programId
    );
    console.log("pda",escrow_vault_pda);

    const positionPubkey = new PublicKey(position.positionAddress);
    const poolPubkey = new PublicKey(position.poolAddress);
    const allPairs = await DLMM.getLbPairs(connection);
    const matchingPair = allPairs.find(pair => pair.publicKey.toBase58() === poolPubkey.toBase58());

    if (!matchingPair) {
      await ctx.reply(" Pool not found.");
      return;
    }

    // Use the actual pool's token mints (not hardcoded)
    const tokenXMint = matchingPair.account.tokenXMint;
    const tokenYMint = matchingPair.account.tokenYMint;

    const activeBinId = matchingPair.account.activeId;
    const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);

 
    const lowerBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(position.lowerBinId));
    const upperBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(position.upperBinId));
    const [binArrayLower] = deriveBinArray(poolPubkey, lowerBinArrayIndex, METORA_PROGRAM_ID);
    const [binArrayUpper] = deriveBinArray(poolPubkey, upperBinArrayIndex, METORA_PROGRAM_ID);
    const vaulta = await getAssociatedTokenAddress(tokenXMint, escrowPda, true);
    const vaultb = await getAssociatedTokenAddress(tokenYMint, escrowPda, true);
    const balance_before_vaulta = await connection.getTokenAccountBalance(vaulta);
    const balance_before_vaultb = await connection.getTokenAccountBalance(vaultb);
    console.log("balance before", balance_before_vaulta, balance_before_vaultb);
    await ctx.reply("💧 Removing liquidity...");
    const binLiquidityReduction = [{ binId: activeBinId, bpsToRemove: 10000 }];
    const removeLiquidityTx = await program.methods
      .removeLiqudity(binLiquidityReduction)
      .accountsStrict({
        lbPair: poolPubkey,
        binArrayBitmapExtension: null,
        position: positionPubkey,
        reserveX: matchingPair.account.reserveX,
        reserveY: matchingPair.account.reserveY,
        escrow: escrowPda,
        vault: escrow_vault_pda,
        vaulta: vaulta,
        vaultb: vaultb,
        tokenXMint: tokenXMint,
        tokenYMint: tokenYMint,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        tokenXProgram: TOKEN_PROGRAM_ID,
        tokenYProgram: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    await connection.confirmTransaction(removeLiquidityTx, "confirmed");
    await ctx.reply("🔒 Closing position...");
    const after_closing_vaulta = await connection.getTokenAccountBalance(vaulta);
    const after_closing_vaultb = await connection.getTokenAccountBalance(vaultb);
     
      console.log("after closing", after_closing_vaulta, after_closing_vaultb);
    
    const amountA = new anchor.BN(after_closing_vaulta.value.amount).sub(new anchor.BN(balance_before_vaulta.value.amount));
    const amountb=new anchor.BN(after_closing_vaultb.value.amount).sub(new anchor.BN(balance_before_vaultb.value.amount));
    const mintA = tokenXMint.toBase58();
    const mintB = tokenYMint.toBase58();
    
    console.log("Amount A (raw):", amountA.toString(), "Mint A:", mintA);
    console.log("Amount B (raw):", amountb.toString(), "Mint B:", mintB);
  
    const proposal = await prisma.proposal.findFirst({
      where: {
        chatId: position.chatId,
        mint: position.tokenMint,
        mintb: "LIQUIDITY_PROPOSAL"
      }
    });
    
    if (!proposal) {
      console.log("No proposal found for position, cannot distribute funds");
      await ctx.reply("❌ Could not find the original proposal. Funds are in the escrow vault but cannot be distributed automatically.");
    } else {
      // Calculate per-member amounts
      const numMembers = proposal.Members.length;
      if (numMembers === 0) {
        await ctx.reply("❌ No members found in proposal. Cannot distribute funds.");
      } else {
        let solAmountLamports: number;
        let tokenAmountSmallestUnit: number;
        
        // Get token decimals for conversion
        const tokenMint = mintA === NATIVE_MINT.toBase58() ? tokenYMint : tokenXMint;
        const tokenMintInfo = await getMint(connection, tokenMint);
        const tokenDecimals = tokenMintInfo.decimals;
        const tokenDecimalsMultiplier = Math.pow(10, tokenDecimals);
        
        if(mintA === NATIVE_MINT.toBase58()){
          // SOL is token A, token is token B
          solAmountLamports = Number(amountA);
          tokenAmountSmallestUnit = Number(amountb);
        } else {
          // Token is token A, SOL is token B
          tokenAmountSmallestUnit = Number(amountA);
          solAmountLamports = Number(amountb);
        }
        
        // Convert to human-readable units (SOL and token amount)
        const totalSolAmount = solAmountLamports / LAMPORTS_PER_SOL;
        const totalTokenAmount = tokenAmountSmallestUnit / tokenDecimalsMultiplier;
        
        // Divide by number of members to get per-member amounts
        const solAmountPerMember = totalSolAmount / numMembers;
        const tokenAmountPerMember = totalTokenAmount / numMembers;
        
        console.log("Total SOL (lamports):", solAmountLamports);
        console.log("Total SOL (SOL):", totalSolAmount);
        console.log("Total Token (smallest units):", tokenAmountSmallestUnit);
        console.log("Total Token (tokens):", totalTokenAmount);
        console.log("Token decimals:", tokenDecimals);
        console.log("SOL per member:", solAmountPerMember);
        console.log("Token per member:", tokenAmountPerMember);
        
        // sendmoney expects human-readable amounts: SOL first, token second
        // amount_x = SOL per member, amount_y = token per member
        await sendmoney(solAmountPerMember, tokenAmountPerMember, proposal.id);
      }
    }
    const beforesol=await connection.getBalance(new PublicKey(escrow_vault_pda));
    const beforeamount=beforesol/LAMPORTS_PER_SOL;
    const closeTx = await program.methods
      .closePosition()
      .accountsStrict({
        lbPair: poolPubkey,
        position: positionPubkey,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        escrow: escrowPda,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        vault: escrow_vault_pda
      })
      .rpc();
 
    await connection.confirmTransaction(closeTx, "confirmed");
    if(!proposal){
      return;
    }
    const aftersol=await connection.getBalance(new PublicKey(escrow_vault_pda));
    const afteramount=aftersol/LAMPORTS_PER_SOL;
    const amount=afteramount-beforeamount;
    await deductamount(proposal?.id,amount,true);
    await prisma.liquidityPosition.update({
      where: { id: positionId.toString() },
      data: { isActive: false }
    });

    const successMessage = `
 **Position Closed Successfully!**

**Details:**
• Position: \`${position.positionAddress}\`
• Liquidity removed and position closed

**Transactions:**
• Remove Liquidity: \`${removeLiquidityTx}\`
• Close Position: \`${closeTx}\`

Funds have been returned to the escrow vault! 
    `;

    await ctx.reply(successMessage, { parse_mode: "Markdown" });

  } catch (error: any) {
    console.error("Error closing position:", error);
    let errorMsg = "❌ Failed to close position.";
    
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
    
    await ctx.reply(errorMsg);
  }
};
export const executeLP=async(proposal_id:string)=>{
    const prisma=new PrismaClient();
    const lp=await prisma.proposal.findUnique({
      where:{
        id:proposal_id
      }
    });
    if(!lp){
      throw new Error("LP not found in db")
    }
    const tokenYMint = new PublicKey(lp.mint);
    const tokenXMint = NATIVE_MINT;
    const connection=new Connection(process.env.RPC_URL || "https://api.devnet.solana.com", { commitment: "confirmed" });
    const secretKeyArray=[123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224];
    const secretKey = new Uint8Array(secretKeyArray);
    const    superadmin = Keypair.fromSecretKey(secretKey);
    const wallet=new anchor.Wallet(superadmin);
    const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    })
    const program = new Program<AlphaPods>(idl as AlphaPods, provider)
    const escrowRow = await prisma.escrow.findFirst({ where: { chatId: lp.chatId } });
    console.log("escrowo",escrowRow?.escrow_pda);
    if (!escrowRow) {
      throw new Error("Escrow not found for LP chatId");
    }
    const escrowPda = new PublicKey(escrowRow.escrow_pda);
    const [escrow_vault_pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowPda.toBuffer()],
      program.programId
    );
    console.log("escrow vault",escrow_vault_pda);
    const allPairs = await DLMM.getLbPairs(connection);
    const matchingPair = allPairs.find(pair => 
      (pair.account.tokenXMint.toBase58() === tokenXMint.toBase58() &&
      pair.account.tokenYMint.toBase58() === tokenYMint.toBase58()) ||
      (pair.account.tokenXMint.toBase58() === tokenYMint.toBase58() &&
      pair.account.tokenYMint.toBase58() === tokenXMint.toBase58())
    );
    console.log(matchingPair);
    if (!matchingPair) {
      console.log("cechh");
      throw new Error("No matching pair found")
    }
    const poolTokenXMintInfo = await connection.getAccountInfo(matchingPair.account.tokenXMint);
    const poolTokenYMintInfo = await connection.getAccountInfo(matchingPair.account.tokenYMint);
    const poolTokenXProgramId = poolTokenXMintInfo?.owner || TOKEN_PROGRAM_ID;
    const poolTokenYProgramId = poolTokenYMintInfo?.owner || TOKEN_PROGRAM_ID;
    // if (poolTokenXProgramId.toString() !== TOKEN_PROGRAM_ID.toString() ||
    //     poolTokenYProgramId.toString() !== TOKEN_PROGRAM_ID.toString()) {
    //   console.log("Skipping: Pool uses Token-2022 (not supported)");
    //   return;
    // }
    // const deposit = await program.methods
    //   .deposit(new anchor.BN(200_000_000)) 
    //   .accountsStrict({
    //     escrow: escrowPda,
    //     vault: escrow_vault_pda,
    //     member: adminkeypair.publicKey,
    //     systemProgram: SystemProgram.programId
    //   })
    //   .signers([adminkeypair])
    //   .rpc();
    //   console.log("escrow_pda",escrowPda);
    // console.log("deposit", deposit);
    const activeBinId = matchingPair.account.activeId;
    const lowerBinId = activeBinId - 24;
    const width = 48;
    const positionKeypair = Keypair.generate();
    console.log("Position:", positionKeypair.publicKey.toBase58());
    const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);
    const amount=await connection.getBalance(escrow_vault_pda);
      const beforsol=amount/LAMPORTS_PER_SOL;
      console.log("beeff",beforsol);
    const createPositionTx = await program.methods
      .addPostion(lowerBinId, width)
      .accountsStrict({
        lbPair: matchingPair.publicKey,
        position: positionKeypair.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        escrow: escrowPda,
        vault: escrow_vault_pda,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        systemProgram: SystemProgram.programId,
      })
      .signers([positionKeypair])
      .rpc();
      const amountafter=await connection.getBalance(escrow_vault_pda);
      const balanceafter=amountafter/LAMPORTS_PER_SOL;
      console.log("dads",balanceafter);
      const balance=beforsol-balanceafter;
      await deductamount(proposal_id,balance,false);
      console.log("balanc",balance);
    console.log(" Position created! Signature:", createPositionTx);
    await provider.connection.confirmTransaction(createPositionTx, "confirmed");
    const upperBinId = lowerBinId + width - 1;
    const lowerBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(lowerBinId));
    const upperBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(upperBinId));
    
    let [binArrayLower] = deriveBinArray(
      matchingPair.publicKey,
      lowerBinArrayIndex,
      METORA_PROGRAM_ID
    );
    
    let [binArrayUpper] = deriveBinArray(
      matchingPair.publicKey,
      upperBinArrayIndex,
      METORA_PROGRAM_ID
    );
    console.log("\n📦 Bin Arrays:");
    console.log("Lower Bin Array:", binArrayLower.toString());
    console.log("Upper Bin Array:", binArrayUpper.toString());
    const lowerBinArrayInfo = await provider.connection.getAccountInfo(binArrayLower);
    if (!lowerBinArrayInfo) {
      console.log(" Lower bin array doesn't exist, creating...");
      try {
        const createLowerBinArrayTx = await program.methods
          .addBin(new anchor.BN(lowerBinArrayIndex.toNumber()))
          .accountsStrict({
            lbPair: matchingPair.publicKey,
            binArray: binArrayLower,
            escrow: escrowPda,
            systemProgram: SystemProgram.programId,
            dlmmProgram: METORA_PROGRAM_ID,
            vault: escrow_vault_pda
          })
          .rpc();
        await provider.connection.confirmTransaction(createLowerBinArrayTx, "confirmed");
        console.log(" Lower bin array created");
      } catch (err: any) {
        console.log("Note: Bin array creation error (may already exist):", err.message);
      }
    }
      const upperBinArrayInfo = await provider.connection.getAccountInfo(binArrayUpper);
    if (!upperBinArrayInfo && binArrayUpper.toString() !== binArrayLower.toString()) {
      console.log("⚠️  Upper bin array doesn't exist, creating...");
      try {
        const createUpperBinArrayTx = await program.methods
          .addBin(new anchor.BN(upperBinArrayIndex.toNumber()))
          .accountsStrict({
            lbPair: matchingPair.publicKey,
            binArray: binArrayUpper,
            escrow: escrowPda,
            systemProgram: SystemProgram.programId,
            dlmmProgram: METORA_PROGRAM_ID,
            vault: escrow_vault_pda
          })
          .rpc();
        await provider.connection.confirmTransaction(createUpperBinArrayTx, "confirmed");
        console.log(" Upper bin array created");
      } catch (err: any) {
        console.log("Note: Bin array creation error (may already exist):", err.message);
      }
    }
    if(binArrayLower.equals(binArrayUpper)){
      const placeholderIndex = upperBinArrayIndex.add(new anchor.BN(1));
      [binArrayUpper] = deriveBinArray(
        matchingPair.publicKey,
        placeholderIndex,
        METORA_PROGRAM_ID
      );
      if(!binArrayUpper){
         const binarray=await program.methods.addBin(new anchor.BN(upperBinArrayIndex.toNumber())).accountsStrict({
          lbPair:matchingPair.publicKey,
          binArray:binArrayUpper,
          escrow:escrowPda,
          systemProgram:SystemProgram.programId,
          dlmmProgram:METORA_PROGRAM_ID,
          vault:escrow_vault_pda
         }).rpc();
      } 
    }
    const isWSOLTokenX = matchingPair.account.tokenXMint.equals(NATIVE_MINT);
    const isWSOLTokenY = matchingPair.account.tokenYMint.equals(NATIVE_MINT);
    const totalAmountLamports = Math.floor(lp.amount * LAMPORTS_PER_SOL * lp.Members.length);
    const totalAmount = new anchor.BN(totalAmountLamports);
    console.log("Proposal amount (SOL):", lp.amount);
    console.log("Number of members:", lp.Members.length);
    console.log("Total amount (lamports):", totalAmount.toString());
    const swapAmount = totalAmount.div(new anchor.BN(2)).toNumber();
    // const swap=await  executedSwapProposal(proposal_id);
    const swap=await handlswap(tokenYMint,Number(swapAmount),escrowPda.toString());
    if(!swap?.amount_out){
      console.log("dasdasd")
      return;
    }
    // console.log("swap",swap);
    // console.log("swa",swap.transaction);
    let amountX: anchor.BN;
    let amountY: anchor.BN;
    let distributionX: number;
    let distributionY: number;
    const tokenAmountInSmallestUnit = Math.floor( swap.amount_out* 1e6);
    const solamount=swapAmount/LAMPORTS_PER_SOL;
    console.log("swap amount",solamount);
    console.log("token amiunt",totalAmount);
    if (isWSOLTokenX) {
      amountX =new anchor.BN(swapAmount); 
      amountY = new anchor.BN(tokenAmountInSmallestUnit); 
      distributionX = 5000;
      distributionY = 5000;
    } else if (isWSOLTokenY) {
      amountX = new anchor.BN(tokenAmountInSmallestUnit); 
      amountY =new anchor.BN(swapAmount);
      distributionX = 5000;
      distributionY = 5000;
    } else {
      throw new Error("Neither token in pool is WSOL");
    }
    
    console.log("\n💧 Liquidity Parameters:");
    console.log("Amount X:", amountX.toString(), "lamports");
    console.log("Amount Y:", amountY.toString(), "lamports");
    console.log("WSOL is tokenX:", isWSOLTokenX, "tokenY:", isWSOLTokenY);
    
    const liquidityParameter = {
      amountX: amountX,
      amountY: amountY,
      binLiquidityDist: [
        {
          binId: activeBinId,
          distributionX: distributionX,
          distributionY: distributionY,
        }
      ],
    };
    
    
    console.log("Bin ID:", activeBinId);
    console.log("Distribution X:", distributionX / 100, "%");
    console.log("Distribution Y:", distributionY / 100, "%");
    
    try {
      console.log("\n🚀 Adding liquidity...");
    
      const sameBinArray = binArrayLower.equals(binArrayUpper);
      console.log("Same bin array?", sameBinArray);
    
      const poolTokenXMint = matchingPair.account.tokenXMint;
      const poolTokenYMint = matchingPair.account.tokenYMint;
      
      const vaulta = await getAssociatedTokenAddress(
        poolTokenXMint, 
        escrowPda, 
        true,
        poolTokenXProgramId
      );
      const vaultb = await getAssociatedTokenAddress(
        poolTokenYMint, 
        escrowPda, 
        true,
        poolTokenYProgramId
      );
      console.log("Vault A:", vaulta.toString(), "(tokenX:", poolTokenXMint.toBase58().slice(0, 8) + "...)");
      console.log("Vault B:", vaultb.toString(), "(tokenY:", poolTokenYMint.toBase58().slice(0, 8) + "...)");
      // console.log("dasdd",(liquidityParameter.amountX)/LAMPORTS_PER_SOL);
      console.log("check3",Number(liquidityParameter.amountY)/LAMPORTS_PER_SOL);
      
      const txSignature = await program.methods
        .addLiquidity(liquidityParameter)
        .accountsStrict({
          lbPair: matchingPair.publicKey,
          position: positionKeypair.publicKey,
          binArrayBitmapExtension: null,
          reserveX: matchingPair.account.reserveX,
          reserveY: matchingPair.account.reserveY,
          binArrayLower: binArrayLower,
          binArrayUpper: sameBinArray ? binArrayLower : binArrayUpper,
          vaulta: vaulta,
          vaultb: vaultb,
          tokenXMint: poolTokenXMint,
          tokenYMint: poolTokenYMint,
          vault: escrow_vault_pda,
          escrow: escrowPda,
          dlmmProgram: METORA_PROGRAM_ID,
          eventAuthority: eventAuthority,
          tokenXProgram: poolTokenXProgramId,
          tokenYProgram: poolTokenYProgramId,
        tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID
        })
        .rpc();
     
      console.log(" Liquidity added successfully!");
      console.log("Transaction signature:", txSignature);
      await provider.connection.confirmTransaction(txSignature, "confirmed");
      await deposit_lp(lp.amount,proposal_id);
      await prisma.liquidityPosition.create({
        data: {
          lowerBinId: lowerBinId,
          upperBinId: upperBinId,
          tokenMint: lp.mint,
          chatId: lp.chatId,
          poolAddress: matchingPair.publicKey.toString(),
          positionAddress: positionKeypair.publicKey.toString(),
          amount: totalAmount.toString(),
          escrowId: escrowRow.id,
          isActive: true
        }
      });
      return {
        txn: txSignature,
        positionAddress: positionKeypair.publicKey.toString(),
        poolAddress: matchingPair.publicKey.toString()
      }
    
      
    } catch (error: any) {
      console.error("\n❌ Add liquidity failed:", error);
      
      if (error.logs) {
        console.error("\n📋 Program Logs:");
        error.logs.forEach((log: string) => console.error(log));
      }
      
      if (error.message) {
        console.error("\n💬 Error Message:", error.message);
      }
      
      throw error;
    }
  }

