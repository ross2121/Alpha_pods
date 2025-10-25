import express, { json } from "express";
import { Telegraf, Markup, Scenes, session } from "telegraf";
import dotenv from "dotenv";
import { admin_middleware, user_middleware } from "./middleware/admin";
import { MyContext, proposeWizard } from "./commands/Proposal";
import { handleVote, Vote } from "./commands/vote";
import { 
    handleMemberCount, 
    handleMyInfo, 
    handleMarket, 
    handleNewChatMembers, 
    handleLeftChatMember, 
    handleMyChatMember 
} from "./commands/group";
import { getQuote, handleSwap, handleExecuteSwap } from "./commands/swap";
import { getminimumfund } from "./commands/fund";
dotenv.config();
const bot = new Telegraf<MyContext>(process.env.TELEGRAM_API || "");
const mainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback("Swap", "Swap")],
    [Markup.button.callback("Propose", "propose")],
    [Markup.button.callback("🔄 Swap Tokens", "swap_tokens")],
    [Markup.button.callback("💼 Manage Wallet", "manage_wallet")],
    [Markup.button.callback("🚀 Start Strategy", "start_strategy")],
    [Markup.button.callback("⏹️ Stop Strategy", "stop_strategy")],
    [Markup.button.callback("📈 Exit Position", "exit_position")]
]);
const app=express();
const stage = new Scenes.Stage<MyContext>([proposeWizard]);
app.use(json);
dotenv.config();

bot.use(session());
bot.use(stage.middleware());

bot.command("propose", admin_middleware, async (ctx) => {
  await ctx.scene.enter('propose_wizard');
});

// Admin-only execute command
bot.command("execute", admin_middleware, handleExecuteSwap);

bot.command('membercount', handleMemberCount);
bot.command('myinfo', handleMyInfo);
bot.command("market", handleMarket);

bot.on("my_chat_member", handleMyChatMember);
bot.on("left_chat_member", handleLeftChatMember);
bot.on('new_chat_members', handleNewChatMembers);
bot.command("Swap", handleSwap);

getQuote("5082ab0c-a328-4469-b1fd-85f190b85339");
bot.action(/vote:(yes|no):(.+)/, user_middleware,handleVote);

bot.launch();
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  ActivationType,
  BaseFeeMode,
  CpAmm,
  getBaseFeeParams,
  getDynamicFeeParams,
  getSqrtPriceFromPrice,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
} from "@meteora-ag/cp-amm-sdk";
import {
  getMint,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

(async () => {
  const POOL_CONFIG = {
    rpcUrl: clusterApiUrl("devnet"),
    tokenAMint: new PublicKey("DP3fit2BHZviEgKD9di8LqMeZH6HYJwRf59ebe3mKaCa"),
    tokenBMint: NATIVE_MINT,
    tokenADecimals: 9,
    tokenBDecimals: 9,
    maxTokenAAmount: 1_000_000,
    maxTokenBAmount: 1, // SOL
    initialPrice: 1, // 1 base token = 1 quote token
    startingFeeBps: 5000, // 50%
    endingFeeBps: 25, // 0.25%
    useDynamicFee: true,
    isLockLiquidity: true,
    baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
    numberOfPeriod: 60, // 60 peridos
    totalDuration: 3600, // 60 * 60
  };

  const secretKeyArray = [
    123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,
    235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224
  ];
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
  console.log("publice key",wallet.publicKey.toBase58());

  const connection = new Connection(POOL_CONFIG.rpcUrl);
  const cpAmm = new CpAmm(connection);

  const tokenAAccountInfo = await connection.getAccountInfo(
    POOL_CONFIG.tokenAMint
  );

  let tokenAProgram = TOKEN_PROGRAM_ID;
  let tokenAInfo: { mint: any; currentEpoch: number } | undefined = undefined;
  if(tokenAAccountInfo==null){
    return;
  }
  if (tokenAAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    tokenAProgram = tokenAAccountInfo.owner;
    const baseMint = await getMint(
      connection,
      POOL_CONFIG.tokenAMint,
      connection.commitment,
      tokenAProgram
    );
    const epochInfo = await connection.getEpochInfo();
    tokenAInfo = {
      mint: baseMint,
      currentEpoch: epochInfo.epoch,
    };
  }

  const tokenAAmountInLamport = new BN(POOL_CONFIG.maxTokenAAmount).mul(
    new BN(10 ** POOL_CONFIG.tokenADecimals)
  );
  const tokenBAmountInLamport = new BN(POOL_CONFIG.maxTokenBAmount).mul(
    new BN(10 ** POOL_CONFIG.tokenBDecimals)
  );
  const initSqrtPrice = getSqrtPriceFromPrice(
    POOL_CONFIG.initialPrice.toString(),
    POOL_CONFIG.tokenADecimals,
    POOL_CONFIG.tokenBDecimals
  );
  const liquidityDelta = cpAmm.getLiquidityDelta({
    maxAmountTokenA: tokenAAmountInLamport,
    maxAmountTokenB: tokenBAmountInLamport,
    sqrtPrice: initSqrtPrice,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    tokenAInfo,
  });

  const baseFeeParams = getBaseFeeParams(
    {
      baseFeeMode: POOL_CONFIG.baseFeeMode,
      feeSchedulerParam: {
        startingFeeBps: POOL_CONFIG.startingFeeBps,
        endingFeeBps: POOL_CONFIG.endingFeeBps,
        numberOfPeriod: POOL_CONFIG.numberOfPeriod,
        totalDuration: POOL_CONFIG.totalDuration,
      },
    },
    POOL_CONFIG.tokenBDecimals,
    ActivationType.Timestamp
  );
  const dynamicFeeParams = POOL_CONFIG.useDynamicFee
    ? getDynamicFeeParams(POOL_CONFIG.endingFeeBps)
    : null;

  const poolFees: PoolFeesParams = {
    baseFee: baseFeeParams,
    padding: [],
    dynamicFee: dynamicFeeParams,
  };
  const positionNft = Keypair.generate();
  // Create a new position NFT keypair
  const positionNftForPosition = Keypair.generate();
  
  const test = await cpAmm.createPosition({
    owner: wallet.publicKey,
    pool: new PublicKey("FX8AE4h26RNY5FvuxmZxwkQU1VyPDwtekFtVphgsv9Ci"),
    positionNft: positionNftForPosition.publicKey,
    payer: wallet.publicKey
  });
  
  // Set blockhash and fee payer BEFORE signing
  const { blockhash } = await connection.getLatestBlockhash();
  test.recentBlockhash = blockhash;
  test.feePayer = wallet.publicKey;
  
  // Sign with both wallet and position NFT keypair
  test.partialSign(wallet, positionNftForPosition);
  
  // Send transaction
  const signature3 = await connection.sendRawTransaction(test.serialize());
  console.log("Transaction signature:", signature3);

  const {
    tx: initCustomizePoolTx,
    pool,
    position,
  } = await cpAmm.createCustomPool({
    payer: wallet.publicKey,
    creator: wallet.publicKey,
    positionNft: positionNft.publicKey,
    tokenAMint: POOL_CONFIG.tokenAMint,
    tokenBMint: POOL_CONFIG.tokenBMint,
    tokenAAmount: tokenAAmountInLamport,
    tokenBAmount: tokenBAmountInLamport,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    liquidityDelta: liquidityDelta,
    initSqrtPrice: initSqrtPrice,
    poolFees: poolFees,
    hasAlphaVault: false,
    activationType: ActivationType.Timestamp,
    collectFeeMode: 0,
    activationPoint: null,
    tokenAProgram,
    tokenBProgram: TOKEN_PROGRAM_ID,
    isLockLiquidity: POOL_CONFIG.isLockLiquidity,
  });

  // initCustomizePoolTx.recentBlockhash = (
  //   await connection.getLatestBlockhash()
  // ).blockhash;
  // initCustomizePoolTx.feePayer = wallet.publicKey;
  // initCustomizePoolTx.partialSign(wallet);
  // initCustomizePoolTx.partialSign(positionNft);

  // console.log(await connection.simulateTransaction(initCustomizePoolTx));
  //   const signature = await connection.sendRawTransaction(
  //     initCustomizePoolTx.serialize()
  //   );
  //   console.log({
  //     signature,
  //     pool: pool.toString(),
  //     position: position.toString(),
  //   });
})();