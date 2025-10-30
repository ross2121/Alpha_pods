import { Scenes, Markup, Context } from "telegraf";
import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, SystemProgram } from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID, 
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
  transfer,
  getAccount
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AlphaPods } from "../idl/alpha_pods";
import * as idl from "../idl/alpha_pods.json";
import DLMM, { binIdToBinArrayIndex, deriveBinArray, deriveEventAuthority } from "@meteora-ag/dlmm";
import { PrismaClient } from "@prisma/client";
import { deposit } from "../contract/contract";
import crypto from "crypto";
import { decryptPrivateKey } from "../services/auth";

const prisma = new PrismaClient();
const METORA_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");

// Helper function to decrypt private key and get Keypair
async function getUserKeypair(telegramId: string): Promise<Keypair | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { telegram_id: telegramId }
    });

    if (!user) {
      console.error(`User not found for telegram ID: ${telegramId}`);
      return null;
    }

    // Decrypt the private key
    const algorithm = 'aes-256-cbc';
    const encryptionKey = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = Buffer.from(user.encryption_iv, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(user.encrypted_private_key, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const privateKeyArray = JSON.parse(decrypted);
    const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    
    return keypair;
  } catch (error) {
    console.error(`Error getting keypair for telegram ID ${telegramId}:`, error);
    return null;
  }
}

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

// Step 1: Ask for mint address
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

// Step 2: Find pools and ask for amount
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

    // Show pool details
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

// Step 3: Create proposal for voting
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

    // Create proposal in database
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

    // Save proposal to database
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
        Members: [],
        mintb: "LIQUIDITY_PROPOSAL" // Special marker for liquidity proposals
      }
    });

    const successMessage = `
✅ **Liquidity Proposal Created!**

**Proposal ID:** \`${proposal.id}\`
**Token:** \`${mint.slice(0, 8)}...${mint.slice(-8)}\`
**Amount per member:** ${amount} SOL

Members can now vote! Those who vote YES will contribute ${amount} SOL to the liquidity pool.

After voting closes, use: \`/execute_liquidity ${proposal.id}\`
    `;

    await ctx.reply(successMessage, { parse_mode: "Markdown" });
    return ctx.scene.leave();

  } catch (error: any) {
    console.error("Error creating proposal:", error);
    await ctx.reply("❌ Failed to create liquidity proposal.");
    return ctx.scene.leave();
  }
};

// OLD CODE - keeping for reference, will create new execute function
const executeLiquidityOLD = async (tokenXMint: PublicKey, amount: number, chatId: number, connection: Connection) => {
    try {
    const secretKeyArray = [123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224];
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    
    const program = getProgram(connection, adminKeypair);

    const escrowRow = await prisma.escrow.findUnique({
      where: { chatId: Number(chatId) }
    });

    if (!escrowRow) {
      throw new Error("No escrow found");
    }

    const escrowPda = new PublicKey(escrowRow.escrow_pda);
    const [escrow_vault_pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowPda.toBuffer()],
      program.programId
    );

    const tokenYMint = NATIVE_MINT;

    const allPairs = await DLMM.getLbPairs(connection);
    const matchingPair = allPairs.find(pair => 
      (pair.account.tokenXMint.toBase58() === tokenXMint.toBase58() && pair.account.tokenYMint.toBase58() === tokenYMint.toBase58()) ||
      (pair.account.tokenYMint.toBase58() === tokenXMint.toBase58() && pair.account.tokenXMint.toBase58() === tokenYMint.toBase58())
    );

    if (!matchingPair) {
      throw new Error("Pool not found");
    }

    const activeBinId = matchingPair.account.activeId;
    const lowerBinId = activeBinId - 24;
    const width = 48;

    // Create position keypair
    const positionKeypair = Keypair.generate();
    const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);

    // Create position
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
    
    await connection.confirmTransaction(createPositionTx, "confirmed");
    console.log("position",createPositionTx);
    // Wrap SOL to WSOL
    const amountToWrap = amount * anchor.web3.LAMPORTS_PER_SOL;
    const wsolAccount = await getAssociatedTokenAddress(NATIVE_MINT, adminKeypair.publicKey);

    const wrapTransaction = new Transaction();
    const wsolAccountInfo = await connection.getAccountInfo(wsolAccount);

    if (!wsolAccountInfo) {
      wrapTransaction.add(
        createAssociatedTokenAccountInstruction(
          adminKeypair.publicKey,
          wsolAccount,
          adminKeypair.publicKey,
          NATIVE_MINT
        )
      );
    }

    wrapTransaction.add(
      SystemProgram.transfer({
        fromPubkey: adminKeypair.publicKey,
        toPubkey: wsolAccount,
        lamports: amountToWrap,
      }),
      createSyncNativeInstruction(wsolAccount, TOKEN_PROGRAM_ID)
    );

    await sendAndConfirmTransaction(connection, wrapTransaction, [adminKeypair]);

    // Setup bin arrays
    const upperBinId = lowerBinId + width - 1;
    const lowerBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(lowerBinId));
    const upperBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(upperBinId));

    const [binArrayLower] = deriveBinArray(matchingPair.publicKey, lowerBinArrayIndex, METORA_PROGRAM_ID);
    const [binArrayUpper] = deriveBinArray(matchingPair.publicKey, upperBinArrayIndex, METORA_PROGRAM_ID);

    // Create bin arrays if needed
    const lowerBinArrayInfo = await connection.getAccountInfo(binArrayLower);
    if (!lowerBinArrayInfo) {
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
        await connection.confirmTransaction(createLowerBinArrayTx, "confirmed");
      } catch (err: any) {
        console.log("Bin array creation note:", err.message);
      }
    }

    const upperBinArrayInfo = await connection.getAccountInfo(binArrayUpper);
    if (!upperBinArrayInfo && binArrayUpper.toString() !== binArrayLower.toString()) {
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
        await connection.confirmTransaction(createUpperBinArrayTx, "confirmed");
      } catch (err: any) {
        console.log("Bin array creation note:", err.message);
      }
    }

    // Setup vault accounts
    const vaulta = await getAssociatedTokenAddress(tokenXMint, escrow_vault_pda, true);
    const vaultb = await getAssociatedTokenAddress(tokenYMint, escrow_vault_pda, true);

    const vaultaInfo = await connection.getAccountInfo(vaulta);
    if (!vaultaInfo) {
      const createVaultaTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(adminKeypair.publicKey, vaulta, escrow_vault_pda, tokenXMint)
      );
      await sendAndConfirmTransaction(connection, createVaultaTx, [adminKeypair]);
    }

    const vaultbInfo = await connection.getAccountInfo(vaultb);
    if (!vaultbInfo) {
      const createVaultbTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(adminKeypair.publicKey, vaultb, escrow_vault_pda, tokenYMint)
      );
      await sendAndConfirmTransaction(connection, createVaultbTx, [adminKeypair]);
    }

    // Transfer WSOL to vault
    const amountY = new anchor.BN(amountToWrap);
    await transfer(connection, adminKeypair, wsolAccount, vaultb, adminKeypair, amountY.toNumber());

    // Add liquidity
    const liquidityParameter = {
      amountX: new anchor.BN(0),
      amountY: amountY,
      binLiquidityDist: [
        {
          binId: activeBinId,
          distributionX: 0,
          distributionY: 10000,
        }
      ],
    };

    const sameBinArray = binArrayLower.equals(binArrayUpper);
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
        tokenXMint: tokenXMint,
        vault: escrow_vault_pda,
        tokenYMint: tokenYMint,
        escrow: escrowPda,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        tokenXProgram: TOKEN_PROGRAM_ID,
        tokenYProgram: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      })
      .rpc();

    await connection.confirmTransaction(txSignature, "confirmed");
    console.log("liquidity",txSignature);
 
    return {
      positionAddress: positionKeypair.publicKey.toBase58(),
      poolAddress: matchingPair.publicKey.toBase58(),
      txSignature: txSignature,
      lowerBinId: lowerBinId,
      upperBinId: upperBinId,
      activeBinId: activeBinId
    };

  } catch (error: any) {
    console.error("Error adding liquidity:", error);
    throw error;
  }
};

// Handle voting on liquidity proposals
export const handleLiquidityVote = async (ctx: any) => {
  const action = ctx.match[1]; // yes or no
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

    // Check if user already voted
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

// Execute liquidity after voting
export const handleExecuteLiquidity = async (ctx: Context) => {
  try {
    const text = 'text' in ctx.message! ? ctx.message.text : '';
    const parts = text.split(' ');
    
    if (parts.length < 2) {
      await ctx.reply("Usage: `/execute_liquidity <proposal_id>`", { parse_mode: "Markdown" });
      return;
    }

    const proposalId = parts[1];
    
    await ctx.reply("⏳ Collecting funds and adding liquidity...");

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId }
    });

    if (!proposal || proposal.mintb !== "LIQUIDITY_PROPOSAL") {
      await ctx.reply("❌ Proposal not found or not a liquidity proposal.");
      return;
    }

    if (proposal.Members.length === 0) {
      await ctx.reply("❌ No members voted YES. Cannot execute.");
      return;
    }

    const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com", { commitment: "confirmed" });
    
    const totalAmount = proposal.amount * proposal.Members.length;
    const tokenMint = new PublicKey(proposal.mint);
    
    // Get escrow info
    const escrowRow = await prisma.escrow.findUnique({
      where: { chatId: Number(proposal.chatId) }
    });

    if (!escrowRow) {
      await ctx.reply("❌ No escrow found for this chat.");
      return;
    }

    // Step 1: Collect deposits from all members who voted YES
    await ctx.reply(`💰 Collecting ${proposal.amount} SOL from ${proposal.Members.length} members...`);
    
    const depositAmount = new anchor.BN(proposal.amount * anchor.web3.LAMPORTS_PER_SOL);
    let successfulDeposits = 0;
    const failedMembers: string[] = [];

    for (const memberTelegramId of proposal.Members) {
      try {
         const user=await prisma.user.findUnique({
            where:{
                telegram_id:memberTelegramId
            }
         });
         if(!user){
            return;
         }
        const privatekey =decryptPrivateKey(user?.encrypted_private_key,user?.encryption_iv)
        const keypair=Keypair.fromSecretKey(privatekey)
        await deposit(new anchor.BN(proposal.amount),keypair,proposal.chatId)
        console.log(`Would collect ${proposal.amount} SOL from member ${memberTelegramId}`);
        successfulDeposits++;
        
      } catch (error: any) {
        console.error(`Failed to collect from member ${memberTelegramId}:`, error);
        ctx.reply("Not enough to execute")
        failedMembers.push(memberTelegramId);
        return;
        
      }
    }

    if (failedMembers.length > 0) {
      await ctx.reply(`⚠️ Warning: Failed to collect from ${failedMembers.length} members. Continuing with ${successfulDeposits} deposits...`);
    } else {
      await ctx.reply(`✅ Successfully collected from all ${successfulDeposits} members!`);
    }

    // Step 2: Execute the actual liquidity addition
    await ctx.reply("📝 Creating liquidity position...");
    const result = await executeLiquidityOLD(tokenMint, totalAmount, Number(proposal.chatId), connection);

    // Save position to database
    await prisma.liquidityPosition.create({
      data: {
        positionAddress: result.positionAddress,
        poolAddress: result.poolAddress,
        tokenMint: tokenMint.toBase58(),
        amount: totalAmount.toString(),
        chatId: BigInt(proposal.chatId),
        escrowId: escrowRow.id,
        lowerBinId: result.lowerBinId,
        upperBinId: result.upperBinId,
        isActive: true
      }
    });

    await ctx.reply(`
✅ **Liquidity Execution Complete!**

**Position Details:**
• Position: \`${result.positionAddress}\`
• Pool: \`${result.poolAddress}\`
• Total Liquidity: ${totalAmount} SOL from ${proposal.Members.length} members
• Bin Range: ${result.lowerBinId} - ${result.upperBinId}
• Active Bin: ${result.activeBinId}

**Transaction:**
• Signature: \`${result.txSignature}\`

The liquidity position is now earning fees! 🎉

View on Solscan: https://solscan.io/tx/${result.txSignature}
    `, { parse_mode: "Markdown" });

    // Mark proposal as executed
    await prisma.proposal.update({
      where: { id: proposalId },
      data: { ProposalStatus: "Expired", Votestatus: "Expired" }
    });

  } catch (error: any) {
    console.error("Error executing liquidity:", error);
    
    let errorMsg = "❌ Failed to execute liquidity addition.";
    if (error.message?.includes("insufficient")) {
      errorMsg = "❌ Insufficient balance in escrow. Please ensure enough SOL is deposited.";
    } else if (error.message?.includes("Pool not found")) {
      errorMsg = "❌ No liquidity pool found for this token.";
    }
    
    await ctx.reply(errorMsg);
  }
};

// Create the wizard
export const createLiquidityWizard = new Scenes.WizardScene<LiquidityContext>(
  "add_liquidity_wizard",
  askMintStep,
  findPoolsStep,
  createProposalStep
);

// View positions command
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

    let message = `📊 **Your Liquidity Positions** (${positions.length})\n\n`;

    positions.forEach((pos: any, index: number) => {
      message += `**Position ${index + 1}:**\n`;
      message += `• Address: \`${pos.positionAddress}\`\n`;
      message += `• Pool: \`${pos.poolAddress.slice(0, 8)}...${pos.poolAddress.slice(-8)}\`\n`;
      message += `• Token: \`${pos.tokenMint.slice(0, 8)}...${pos.tokenMint.slice(-8)}\`\n`;
      message += `• Amount: ${pos.amount} SOL\n`;
      message += `• Range: ${pos.lowerBinId} - ${pos.upperBinId}\n\n`;
    });

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error viewing positions:", error);
    await ctx.reply("❌ Failed to fetch positions.");
  }
};

// Close position command - asks user which position to close
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

    // Create buttons for each position
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
    await ctx.reply("❌ Failed to fetch positions.");
  }
};

// Execute close position
export const executeClosePosition = async (ctx: Context, positionId: number) => {
  try {
    await ctx.answerCbQuery("⏳ Closing position...");
    await ctx.reply("⏳ Closing liquidity position... This may take a moment.");

    const position = await prisma.liquidityPosition.findUnique({
      where: { id: positionId.toString() },
      include: { escrow: true }
    });

    if (!position || !position.isActive) {
      await ctx.reply("❌ Position not found or already closed.");
      return;
    }

    const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com", { commitment: "confirmed" });
    
    const secretKeyArray = [123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224];
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    
    const program = getProgram(connection, adminKeypair);

    const escrowPda = new PublicKey(position.escrow.escrow_pda);
    const [escrow_vault_pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowPda.toBuffer()],
      program.programId
    );

    const positionPubkey = new PublicKey(position.positionAddress);
    const poolPubkey = new PublicKey(position.poolAddress);
    const tokenXMint = new PublicKey(position.tokenMint);
    const tokenYMint = NATIVE_MINT;

    // Get pool data
    const allPairs = await DLMM.getLbPairs(connection);
    const matchingPair = allPairs.find(pair => pair.publicKey.toBase58() === poolPubkey.toBase58());

    if (!matchingPair) {
      await ctx.reply("❌ Pool not found.");
      return;
    }

    const activeBinId = matchingPair.account.activeId;
    const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);

    // Derive bin arrays
    const lowerBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(position.lowerBinId));
    const upperBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(position.upperBinId));
    const [binArrayLower] = deriveBinArray(poolPubkey, lowerBinArrayIndex, METORA_PROGRAM_ID);
    const [binArrayUpper] = deriveBinArray(poolPubkey, upperBinArrayIndex, METORA_PROGRAM_ID);

    // Derive vaults
    const vaulta = await getAssociatedTokenAddress(tokenXMint, escrow_vault_pda, true);
    const vaultb = await getAssociatedTokenAddress(tokenYMint, escrow_vault_pda, true);

    // Remove liquidity first
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
        user: adminKeypair.publicKey,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        tokenXProgram: TOKEN_PROGRAM_ID,
        tokenYProgram: TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([adminKeypair])
      .rpc();

    await connection.confirmTransaction(removeLiquidityTx, "confirmed");

    // Close position
    await ctx.reply("🔒 Closing position...");
    const closeTx = await program.methods
      .closePosition()
      .accountsStrict({
        lbPair: poolPubkey,
        position: positionPubkey,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        rentReciver: adminKeypair.publicKey,
        escrow: escrowPda,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        vault: escrow_vault_pda
      })
      .rpc();

    await connection.confirmTransaction(closeTx, "confirmed");

    // Update database
    await prisma.liquidityPosition.update({
      where: { id: positionId.toString() },
      data: { isActive: false }
    });

    const successMessage = `
✅ **Position Closed Successfully!**

**Details:**
• Position: \`${position.positionAddress}\`
• Liquidity removed and position closed

**Transactions:**
• Remove Liquidity: \`${removeLiquidityTx}\`
• Close Position: \`${closeTx}\`

Funds have been returned to the escrow vault! 💰
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

