import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
  CpAmm,
  derivePoolAddress,
  derivePositionAddress,
  getSqrtPriceFromPrice,
} from "@meteora-ag/cp-amm-sdk"
import {
  getMint,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

(async () => {
  const CONFIG = {
    rpcUrl: "https://api.devnet.solana.com",
    tokenAMint: new PublicKey("9EpFqwBgu9JkxZYEaG1suWzVeA4YR14bkci2gJHU896y"),
    tokenBMint: NATIVE_MINT,
    config: new PublicKey("8CNy9goNQNLM4wtgRw528tUQGMKD3vSuFRZY2gLGLLvF"),
    tokenADecimals: 9,
    tokenBDecimals: 9,
    tokenAAmount: 1_000_000,
    tokenBAmount: 1,
    initialPrice: 1, 
  };

  const secretKeyArray = [
    123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,
    235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224
  ];
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));

  const connection = new Connection(CONFIG.rpcUrl);
  const cpAmm = new CpAmm(connection);

  const configState = await cpAmm.fetchConfigState(CONFIG.config);
  const tokenAAccountInfo = await connection.getAccountInfo(CONFIG.tokenAMint);

     let tokenAProgram = TOKEN_PROGRAM_ID;
   let tokenAInfo: { mint: any; currentEpoch: number } | undefined = undefined;
  if(tokenAAccountInfo==null){
    return;
  }
  if (tokenAAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    tokenAProgram = tokenAAccountInfo.owner;
    const baseMint = await getMint(
      connection,
      CONFIG.tokenAMint,
      connection.commitment,
      tokenAProgram
    );
    const epochInfo = await connection.getEpochInfo();
    tokenAInfo = {
      mint: baseMint,
      currentEpoch: epochInfo.epoch,
    };
  }

  const initialPoolTokenAAmount = new BN(CONFIG.tokenAAmount).mul(
    new BN(10 ** CONFIG.tokenADecimals)
  );
  const initialPoolTokenBAmount = new BN(CONFIG.tokenBAmount).mul(
    new BN(10 ** CONFIG.tokenBDecimals)
  );
  const initSqrtPrice = getSqrtPriceFromPrice(
    CONFIG.initialPrice.toString(),
    CONFIG.tokenADecimals,
    CONFIG.tokenBDecimals
  );
  const liquidityDelta = cpAmm.getLiquidityDelta({
    maxAmountTokenA: initialPoolTokenAAmount,
    maxAmountTokenB: initialPoolTokenBAmount,
    sqrtPrice: initSqrtPrice,
    sqrtMinPrice: configState.sqrtMinPrice,
    sqrtMaxPrice: configState.sqrtMaxPrice,
    tokenAInfo,
  });

  // create pool (included create first position)
  console.log("create pool");
  const positionNft = Keypair.generate();
  const initPoolTx = await cpAmm.createPool({
    payer: wallet.publicKey,
    creator: wallet.publicKey,
    config: CONFIG.config,
    positionNft: positionNft.publicKey,
    tokenAMint: CONFIG.tokenAMint,
    tokenBMint: CONFIG.tokenBMint,
    tokenAAmount: initialPoolTokenAAmount,
    tokenBAmount: initialPoolTokenBAmount,
    liquidityDelta: liquidityDelta,
    initSqrtPrice: initSqrtPrice,
    activationPoint: null,
    tokenAProgram,
    tokenBProgram: TOKEN_PROGRAM_ID,
    isLockLiquidity: true,
  });

  const signature = await sendAndConfirmTransaction(
    connection,
    initPoolTx,
    [wallet, positionNft],
    {
      commitment: "confirmed",
    }
  );

  console.log({
    pool: derivePoolAddress(
      CONFIG.config,
      CONFIG.tokenAMint,
      CONFIG.tokenBMint
    ).toString(),
    position: derivePositionAddress(positionNft.publicKey).toString(),
    positionNft: positionNft.publicKey.toString(),
    signature,
  });
})();