import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AlphaPods } from "../target/types/alpha_pods";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, sendAndConfirmTransaction, Connection, LAMPORTS_PER_SOL, ComputeBudgetProgram } from "@solana/web3.js";
import axios from "axios";
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAccount,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
  transfer
} from "@solana/spl-token";
import DLMM, { binIdToBinArrayIndex, deriveBinArray, deriveEventAuthority, derivePlaceHolderAccountMeta } from "@meteora-ag/dlmm";

describe("alpha_pods", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.alphaPods as Program<AlphaPods>;
  const provider = anchor.getProvider();
  const METORA_PROGRAM_ID = new PublicKey("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo");
  const EVENT_AUTHORITY = new PublicKey("EVmaFZ1Q42PAcE4z64RkK4kHfkU1p6VYgzxesa64TfWn");
  
  let admin: Keypair;
  let member1: Keypair;
  let member2: Keypair;
  let member3: Keypair;
  // let escrowPda: PublicKey;
  let escrowBump: number;
  let seed: number;
  let adminkeypair:Keypair
  // let escrow_vault_pda:PublicKey

  // before(async () => {
  //   const secretKeyArray = [
  //     123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,
  //     235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224
  //   ];
  //   const secretarray=new Uint8Array(secretKeyArray);
  //   admin = Keypair.fromSecretKey(secretarray);
  //   member1 = Keypair.generate();
  //   member2 = Keypair.generate();
  //   member3 = Keypair.generate();

  //   seed =61
  //  const secretKeyArray2 = [174,70,95,178,70,166,25,216,124,162,189,78,48,118,32,164,207,194,42,216,57,126,67,186,232,204,104,173,172,247,41,136,26,0,127,191,26,115,1,50,172,196,82,192,124,190,83,122,116,127,96,102,198,66,197,81,67,94,196,203,151,16,230,130]; 
  //   const secretarray2=new Uint8Array(secretKeyArray2); 
  //   adminkeypair= Keypair.fromSecretKey(secretarray2);
  //   console.log("admin",adminkeypair.publicKey.toString());
  //   [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
  //     [
  //       Buffer.from("escrow"),
  //       adminkeypair.publicKey.toBuffer(),
  //       Buffer.from(new anchor.BN(seed).toArrayLike(Buffer, "le", 8)),
  //     ],
  //     program.programId
  //   );
  //   console.log("pda",escrowPda);
  //   let bump;
  // [escrow_vault_pda,bump]=PublicKey.findProgramAddressSync(
  //   [
  //     Buffer.from("vault"),
  //     escrowPda.toBuffer(),
  //   ],
  //   program.programId
  // )
  // });
  

  // it("Initialize escrow", async () => {
  //   const tx = await program.methods
  //     .initialize(new anchor.BN(seed))
  //     .accountsStrict({
  //       admin: adminkeypair.publicKey,
  //       creator:admin.publicKey,
  //       escrow: escrowPda,
  //       // escrowVault:escrow_vault_pda,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([admin,adminkeypair])
  //     .rpc();
  //   console.log("Initialize transaction signature:", tx);
  //   const escrowAccount = await program.account.initializeAdmin.fetch(escrowPda);
   
  // });

  // it("Deposit SOL to escrow", async () => {
  //   const depositAmount = 0.5;
  //   const lamports = depositAmount * anchor.web3.LAMPORTS_PER_SOL;

  //   const initialMemberBalance = await provider.connection.getBalance(admin.publicKey);
  //   const initialEscrowBalance = await provider.connection.getBalance(escrowPda);

  //   console.log("Initial member balance:", initialMemberBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
  //   console.log("Initial escrow balance:", initialEscrowBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

  //   const tx = await program.methods
  //     .depositSol(new anchor.BN(depositAmount))
  //     .accountsStrict({
  //       member: member1.publicKey,
  //       escrow: escrowPda,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([member1])
  //     .rpc();

  //   console.log("Deposit transaction signature:", tx);

  //   // Get final balances
  //   const finalMemberBalance = await provider.connection.getBalance(member1.publicKey);
  //   const finalEscrowBalance = await provider.connection.getBalance(escrowPda);

  //   console.log("Final member balance:", finalMemberBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
  //   console.log("Final escrow balance:", finalEscrowBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

  //   // Verify the deposit worked
  //   expect(finalEscrowBalance).to.be.greaterThan(initialEscrowBalance);
  //   expect(finalMemberBalance).to.be.lessThan(initialMemberBalance);
    
  //   // Verify the exact amount was transferred (accounting for transaction fees)
  //   const expectedEscrowIncrease = lamports;
  //   const actualEscrowIncrease = finalEscrowBalance - initialEscrowBalance;
  //   expect(actualEscrowIncrease).to.equal(expectedEscrowIncrease);
  // });

  // it("Withdraw SOL from escrow", async () => {
  //   const withdrawAmount = 0.3; // Withdraw 0.3 SOL
  //   const lamports = withdrawAmount * anchor.web3.LAMPORTS_PER_SOL;

  //   // Get initial balances
  //   const initialMemberBalance = await provider.connection.getBalance(member1.publicKey);
  //   const initialEscrowBalance = await provider.connection.getBalance(escrowPda);

  //   console.log("Initial member balance before withdraw:", initialMemberBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
  //   console.log("Initial escrow balance before withdraw:", initialEscrowBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

  //   // Withdraw from escrow
  //   const tx = await program.methods
  //     .withdrawSol(new anchor.BN(withdrawAmount))
  //     .accountsStrict({
  //       member: admin.publicKey,
  //       escrow: escrowPda,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([admin])
  //     .rpc();

  //   console.log("Withdraw transaction signature:", tx);

  //   // Get final balances
  //   const finalMemberBalance = await provider.connection.getBalance(member1.publicKey);
  //   const finalEscrowBalance = await provider.connection.getBalance(escrowPda);

  //   console.log("Final member balance after withdraw:", finalMemberBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
  //   console.log("Final escrow balance after withdraw:", finalEscrowBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

  //   // Verify the withdraw worked
  //   expect(finalEscrowBalance).to.be.lessThan(initialEscrowBalance);
  //   expect(finalMemberBalance).to.be.greaterThan(initialMemberBalance);
    
  //   // Verify the exact amount was transferred (accounting for transaction fees)
  //   const expectedMemberIncrease = lamports;
  //   const actualMemberIncrease = finalMemberBalance - initialMemberBalance;
  //   const actualEscrowDecrease = initialEscrowBalance - finalEscrowBalance;
    
  //   expect(actualEscrowDecrease).to.equal(expectedMemberIncrease);
  //   console.log("Successfully withdrawn:", withdrawAmount, "SOL");
  // });

  // it("Deposit SOL from multiple members", async () => {
  //   const depositAmount1 = 0.3; // SOL from member2
  //   const depositAmount2 = 0.2; // SOL from member3
  //   const lamports1 = depositAmount1 * anchor.web3.LAMPORTS_PER_SOL;
  //   const lamports2 = depositAmount2 * anchor.web3.LAMPORTS_PER_SOL;

  //   // Get initial escrow balance
  //   const initialEscrowBalance = await provider.connection.getBalance(escrowPda);
  //   console.log("Initial escrow balance:", initialEscrowBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

  //   // First deposit from member2
  //   const tx1 = await program.methods
  //     .depositSol(new anchor.BN(depositAmount1))
  //     .accountsStrict({
  //       member: member2.publicKey,
  //       escrow: escrowPda,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([member2])
  //     .rpc();

  //   console.log("First deposit transaction signature:", tx1);

  //   // Second deposit from member3
  //   const tx2 = await program.methods
  //     .depositSol(new anchor.BN(depositAmount2))
  //     .accountsStrict({
  //       member: member3.publicKey,
  //       escrow: escrowPda,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([member3])
  //     .rpc();

  //   console.log("Second deposit transaction signature:", tx2);

  //   // Get final escrow balance
  //   const finalEscrowBalance = await provider.connection.getBalance(escrowPda);
  //   console.log("Final escrow balance:", finalEscrowBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

  //   // Verify both deposits worked
  //   const totalDeposited = lamports1 + lamports2;
  //   const actualIncrease = finalEscrowBalance - initialEscrowBalance;
  //   expect(actualIncrease).to.equal(totalDeposited);
  //   console.log("Total deposited:", totalDeposited / anchor.web3.LAMPORTS_PER_SOL, "SOL");
  // });

  // it("Fail to deposit with non-member", async () => {
  //   const nonMember = Keypair.generate();
  //   await provider.connection.requestAirdrop(nonMember.publicKey, anchor.web3.LAMPORTS_PER_SOL);

  //   const depositAmount = 0.1; // SOL

  //   try {
  //     await program.methods
  //       .depositSol(new anchor.BN(depositAmount))
  //       .accountsStrict({
  //         member: nonMember.publicKey,
  //         escrow: escrowPda,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([nonMember])
  //       .rpc();

  //     expect.fail("Should have failed - non-member cannot deposit");
  //   } catch (error) {
  //     console.log("Expected error:", error.message);
  //     expect(error.message).to.include("AccountNotEnoughKeys");
  //   }
  // });

  // it("Fail to deposit more than balance", async () => {
  //   const depositAmount = 10.0; // SOL - more than member has

  //   try {
  //     await program.methods
  //       .depositSol(new anchor.BN(depositAmount))
  //       .accountsStrict({
  //         member: member1.publicKey,
  //         escrow: escrowPda,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([member1])
  //       .rpc();

  //     expect.fail("Should have failed - insufficient balance");
  //   } catch (error) {
  //     console.log("Expected error:", error.message);
  //     expect(error.message).to.include("insufficient funds");
  //   }
  // });

  
  // it("Fail to withdraw more than deposited", async () => {
  //   const withdrawAmount = 1.0; // SOL - more than deposited
  //   const lamports = withdrawAmount * anchor.web3.LAMPORTS_PER_SOL;

  //   try {
  //     await program.methods
  //       .withdrawSol(new anchor.BN(lamports))
  //       .accountsStrict({
  //         member: member1.publicKey,
  //         escrow: escrowPda,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([member1])
  //       .rpc();

  //     expect.fail("Should have failed");
  //   } catch (error) {
  //     expect(error.message).to.include("AccountNotEnoughKeys");
  //   }
  // });

  // it("Fail to withdraw with non-member", async () => {
  //   const nonMember = Keypair.generate();
  //   // await provider.connection.requestAirdrop(nonMember.publicKey, anchor.web3.LAMPORTS_PER_SOL);

  //   const withdrawAmount = 0.1; // SOL
  //   const lamports = withdrawAmount * anchor.web3.LAMPORTS_PER_SOL;

  //   try {
  //     await program.methods
  //       .withdrawSol(new anchor.BN(lamports))
  //       .accountsStrict({
  //         member: nonMember.publicKey,
  //         escrow: escrowPda,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([nonMember])
  //       .rpc();

  //     expect.fail("Should have failed");
  //   } catch (error) {
  //     expect(error.message).to.include("No member exist for this address");
  //   }
  // });
  // it("Quote",async()=>{
  //   const ORDER_URL="https://lite-api.jup.ag/ultra/v1";
  //    const quotemint = "So11111111111111111111111111111111111111112";
  //    const basemint ="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  //    const amount = 0.5
  //    const amountInLamport=Math.floor(amount * 1e6)
  //    console.log("escrow",escrowPda.toString()); 
  //    const url = `${ORDER_URL}/order?inputMint=${basemint}&outputMint=${quotemint}&amount=${amountInLamport}&taker=${escrowPda.toString()}`;  
  //  try {
  //    const response = await axios.get(url);
  //    console.log("Order Response:", response.data);
  //    const transactionBuffer = Buffer.from(response.data.transaction, 'base64');
  //    const transactionArray = Array.from(transactionBuffer);
  //    const swap = await program.methods
  //    .executeSignedTx(transactionBuffer)
  //    .accountsStrict({
  //        admin: adminkeypair.publicKey,
  //        escrow: escrowPda,
  //        recipient: new PublicKey(response.data.toAccount || escrowPda.toString()),
  //        jupiterProgram: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
  //        systemProgram: SystemProgram.programId,
  //    })
  //    .signers([adminkeypair])
  //    .rpc();
  //    console.log("Swap transaction:", swap);
  //  } catch (error) {
  //    console.error("Error fetching order:", error);
  //    throw error;
  //  }
   
     
 
  // })

//   it("Create LP Pool", async () => {
//     // Test parameters
//     const minta = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
//     const mintb = new PublicKey("DP3fit2BHZviEgKD9di8LqMeZH6HYJwRf59ebe3mKaCa");
//     const activeId = 8388608 // Example bin ID
//     const binStep = 25;     // 0.2% bin step (in basis points, divided by 100)
    
//     // Derive PDAs for Metora
//     const binStepBytes = Buffer.allocUnsafe(2);
//     binStepBytes.writeUInt16LE(binStep, 0);
    
//     // Sort mints lexicographically
//     const mints = [minta, mintb].sort((a, b) => a.toBase58().localeCompare(b.toBase58()));
    
//     // Derive LP Account PDA
//     const [lpAccountPda, lpBump] = PublicKey.findProgramAddressSync(
//       [mints[0].toBuffer(), mints[1].toBuffer(), binStepBytes],
//       METORA_PROGRAM_ID 
//     );
//     console.log("LP Account PDA:", lpAccountPda.toString());
    
//     // Derive Oracle PDA
//     const [oraclePda, oracleBump] = PublicKey.findProgramAddressSync(
//       [Buffer.from("oracle"), lpAccountPda.toBuffer()],
//       METORA_PROGRAM_ID
//     );
//     console.log("Oracle PDA:", oraclePda.toString());
    
//     // Derive Preset Parameter PDA
//     const [presetParameterPda, presetBump] = PublicKey.findProgramAddressSync(
//       [Buffer.from("preset_parameter"), binStepBytes],
//       METORA_PROGRAM_ID
//     );
//     console.log("Preset Parameter PDA:", presetParameterPda.toString());
    
//     // Check if preset parameter exists
//     const presetAccountInfo = await provider.connection.getAccountInfo(presetParameterPda);
//     if (!presetAccountInfo) {
//       console.log("⚠️  Preset parameter account does not exist for bin step", binStep);
//       console.log("Skipping test - preset parameters must be created by Metora first");
//     }
//     const [tokenX, tokenY] = minta.toBuffer().compare(mintb.toBuffer()) < 0 
//   ? [minta, mintb] 
//   : [mintb, minta];
//   const binStepBuffer = Buffer.alloc(2);
// binStepBuffer.writeUInt16LE(binStep);
//   const [lbPairPda, lbPairBump] = PublicKey.findProgramAddressSync(
//     [tokenX.toBuffer(), tokenY.toBuffer(), binStepBuffer],
//     METORA_PROGRAM_ID
//   );
//     // Derive Reserve PDAs (ATAs)
//     const vaultaPda = await getAssociatedTokenAddress(minta, lpAccountPda, true);
//     const vaultbPda = await getAssociatedTokenAddress(mintb, lpAccountPda, true);
//     console.log("Vault A (Reserve X):", vaultaPda.toString());
//     console.log("Vault B (Reserve Y):", vaultbPda.toString());
    
//     // Derive member ATAs
//     const memberMintaAta = await getAssociatedTokenAddress(minta, adminkeypair.publicKey);
//     const memberMintbAta = await getAssociatedTokenAddress(mintb, adminkeypair.publicKey);
//     const temp=Keypair.generate();
//     const temp2=Keypair.generate();
//     try {
//       console.log("\nCalling lppool instruction...");
//       const txSignature = await program.methods
//         .lppool(activeId, binStep)
//         .accountsStrict({
//           member: adminkeypair.publicKey,
//           escrow: escrowPda,
//           lpAccount:lbPairPda,
//           oracle: oraclePda,
//           memberMinta: memberMintaAta,
//           memberMintb: memberMintbAta,
//           minta: minta,
//           mintb: mintb,
//           vaulta: vaultaPda,
//           vaultb: vaultbPda,
//           systemProgram: SystemProgram.programId,
//           tokenProgram: TOKEN_PROGRAM_ID,
//           associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//           presetParameter: new PublicKey("HxshKrRQVS7ZAzCf4ejgmqGyWZLUtwL7KCfDksdZz69h"),
//           rent: SYSVAR_RENT_PUBKEY,
//           meteoraProgram: METORA_PROGRAM_ID,
//           eventAuthority: EVENT_AUTHORITY,
//         })
//         .signers([adminkeypair])
//         .rpc();
      
//       console.log("Transaction successful!");
//       console.log("Signature:", txSignature);
      
//       // Verify accounts were created
//       const lpAccountInfo = await provider.connection.getAccountInfo(lpAccountPda);
//       console.log("LP Account created:", lpAccountInfo !== null);
      
//     } catch (error: any) {
//       console.error("Transaction failed:", error);
//       if (error.logs) {
//         console.error("Error logs:", error.logs);
//       }
//       throw error;
//     }
//   });

  // it("Swap tokens via Meteora DLMM", async () => {
  //   /**
  //    * This test demonstrates swapping tokens through Meteora DLMM pool via CPI.
  //    * Using existing pair: WSOL / Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
  //    */
    
  //   const tokenYMint = NATIVE_MINT; // WSOL
  //   const tokenXMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    
  //   // Find the existing LP pair for these tokens
  //   const allPairs = await (await import('@meteora-ag/dlmm')).default.getLbPairs(provider.connection);
    
  //   const matchingPair = allPairs.find(pair => 
  //     pair.account.tokenXMint.toBase58() === tokenXMint.toBase58() &&
  //     pair.account.tokenYMint.toBase58() === tokenYMint.toBase58()
  //   );
    
  //   if (!matchingPair) {
  //     console.log("⚠️  No matching pair found for these tokens");
  //     console.log("Skipping swap test");
  //     return;
  //   }
    
  //   console.log("✅ Found LP pair:", matchingPair.publicKey.toString());
  //   console.log("Bin Step:", matchingPair.account.binStep);
  //   console.log("Active ID:", matchingPair.account.activeId);
  //   console.log("Reserve X:", matchingPair.account.reserveX.toString());
  //   console.log("Reserve Y:", matchingPair.account.reserveY.toString());
  //   console.log("Oracle:", matchingPair.account.oracle.toString());
  
  //   console.log("\n🔄 Wrapping SOL to WSOL...");
  //   const amountToWrap = 0.01 * anchor.web3.LAMPORTS_PER_SOL;
  //   const wsolAccount = await getAssociatedTokenAddress(NATIVE_MINT, adminkeypair.publicKey);
    
  //   const wrapTransaction = new Transaction();
  //   const wsolAccountInfo = await provider.connection.getAccountInfo(wsolAccount);
  //   if (!wsolAccountInfo) {
  //     console.log("Creating WSOL associated token account...");
  //     wrapTransaction.add(
  //       createAssociatedTokenAccountInstruction(
  //         adminkeypair.publicKey,
  //         wsolAccount,
  //         adminkeypair.publicKey,
  //         NATIVE_MINT
  //       )
  //     );
  //   }
    
  //   // Transfer SOL to WSOL account
  //   wrapTransaction.add(
  //     SystemProgram.transfer({
  //       fromPubkey: adminkeypair.publicKey,
  //       toPubkey: wsolAccount,
  //       lamports: amountToWrap,
  //     })
  //   );
    
  //   // Sync native to recognize as WSOL
  //   wrapTransaction.add(
  //     createSyncNativeInstruction(wsolAccount, TOKEN_PROGRAM_ID)
  //   );
    
  //   const wrapSig = await sendAndConfirmTransaction(
  //     provider.connection,
  //     wrapTransaction,
  //     [adminkeypair]
  //   );
  //   console.log("✅ Wrapped SOL! Signature:", wrapSig);
    
  //   // Verify WSOL balance
  //   const wsolBalance = await getAccount(provider.connection, wsolAccount);
  //   console.log("WSOL Balance:", wsolBalance.amount.toString(), "lamports");
    
  //   // Derive user token accounts
  //   const userTokenX = await getAssociatedTokenAddress(tokenXMint, adminkeypair.publicKey);
  //   const userTokenY = wsolAccount; // Use the wrapped SOL account
    
  //   console.log("User Token X ATA:", userTokenX.toString());
  //   console.log("User Token Y (WSOL) ATA:", userTokenY.toString());
    
  //   // Swap parameters - swap WSOL for tokenX
  //   const amountIn = 1000000; // 0.001 WSOL (1,000,000 lamports)
  //   const minAmountOut = 1; // Minimum output (adjust based on your slippage tolerance)
    
  //   try {
  //     console.log("\nExecuting swap...");
  //     console.log("Amount In:", amountIn);
  //     console.log("Min Amount Out:", minAmountOut);
      
  //     // Import DLMM SDK to get bin arrays
  //     const DLMM = (await import('@meteora-ag/dlmm')).default;
      
  //     // Create DLMM instance to fetch bin arrays
  //     const dlmmPool = await DLMM.create(provider.connection, matchingPair.publicKey);
      
  //     // Get swap quote to determine which bin arrays are needed
  //     const swapQuote = await dlmmPool.swapQuote(
  //       new anchor.BN(amountIn),
  //       true, // swapForY (true means swapping Y for X, i.e., WSOL for tokenX)
  //       new anchor.BN(10), // slippage in BPS (10 = 0.1%)
  //       [adminkeypair.publicKey]
  //     );
   
  //     console.log("Swap quote:", {
  //       minOutAmount: swapQuote.minOutAmount.toString(),
  //       fee: swapQuote.fee.toString(),
  //       priceImpact: swapQuote.priceImpact,
  //     });
      
  //     // Get the bin arrays needed for the swap
  //     const binArrays = swapQuote.binArraysPubkey || [];
  //     console.log("Bin arrays needed:", binArrays.map(ba => ba.toString()));
      
  //     const txSignature = await program.methods
  //       .swap(new anchor.BN(amountIn), swapQuote.minOutAmount)
  //       .accountsStrict({
  //         lbPair: matchingPair.publicKey,
  //         binArrayBitmapExtension: null,
  //         reserveX: matchingPair.account.reserveX,
  //         reserveY: matchingPair.account.reserveY,
  //         userTokenOut: userTokenX,
  //         userTokenIn: userTokenY,
  //         tokenXMint: tokenXMint,
  //         tokenYMint: tokenYMint,
  //         oracle: matchingPair.account.oracle,
  //         hostFeeIn: null,
  //         user: adminkeypair.publicKey,
  //         dlmmProgram: METORA_PROGRAM_ID,
  //         eventAuthority: deriveEventAuthority(METORA_PROGRAM_ID)[0],
  //         tokenXProgram: TOKEN_PROGRAM_ID,
  //         tokenYProgram: TOKEN_PROGRAM_ID,
  //       })
  //       .remainingAccounts(
  //         binArrays.map(binArray => ({
  //           pubkey: binArray,
  //           isSigner: false,
  //           isWritable: true,
  //         }))
  //       )
  //       .signers([adminkeypair])
  //       .rpc();
        
  //     console.log("✅ Swap successful!");
  //     console.log("Transaction signature:", txSignature);
      
  //     // Verify balances changed
  //     const userTokenXAccount = await getAccount(provider.connection, userTokenX);
  //     const userTokenYAccount = await getAccount(provider.connection, userTokenY);
      
  //     console.log("User Token X balance:", userTokenXAccount.amount.toString());
  //     console.log("User Token Y balance:", userTokenYAccount.amount.toString());
      
  //   } catch (error: any) {
  //     console.error("Swap failed:", error);
  //     if (error.logs) {
  //       console.error("Error logs:", error.logs);
  //     }
  //     throw error;
  //   }
  // });

  // it("DLMM Swap CPI Test - With SDK Quote", async () => {
   
   
  //   const tokenYMint = NATIVE_MINT; 
  //   const tokenXMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    
  //   const DLMM_SDK = (await import('@meteora-ag/dlmm')).default;
  //   const allPairs = await DLMM_SDK.getLbPairs(provider.connection);
    
  //   const targetPoolKey = new PublicKey("3RrtUag8F8aw6jAhTF4RxwvQmFX6KEXJUZ6zDL3eKaJE");
  //   const matchingPair = allPairs.find(pair => pair.publicKey.toBase58() === targetPoolKey.toBase58());
    
  //   if (!matchingPair) {
  //     console.log("⚠️  No matching pair found");
  //     return;
  //   }
  //   console.log("mathc",matchingPair)
  //   console.log("\n📊 Pool State:");
  //   console.log("Pool Address:", matchingPair.publicKey.toString());
  //   console.log("Active Bin ID:", matchingPair.account.activeId);
  //   console.log("Bin Step:", matchingPair.account.binStep);
  //   console.log("Token X Mint:", matchingPair.account.tokenXMint.toString());
  //   console.log("Token Y Mint:", matchingPair.account.tokenYMint.toString());
  //   console.log("Reserve X:", matchingPair.account.reserveX.toString());
  //   console.log("Reserve Y:", matchingPair.account.reserveY.toString());
  //   console.log("Oracle:", matchingPair.account.oracle.toString());

  
  //   console.log("\n🔄 Wrapping SOL to WSOL...");
  //   const amountToWrap = 0.01 * anchor.web3.LAMPORTS_PER_SOL;
  //   const wsolAccount = await getAssociatedTokenAddress(NATIVE_MINT, adminkeypair.publicKey);
    
  //   const wrapTransaction = new Transaction();
  //   const wsolAccountInfo = await provider.connection.getAccountInfo(wsolAccount);
  //   if (!wsolAccountInfo) {
  //     wrapTransaction.add(
  //       createAssociatedTokenAccountInstruction(
  //         adminkeypair.publicKey,
  //         wsolAccount,
  //         adminkeypair.publicKey,
  //         NATIVE_MINT
  //       )
  //     );
  //   }
    
  //   wrapTransaction.add(
  //     SystemProgram.transfer({
  //       fromPubkey: adminkeypair.publicKey,
  //       toPubkey: wsolAccount,
  //       lamports: amountToWrap,
  //     })
  //   );
    
  //   wrapTransaction.add(
  //     createSyncNativeInstruction(wsolAccount, TOKEN_PROGRAM_ID)
  //   );
    
  //   await sendAndConfirmTransaction(provider.connection, wrapTransaction, [adminkeypair]);
  //   console.log("✅ Wrapped SOL!");
 
    
  //   const userTokenX = await getAssociatedTokenAddress(tokenXMint, adminkeypair.publicKey);
  //   const userTokenY = wsolAccount;

  //   console.log("\n👤 User Token Accounts:");
  //   console.log("User Token X ATA:", userTokenX.toString());
  //   console.log("User Token Y (WSOL) ATA:", userTokenY.toString());

  //   // Create DLMM pool instance
  //   // const dlmmPool = await DLMM.create(provider.connection, matchingPair.publicKey);
    
  //   // Swap parameters
  //   let pool=deriveBinArray(matchingPair.publicKey,binIdToBinArrayIndex(new anchor.BN(matchingPair.account.activeId)),METORA_PROGRAM_ID)
  //   const amountIn = new anchor.BN(1_000_000); // 0.001 WSOL
  //   const swapForY = true; // Swapping Y (WSOL) for X
  //   const connection=new Connection("https://api.devnet.solana.com")
  //   const USDC_USDT_POOL = new PublicKey('ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq')
  

  //   const activeBinArrayAccountMeta = {
  //     pubkey:pool[0],
  //     isSigner: false,
  //     isWritable: true, 
  //   };
  //   const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);

  //   console.log("\n🚀 Executing swap transaction...");

  //   const vaulta = await getAssociatedTokenAddress(tokenXMint, escrowPda, true);
  //   const vaultb = await getAssociatedTokenAddress(tokenYMint, escrowPda, true);


  //   const vaultaInfo = await provider.connection.getAccountInfo(vaulta);
  //   if (!vaultaInfo) {
  //     console.log("Creating vaulta...");
  //     const createVaultaTx = new Transaction().add(
  //       createAssociatedTokenAccountInstruction(
  //         adminkeypair.publicKey,
  //         vaulta,
  //         escrowPda,
  //         tokenXMint
  //       )
  //     );
  //     await sendAndConfirmTransaction(provider.connection, createVaultaTx, [adminkeypair]);
  //   }

  //   const vaultbInfo = await provider.connection.getAccountInfo(vaultb);
  //   if (!vaultbInfo) {
  //     console.log("Creating vaultb...");
  //     const createVaultbTx = new Transaction().add(
  //       createAssociatedTokenAccountInstruction(
  //         adminkeypair.publicKey,
  //         vaultb,
  //         escrowPda,
  //         tokenYMint
  //       )
  //     );
  //     await sendAndConfirmTransaction(provider.connection, createVaultbTx, [adminkeypair]);
  //   }

  
  //   console.log("Transferring WSOL to escrow vault...");
  //   await transfer(
  //     provider.connection,
  //     adminkeypair,
  //     userTokenY,
  //     vaultb,
  //     adminkeypair,
  //     amountIn.toNumber()
  //   );

  //   try {
  //     const txSignature = await program.methods
  //       .swap(amountIn, new anchor.BN(22))
  //       .accountsStrict({
  //         lbPair: matchingPair.publicKey,
  //         binArrayBitmapExtension: null,
  //         reserveX: matchingPair.account.reserveX,
  //         reserveY: matchingPair.account.reserveY,
  //         userTokenIn: userTokenY,
  //         userTokenOut: userTokenX,
  //         escrow: escrowPda,
  //         vaulta: vaulta,
  //         vaultb: vaultb,
  //         tokenXMint: tokenXMint,
  //         tokenYMint: tokenYMint,
  //         oracle: matchingPair.account.oracle,
  //         hostFeeIn: null,
  //         dlmmProgram: METORA_PROGRAM_ID,
  //         eventAuthority: eventAuthority,
  //         tokenXProgram: TOKEN_PROGRAM_ID,
  //         tokenYProgram: TOKEN_PROGRAM_ID,
  //         tokenProgram: TOKEN_PROGRAM_ID,
  //       }).remainingAccounts([activeBinArrayAccountMeta])
        
  //       .rpc();

  //     console.log("✅ Swap successful!");
  //     console.log("Transaction signature:", txSignature);

  
  //     await provider.connection.confirmTransaction(txSignature, "confirmed");
  //     try {
  //       const userTokenXAccount = await getAccount(provider.connection, userTokenX);
  //       const userTokenYAccount = await getAccount(provider.connection, userTokenY);

  //       console.log("\n💰 Final Balances:");
  //       console.log("User Token X balance:", userTokenXAccount.amount.toString());
  //       console.log("User Token Y balance:", userTokenYAccount.amount.toString());
  //     } catch (accountError) {
  //       console.log("Note: Could not fetch token account balances");
  //     }

  //   } catch (error: any) {
  //     console.error("\n❌ Swap failed:", error);
      
  //     if (error.logs) {
  //       console.error("\n📋 Program Logs:");
  //       error.logs.forEach((log: string) => console.error(log));
  //     }
      
  //     throw error;
  //   }
  // });

  // it("Add Liquidity Position to DLMM Pool", async () => {
  //   /**
  //    * This test demonstrates adding a liquidity position to an existing DLMM pool.
  //    * A position represents a liquidity provider's deposit within a specific price range.
  //    */
    
  //   const tokenYMint = NATIVE_MINT; // WSOL
  //   const tokenXMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    
  //   // Find the existing LP pair
  //   const allPairs = await DLMM.getLbPairs(provider.connection);
    
  //   const matchingPair = allPairs.find(pair => 
  //     pair.account.tokenXMint.toBase58() === tokenXMint.toBase58() &&
  //     pair.account.tokenYMint.toBase58() === tokenYMint.toBase58()
  //   );
    
  //   if (!matchingPair) {
  //     console.log("⚠️  No matching pair found for these tokens");
  //     console.log("Skipping position test");
  //     return;
  //   }
    
  //   console.log("\n📊 Pool Information:");
  //   console.log("Pool Address:", matchingPair.publicKey.toString());
  //   console.log("Active Bin ID:", matchingPair.account.activeId);
  //   console.log("Bin Step:", matchingPair.account.binStep);
  //   console.log("Token X Mint:", matchingPair.account.tokenXMint.toString());
  //   console.log("Token Y Mint:", matchingPair.account.tokenYMint.toString());
    

  //   const activeBinId = matchingPair.account.activeId;
  //   const lowerBinId = activeBinId - 5; // Start 5 bins below active bin
  //   const width = 10; // Span 10 bins (covers active bin ±5)
    
  //   console.log("\n📍 Position Parameters:");
  //   console.log("Lower Bin ID:", lowerBinId);
  //   console.log("Width (bins):", width);
  //   console.log("Upper Bin ID:", lowerBinId + width);
  //   console.log("Active Bin ID:", activeBinId);
    
  //   // Generate a new keypair for the position account
  //   // Each position is a separate account owned by the user
  //   const positionKeypair = Keypair.generate();
    
  //   console.log("\n💼 Position Account:");
  //   console.log("Position Public Key:", positionKeypair.publicKey.toString());
    
  //   // Derive event authority for DLMM program
  //   const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);
    
  //   console.log("Event Authority:", eventAuthority.toString());
    
  //   try {
  //     console.log("\n🚀 Creating liquidity position...");
  //     console.log("escrow vault",escrow_vault_pda);
  //     const txSignature = await program.methods
  //       .addPostion(lowerBinId, width)
  //       .accountsStrict({
  //         lbPair: matchingPair.publicKey,
  //         vault:escrow_vault_pda,
  //         position: positionKeypair.publicKey,
  //         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //         escrow: escrowPda,
  //         dlmmProgram: METORA_PROGRAM_ID,
  //         eventAuthority: eventAuthority,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([positionKeypair])
  //       .rpc();
        
  //     console.log("✅ Position created successfully!");
  //     console.log("Transaction signature:", txSignature);
      
  //     // Wait for confirmation
  //     await provider.connection.confirmTransaction(txSignature, "confirmed");
  //     const refund=await program.methods.withdraw(new anchor.BN(1)).accountsStrict({
  //        vault:escrow_vault_pda,
  //        member:adminkeypair.publicKey,
  //        systemProgram:SystemProgram.programId,
  //        escrow:escrowPda
  //     }).signers([adminkeypair]).rpc();
  //     console.log("refund",refund);
  //     // Verify the position account was created
  //     const positionAccountInfo = await provider.connection.getAccountInfo(positionKeypair.publicKey);
      
  //     if (positionAccountInfo) {
  //       console.log("\n✅ Position Account Verified:");
  //       console.log("Owner:", positionAccountInfo.owner.toString());
  //       console.log("Data Length:", positionAccountInfo.data.length, "bytes");
  //       console.log("Lamports:", positionAccountInfo.lamports);
        
  //       // Try to fetch position data using DLMM SDK
  //       try {
  //         const dlmmPool = await DLMM.create(provider.connection, matchingPair.publicKey);
  //         const positions = await dlmmPool.getPositionsByUserAndLbPair(adminkeypair.publicKey);
          
  //         console.log("\n📊 User Positions:");
  //         console.log("Total Positions:", positions.userPositions.length);
          
  //         // Find our newly created position
  //         const newPosition = positions.userPositions.find(
  //           pos => pos.publicKey.toString() === positionKeypair.publicKey.toString()
  //         );
          
  //         if (newPosition) {
  //           console.log("\n🎯 New Position Details:");
  //           console.log("Position Address:", newPosition.publicKey.toString());
  //           console.log("Lower Bin ID:", newPosition.positionData.lowerBinId);
  //           console.log("Upper Bin ID:", newPosition.positionData.upperBinId);
  //           // console.log("Width:", newPosition.positionData.width);
  //           // console.log("Liquidity Share:", newPosition.positionData.liquidityShare.toString());
  //         }
  //       } catch (sdkError) {
  //         console.log("Note: Could not fetch position details via SDK (expected for new position)");
  //       }
  //     } else {
  //       console.log("⚠️  Warning: Position account not found after creation");
  //     }
      
  //     console.log("\n✅ Position successfully initialized!");
  //     console.log("Next steps:");
  //     console.log("  1. Add liquidity to this position using addLiquidity instruction");
  //     console.log("  2. The position will earn fees from swaps within its price range");
  //     console.log("  3. Remove liquidity later using removeLiquidity instruction");
      
  //   } catch (error: any) {
  //     console.error("\n❌ Position creation failed:", error);
      
  //     if (error.logs) {
  //       console.error("\n📋 Program Logs:");
  //       error.logs.forEach((log: string) => console.error(log));
  //     }
      
  //     if (error.message) {
  //       console.error("\n💬 Error Message:", error.message);
  //     }
      
  //     throw error;
  //   }
  // });

  // it("Add Multiple Positions with Different Ranges", async () => {
  //   /**
  //    * Test creating multiple positions with different price ranges
  //    * This simulates a liquidity provider strategy with concentrated liquidity
  //    */
    
  //   const tokenYMint = NATIVE_MINT;
  //   const tokenXMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    
  //   const allPairs = await DLMM.getLbPairs(provider.connection);
  //   const matchingPair = allPairs.find(pair => 
  //     pair.account.tokenXMint.toBase58() === tokenXMint.toBase58() &&
  //     pair.account.tokenYMint.toBase58() === tokenYMint.toBase58()
  //   );
    
  //   if (!matchingPair) {
  //     console.log("⚠️  No matching pair found");
  //     return;
  //   }
    
  //   const activeBinId = matchingPair.account.activeId;
  //   const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);
    
  //   // Define multiple position strategies
  //   const positionStrategies = [
  //     {
  //       name: "Narrow Range (Concentrated)",
  //       lowerBinId: activeBinId - 2,
  //       width: 4,
  //       description: "Tight range around current price for maximum fee capture"
  //     },
  //     {
  //       name: "Medium Range (Balanced)",
  //       lowerBinId: activeBinId - 10,
  //       width: 20,
  //       description: "Moderate range for balanced risk/reward"
  //     },
  //     {
  //       name: "Wide Range (Safe)",
  //       lowerBinId: activeBinId - 25,
  //       width: 50,
  //       description: "Wide range for lower risk, less impermanent loss"
  //     }
  //   ];
    
  //   console.log("\n📊 Creating Multiple Positions:");
  //   console.log("Active Bin ID:", activeBinId);
  //   console.log("Number of Strategies:", positionStrategies.length);
    
  //   for (let i = 0; i < positionStrategies.length; i++) {
  //     const strategy = positionStrategies[i];
  //     const positionKeypair = Keypair.generate();
      
  //     console.log(`\n[${i + 1}/${positionStrategies.length}] ${strategy.name}`);
  //     console.log("Description:", strategy.description);
  //     console.log("Lower Bin ID:", strategy.lowerBinId);
  //     console.log("Upper Bin ID:", strategy.lowerBinId + strategy.width);
  //     console.log("Width:", strategy.width);
  //     console.log("Position Address:", positionKeypair.publicKey.toString());
      
  //     try {
  //       const txSignature = await program.methods
  //         .addPostion(strategy.lowerBinId, strategy.width)
  //         .accountsStrict({
  //           lbPair: matchingPair.publicKey,
  //           vault: escrow_vault_pda,
  //           position: positionKeypair.publicKey,
  //           rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //           escrow: escrowPda,
  //           dlmmProgram: METORA_PROGRAM_ID,
  //           eventAuthority: eventAuthority,
  //           systemProgram: SystemProgram.programId,
  //         })
  //         .signers([positionKeypair])
  //         .rpc();
          
  //       console.log("✅ Position created! Signature:", txSignature);
  //       await provider.connection.confirmTransaction(txSignature, "confirmed");
        
  //     } catch (error: any) {
  //       console.error(`❌ Failed to create position: ${strategy.name}`);
  //       if (error.logs) {
  //         console.error("Error logs:", error.logs.slice(-5));
  //       }
  //       throw error;
  //     }
  //   }
    
  //   console.log("\n✅ All positions created successfully!");
  //   console.log(`Created ${positionStrategies.length} positions with different strategies`);
  // });
// it("Swap test",async()=>{
//   const escrowPda=new PublicKey("8G2A1vuFjYaRnVu8WwHu7o2RC4iBzrEdUAacshJRCQde");
//   const [escrow_vault_pda,bump]=PublicKey.findProgramAddressSync([Buffer.from("vault"),escrowPda.toBuffer()],program.programId);
//   console.log("escrow", escrowPda.toString());
//   console.log("vault", escrow_vault_pda.toString());
  
//   const tokenXMInt = NATIVE_MINT;
//   const connection = new Connection("https://api.devnet.solana.com");
//   const ymint=new PublicKey("6i6Z7twwpvr8PsCpsPujR1PgucdjpNPxAA4U7Uk2RZSk");
//   const dlmmPool = await DLMM.getLbPairs(connection);
//   const solmint = new PublicKey("So11111111111111111111111111111111111111112")
//   const vaultBalance = await connection.getBalance(escrow_vault_pda);
//   console.log(`\n💰 Vault balance: ${(vaultBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
//    const amount = 0.5 * LAMPORTS_PER_SOL;
//   if (vaultBalance < amount) {
//     console.log(`\n WARNING: Vault has insufficient SOL!`);
//     console.log(`   Need: ${(amount / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
//     console.log(`   Have: ${(vaultBalance / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
//     console.log(`\n   Please fund the vault first using your deposit instruction.`);
//     process.exit(0);
//   }
//   console.log(`✓ Vault has sufficient balance\n`);
  
//   let poolsAttempted = 0;
//   let poolsWithQuotes = 0;
  
//   for (let i = 0; i < dlmmPool.length; i++) {
//     const poolData = dlmmPool[i].account;
//     const pool = dlmmPool[i].publicKey;
//     if (poolData.tokenXMint.equals(solmint) && poolData.tokenYMint.equals(ymint) ||poolData.tokenXMint.equals(ymint)&& poolData.tokenYMint.equals(solmint)) {
//       const isTokenXSol = poolData.tokenXMint.equals(solmint);
//       const swapXforY = isTokenXSol; 
//       const outTokenMint = isTokenXSol ? poolData.tokenYMint : poolData.tokenXMint;
//       console.log(`\n${'='.repeat(60)}`);
//       console.log(`[Pool ${++poolsAttempted}]: ${pool.toBase58()}`);
//       console.log(`Target: SOL → ${outTokenMint.toBase58().slice(0, 12)}...`);
//       try {
//         const dlmmPools = await DLMM.create(connection, pool);
  
//         const binArrays = await dlmmPools.getBinArrayForSwap(swapXforY, 20);
        
//         const swapQuote = dlmmPools.swapQuote(
//           new anchor.BN(amount),
//           swapXforY,
//           new anchor.BN(100),
//           binArrays,
//           false,
//           2
//         );
  
//         poolsWithQuotes++;
//         console.log(`✓ Quote: ${(swapQuote.minOutAmount.toNumber() / 1e9).toFixed(6)} tokens`);
        
//            const vaulta = await getAssociatedTokenAddress(poolData.tokenXMint, escrowPda, true);
//         const vaultb = await getAssociatedTokenAddress(poolData.tokenYMint, escrowPda, true);
        
//         const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);
  
//         const poolAccountInfo = await connection.getAccountInfo(pool);
//         let bitmapExtensionToUse = null;
        
      
//         // const vaultaInfo = await provider.connection.getAccountInfo(vaulta);
//         // if (!vaultaInfo) {
//         //   console.log("Creating vaulta...");
//         //   const createVaultaTx = new Transaction().add(
//         //     createAssociatedTokenAccountInstruction(
//         //       adminkeypair.publicKey,
//         //       vaulta,
//         //       escrowPda,
//         //       poolData.tokenXMint
//         //     )
//         //   );
//         //   await sendAndConfirmTransaction(provider.connection, createVaultaTx, [adminkeypair]);
//         //   console.log("✓ Vaulta created");
//         // }
//         // const vaultbInfo = await provider.connection.getAccountInfo(vaultb);
//         // if (!vaultbInfo) {
//         //   console.log("Creating vaultb...");
//         //   const createVaultbTx = new Transaction().add(
//         //     createAssociatedTokenAccountInstruction(
//         //       adminkeypair.publicKey,
//         //       vaultb,
//         //       escrowPda,
//         //       poolData.tokenYMint
//         //     )
//         //   );
//         //   await sendAndConfirmTransaction(provider.connection, createVaultbTx, [adminkeypair]);
//         //   console.log("✓ Vaultb created");
//         // }
        
//         const userTokenIn = swapXforY ? vaulta : vaultb;
//         const userTokenOut = swapXforY ? vaultb : vaulta;
        
//         console.log(`Using: ${swapXforY ? 'vaulta → vaultb' : 'vaultb → vaulta'}`);
        
//         const binArrayAccounts = binArrays.map(binArray => ({
//           pubkey: binArray.publicKey,
//           isSigner: false,
//           isWritable: true,
//         }));
        
//         console.log(`🔄 Submitting swap transaction...`);
    
//           const swapTx = await program.methods
//             .swap(new anchor.BN(amount), swapQuote.minOutAmount)
//             .accountsStrict({
//               lbPair: dlmmPools.pubkey,
//               userTokenIn: userTokenIn,
//               userTokenOut: userTokenOut,
//               tokenProgram: TOKEN_PROGRAM_ID,
//               tokenXMint: poolData.tokenXMint,
//               tokenXProgram: TOKEN_PROGRAM_ID,
//               tokenYMint: poolData.tokenYMint,
//               tokenYProgram: TOKEN_PROGRAM_ID,
//               hostFeeIn: null,
//               binArrayBitmapExtension: bitmapExtensionToUse,
//               escrow: escrowPda,
//               vaulta: vaulta,
//               vaultb: vaultb,
//               reserveX: poolData.reserveX,
//               reserveY: poolData.reserveY,
//               oracle: poolData.oracle,
//               dlmmProgram: METORA_PROGRAM_ID,
//               eventAuthority: eventAuthority,
//               vault: escrow_vault_pda,
//               systemProgram: SystemProgram.programId,
//             associatedTokenProgram:ASSOCIATED_TOKEN_PROGRAM_ID
//             })
//             .remainingAccounts(binArrayAccounts)
//             .rpc();
          
//        console.log("tx",swapTx);
//         break;
  
//       } catch (error: any) {
//         const errorMsg = error.message || error.toString() || "Unknown error";
        
//         console.error("\n❌ Full Error Details:");
//         console.error("Error:", error);
//         console.error("Error Message:", errorMsg);
        
//         if (error.logs) {
//           console.error("\n📋 Program Logs:");
//           error.logs.forEach((log: string) => console.error(log));
//         }
//         if (error.programErrorStack) {
//           console.error("\n🔍 Program Error Stack:");
//           console.error(JSON.stringify(error.programErrorStack, null, 2));
//         }
//         if (error.error) {
//           console.error("\n⚠️ Error Object:");
//           console.error(JSON.stringify(error.error, null, 2));
//         }
//         if (error.transactionLogs) {
//           console.error("\n📝 Transaction Logs:");
//           error.transactionLogs.forEach((log: string) => console.error(log));
//         }
        
//         // Categorized error messages
//         if (errorMsg.includes("INSUFFICIENT_LIQUIDITY") || errorMsg.includes("insufficient liquidity")) {
//           console.log(`❌ No liquidity`);
//         } else if (errorMsg.includes("Cross-program")) {
//           console.log(`❌ CPI error (likely SOL wrapping issue)`);
//         } else if (errorMsg.includes("BitmapExtensionAccountIsNotProvided") || errorMsg.includes("0x1794")) {
//           console.log(`❌ Requires bitmap extension`);
//         } else if (errorMsg.includes("incorrect program id")) {
//           console.log(`❌ Token2022 mint (not supported)`);
//         } else {
//           console.log(`❌ ${errorMsg.slice(0, 100)}`);
//         }
//         console.error("\n");
//       }
      
//       // Stop after 30 attempts
//       if (poolsAttempted >= 30) {
//         console.log(`\n⚠️  Stopped after checking 30 pools`);
//         break;
//       }
//     }
//   }
  
//   console.log(`\n${'='.repeat(60)}`);
//   console.log(`📊 Summary:`);
//   console.log(`   Total pools checked: ${poolsAttempted}`);
//   console.log(`   Pools with quotes: ${poolsWithQuotes}`);
//   console.log(`\n💡 Most devnet pools require bitmap extensions or have low liquidity.`);
//   console.log(`   Try on mainnet for better results, or find specific pools with liquidity.`);
// })

// it("Add Liquidity test", async () => {
//   console.log("escrow", escrowPda.toString());
//   console.log("vault", escrow_vault_pda.toString());
  
//   const connection = new Connection("https://api.devnet.solana.com");
//   const dlmmPool = await DLMM.getLbPairs(connection);
//   const solmint = new PublicKey("So11111111111111111111111111111111111111112");
  
//   const vaultBalance = await connection.getBalance(escrow_vault_pda);
//   console.log(`\n💰 Vault balance: ${(vaultBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
//   const amountX = 0.1 * LAMPORTS_PER_SOL;
//   const amountY = 0.1 * LAMPORTS_PER_SOL;
  
//   if (vaultBalance < amountX + amountY) {
//     console.log(`\n⚠️ WARNING: Vault has insufficient SOL!`);
//     console.log(`   Need: ${((amountX + amountY) / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
//     console.log(`   Have: ${(vaultBalance / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
//     console.log(`\n   Please fund the vault first using your deposit instruction.`);
//     process.exit(0);
//   }
//   console.log(`✓ Vault has sufficient balance\n`);
  
//   let poolsAttempted = 0;
//   let poolsWithQuotes = 0;
//   const ymint=new PublicKey("6i6Z7twwpvr8PsCpsPujR1PgucdjpNPxAA4U7Uk2RZSk");
//   for (let i = 0; i < dlmmPool.length; i++) {
//     const poolData = dlmmPool[i].account;
//     const pool = dlmmPool[i].publicKey;
//     if (poolData.tokenXMint.equals(solmint) && poolData.tokenYMint.equals(ymint) ||poolData.tokenXMint.equals(ymint)&& poolData.tokenYMint.equals(solmint)) {
//       const isTokenXSol = poolData.tokenXMint.equals(solmint);
//       const outTokenMint = isTokenXSol ? poolData.tokenYMint : poolData.tokenXMint;
//       console.log(`\n${'='.repeat(60)}`);
//       console.log(`[Pool ${++poolsAttempted}]: ${pool.toBase58()}`);
//       console.log(`Target: SOL + ${outTokenMint.toBase58().slice(0, 12)}...`);
//       try {
//         const dlmmPools = await DLMM.create(connection, pool);
//         const activeBinId = poolData.activeId;
//         const lowerBinId = activeBinId - 5;
//         const upperBinId = activeBinId + 5;
//         const positionKeypair = Keypair.generate();
//         const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);
        
//         console.log(`📍 Creating position at bins ${lowerBinId} to ${upperBinId}...`);
        
//         const createPositionTx = await program.methods
//           .addPostion(lowerBinId, 10)
//           .accountsStrict({
//             lbPair: pool,
//             position: positionKeypair.publicKey,
//             rent: anchor.web3.SYSVAR_RENT_PUBKEY,
//             escrow: escrowPda,
//             vault: escrow_vault_pda,
//             dlmmProgram: METORA_PROGRAM_ID,
//             eventAuthority: eventAuthority,
//             systemProgram: SystemProgram.programId,
//           })
//           .signers([positionKeypair])
//           .rpc();
        
//         await connection.confirmTransaction(createPositionTx, "confirmed");
//         console.log(`✓ Position created: ${positionKeypair.publicKey.toBase58()}`);
        
        
//         const lowerBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(lowerBinId));
//         const upperBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(upperBinId));
        
//         const [binArrayLower] = deriveBinArray(pool, lowerBinArrayIndex, METORA_PROGRAM_ID);
//         const [binArrayUpper] = deriveBinArray(pool, upperBinArrayIndex, METORA_PROGRAM_ID);
//         const tokenXMintInfo = await connection.getAccountInfo(poolData.tokenXMint);
//         const tokenYMintInfo = await connection.getAccountInfo(poolData.tokenYMint);
//         console.log(tokenXMintInfo);
//         console.log(tokenYMintInfo);
//                 const tokenXProgramId = tokenXMintInfo?.owner || TOKEN_PROGRAM_ID;
//         const tokenYProgramId = tokenYMintInfo?.owner || TOKEN_PROGRAM_ID;
      
//         const vaulta = await getAssociatedTokenAddress(poolData.tokenXMint,escrowPda,true,tokenXProgramId);
//         const vaultb = await getAssociatedTokenAddress(poolData.tokenYMint,escrowPda,true,tokenYProgramId);
//        console.log("escrow pda",escrowPda);

//         const poolAccountInfo = await connection.getAccountInfo(pool);
//         let bitmapExtensionToUse = null;
        
      
//         const liquidityParameter = {
//           amountX: new anchor.BN(amountX),
//           amountY: new anchor.BN(amountY),
//           binLiquidityDist: [
//             { binId: activeBinId, distributionX: 50, distributionY: 50 }
//           ]
//         };
 
//         console.log(`💧 Adding liquidity...`);
        
//         const addLiquidityTx = await program.methods
//           .addLiquidity(liquidityParameter)
//           .accountsStrict({
//             lbPair: pool,
//             position: positionKeypair.publicKey,
//             binArrayBitmapExtension: bitmapExtensionToUse,
//             escrow: escrowPda,
//             reserveX: poolData.reserveX,
//             reserveY: poolData.reserveY,
//             binArrayLower: binArrayLower,
//             binArrayUpper: binArrayUpper,
//             vault: escrow_vault_pda,
//             vaulta: vaulta,
//             vaultb: vaultb,
//             tokenXMint: poolData.tokenXMint,
//             tokenYMint: poolData.tokenYMint,
//             dlmmProgram: METORA_PROGRAM_ID,
//             eventAuthority: eventAuthority,
//             tokenXProgram: tokenXProgramId,
//             tokenYProgram: tokenYProgramId,
//             tokenProgram: TOKEN_PROGRAM_ID,
//             systemProgram: SystemProgram.programId,
//             associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//           })
//           .rpc();
        
//         console.log(`Liquidity added! Tx: ${addLiquidityTx}`);
//         poolsWithQuotes++;
//         break;
        
//       } catch (error: any) {
//         const errorMsg = error.message || error.toString() || "Unknown error";
        
//         console.error("\n❌ Full Error Details:");
//         console.error("Error:", error);
//         console.error("Error Message:", errorMsg);
        
//         if (error.logs) {
//           console.error("\n📋 Program Logs:");
//           error.logs.forEach((log: string) => console.error(log));
//         }
        
//         if (errorMsg.includes("BitmapExtensionAccountIsNotProvided") || errorMsg.includes("0x1794")) {
//           console.log(`❌ Requires bitmap extension`);
//         } else if (errorMsg.includes("incorrect program id")) {
//           console.log(`❌ Token2022 mint (not supported)`);
//         } else {
//           console.log(`❌ ${errorMsg.slice(0, 100)}`);
//         }
//         console.error("\n");
//       }
      
//       if (poolsAttempted >= 30) {
//         console.log(`\n⚠️ Stopped after checking 30 pools`);
//         break;
//       }
//     }
//   }
  
//   console.log(`\n${'='.repeat(60)}`);
//   console.log(`📊 Summary:`);
//   console.log(`   Total pools checked: ${poolsAttempted}`);
//   console.log(`   Successful liquidity additions: ${poolsWithQuotes}`);
//   console.log(`\n💡 Most devnet pools require bitmap extensions or have low liquidity.`);
//   console.log(`   Try on mainnet for better results, or find specific pools with liquidity.`);
// });
it("Add Liquidity with Bin Array Management", async () => {    
  const tokenYMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
  const tokenXMint = NATIVE_MINT; 
  console.log("Finding LP Pair...");
  const secretKeyArray2 = [174,70,95,178,70,166,25,216,124,162,189,78,48,118,32,164,207,194,42,216,57,126,67,186,232,204,104,173,172,247,41,136,26,0,127,191,26,115,1,50,172,196,82,192,124,190,83,122,116,127,96,102,198,66,197,81,67,94,196,203,151,16,230,130]; 
  const secretarray2=new Uint8Array(secretKeyArray2); 
  const adminkeypair= Keypair.fromSecretKey(secretarray2);
  const seed = 1;
  const [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      adminkeypair.publicKey.toBuffer(),
      Buffer.from(new anchor.BN(seed).toArrayLike(Buffer, "le", 8)),
    ],
    program.programId
  );
  const [escrow_vault_pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), escrowPda.toBuffer()],
    program.programId
  );
  console.log("Escrow PDA:", escrowPda.toString());
  console.log("Escrow Vault PDA:", escrow_vault_pda.toString())
  const allPairs = await DLMM.getLbPairs(provider.connection);
  let targetPair = allPairs.find(pair => 
    (pair.account.tokenXMint.toBase58() === tokenXMint.toBase58() &&
     pair.account.tokenYMint.toBase58() === tokenYMint.toBase58()) ||
    (pair.account.tokenXMint.toBase58() === tokenYMint.toBase58() &&
     pair.account.tokenYMint.toBase58() === tokenXMint.toBase58())
  );
  if (!targetPair) {
    console.log("No matching pair found");
    return;
  }
  
  console.log("Target Pool (for liquidity):", targetPair.publicKey.toBase58());
  console.log("Target Token:", tokenYMint.toBase58());
  
  const tokenXMintInfo = await provider.connection.getAccountInfo(tokenXMint);
  const tokenYMintInfo = await provider.connection.getAccountInfo(tokenYMint);
  const tokenXProgramId = tokenXMintInfo?.owner || TOKEN_PROGRAM_ID;
  const tokenYProgramId = tokenYMintInfo?.owner || TOKEN_PROGRAM_ID;
  
  if (tokenXProgramId.toString() !== TOKEN_PROGRAM_ID.toString() ||
      tokenYProgramId.toString() !== TOKEN_PROGRAM_ID.toString()) {
    console.log("❌ Skipping: Pool uses Token-2022 (not supported)");
    return;
  }
   let activeBinId = targetPair.account.activeId;
  let lowerBinId = activeBinId - 24;
  let width = 48;
  let positionKeypair = Keypair.generate();
  console.log("Position:", positionKeypair.publicKey.toBase58());
  let [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);
  
  const createPositionTx = await program.methods
    .addPostion(lowerBinId, width)
    .accountsStrict({
      lbPair: targetPair.publicKey, 
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
    
  console.log("✅ Position created! Signature:", createPositionTx);
  await provider.connection.confirmTransaction(createPositionTx, "confirmed");
  
  let upperBinId = lowerBinId + width - 1;
  let lowerBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(lowerBinId));
  let upperBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(upperBinId));
  
  let [binArrayLower] = deriveBinArray(
    targetPair.publicKey,
    lowerBinArrayIndex,
    METORA_PROGRAM_ID
  );
  
  let [binArrayUpper] = deriveBinArray(
    targetPair.publicKey,
    upperBinArrayIndex,
    METORA_PROGRAM_ID
  );
  
  const ensureBinArrayExists = async (
    label: string,
    binArrayPubkey: PublicKey,
    binArrayIndex: anchor.BN
  ) => {
    const existing = await provider.connection.getAccountInfo(binArrayPubkey);
    if (existing) {
      console.log(`✓ ${label} bin array already exists:`, binArrayPubkey.toBase58());
      return;
    }

    console.log(`⚠️  ${label} bin array missing (${binArrayIndex.toString()}), creating...`);
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 });
    try {
      const sig = await program.methods
        .addBin(binArrayIndex)
        .accountsStrict({
          lbPair: targetPair.publicKey,
          binArray: binArrayPubkey,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
          dlmmProgram: METORA_PROGRAM_ID,
          vault: escrow_vault_pda
        })
        .preInstructions([computeBudgetIx])
        .rpc();
      await provider.connection.confirmTransaction(sig, "confirmed");
      console.log(`✅ ${label} bin array created:`, sig);
    } catch (err: any) {
      console.log(`Note: ${label} bin array creation issue:`, err.message);
    }
  };

  await ensureBinArrayExists("Lower", binArrayLower, lowerBinArrayIndex);
  await ensureBinArrayExists("Upper", binArrayUpper, upperBinArrayIndex);

  if (binArrayLower.equals(binArrayUpper)) {
    console.log("⚠️  Lower/upper bin arrays identical. Deriving placeholder upper to avoid double borrow...");
    const placeholderIndex = upperBinArrayIndex.add(new anchor.BN(1));
    [binArrayUpper] = deriveBinArray(
      targetPair.publicKey,
      placeholderIndex,
      METORA_PROGRAM_ID
    );
    await ensureBinArrayExists("Placeholder upper", binArrayUpper, placeholderIndex);
  }
  
  console.log("\nTarget Pool Bin Arrays:");
  console.log("Lower Bin Array:", binArrayLower.toString());
  console.log("Upper Bin Array:", binArrayUpper.toString());

  const targetVaultX = await getAssociatedTokenAddress(targetPair.account.tokenXMint, escrowPda, true);
  const targetVaultY = await getAssociatedTokenAddress(targetPair.account.tokenYMint, escrowPda, true);
  

  
  // === CHECK BALANCES ===
  const tokenXVaultAccount = await provider.connection.getTokenAccountBalance(targetVaultX);
  const tokenYVaultAccount = await provider.connection.getTokenAccountBalance(targetVaultY);
  
  const tokenXBalance = new anchor.BN(tokenXVaultAccount.value.amount);
  const tokenYBalance = new anchor.BN(tokenYVaultAccount.value.amount);
  
  console.log("\nTarget Pool Vault Balances:");
  console.log("Token X balance:", tokenXBalance.toString(), `(${targetPair.account.tokenXMint.toBase58().slice(0, 8)}...)`);
  console.log("Token Y balance:", tokenYBalance.toString(), `(${targetPair.account.tokenYMint.toBase58().slice(0, 8)}...)`);

  const amountX = tokenXBalance.mul(new anchor.BN(90)).div(new anchor.BN(100));
  const amountY = tokenYBalance.mul(new anchor.BN(90)).div(new anchor.BN(100));
  
  console.log("\nLiquidity Parameters (50/50):");
  console.log("Amount X to deposit:", amountX.toString());
  console.log("Amount Y to deposit:", amountY.toString());
  console.log("Active Bin ID:", activeBinId);
  
  const targetBinId = activeBinId;
  
  const liquidityParameter = {
    amountX: amountX,
    amountY: amountY,
    binLiquidityDist: [
      {
        binId: targetBinId,
        distributionX: 5000, // 50%
        distributionY: 5000, // 50%
      }
    ],
  };
  
  console.log("\nDistribution:");
  console.log("Target Bin ID:", targetBinId);
  console.log("Distribution: 50% X, 50% Y");
  
  try {
    console.log("\nAdding liquidity to TARGET pool...");
  
    const sameBinArray = binArrayLower.equals(binArrayUpper);
    console.log("lower",binArrayLower);
    console.log("uppe",binArrayUpper);
    const txSignature = await program.methods
      .addLiquidity(liquidityParameter)
      .accountsStrict({
        lbPair: targetPair.publicKey,
        position: positionKeypair.publicKey,
        binArrayBitmapExtension: null,
        reserveX: targetPair.account.reserveX,
        reserveY: targetPair.account.reserveY,
        binArrayLower: binArrayLower,
        binArrayUpper: sameBinArray ? binArrayLower : binArrayUpper,
        vaulta: targetVaultX,
        vaultb: targetVaultY,
        tokenXMint: targetPair.account.tokenXMint,
        tokenYMint: targetPair.account.tokenYMint,
        vault: escrow_vault_pda,
        escrow: escrowPda,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        tokenXProgram: tokenXProgramId,
        tokenYProgram: tokenYProgramId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
      })
      .rpc();
      
    console.log("✅ Liquidity added successfully!");
    console.log("Transaction signature:", txSignature);
    
    await provider.connection.confirmTransaction(txSignature, "confirmed");
    
    console.log("\nRemoving liquidity...");
    
    const removeLiquidityTx = await program.methods
      .removeLiqudity([{ binId: targetBinId, bpsToRemove: 10000 }])
      .accountsStrict({
        lbPair: targetPair.publicKey,
        binArrayBitmapExtension: null,
        position: positionKeypair.publicKey,
        reserveX: targetPair.account.reserveX,
        reserveY: targetPair.account.reserveY,
        escrow: escrowPda,
        vault: escrow_vault_pda,
        vaulta: targetVaultX,
        vaultb: targetVaultY,
        tokenXMint: targetPair.account.tokenXMint,
        tokenYMint: targetPair.account.tokenYMint,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        tokenXProgram: tokenXProgramId,
        tokenYProgram: tokenYProgramId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    console.log("✅ Liquidity removed! Signature:", removeLiquidityTx);
    
    const close = await program.methods
      .closePosition()
      .accountsStrict({
        lbPair: targetPair.publicKey,
        position: positionKeypair.publicKey,
        binArrayLower: binArrayLower,
        binArrayUpper: binArrayUpper,
        escrow: escrowPda,
        dlmmProgram: METORA_PROGRAM_ID,
        eventAuthority: eventAuthority,
        vault: escrow_vault_pda
      })
      .rpc();

    console.log("✅ Position closed! Tx:", close);
    console.log("\n✅ SUCCESS! Full test completed.");
    
  } catch (error: any) {
    console.error("\n❌ Add liquidity failed:", error);
    if (error.logs) {
      console.error("\n📋 Program Logs:");
      error.logs.forEach((log: string) => console.error(log));
    }
    throw error;
  }
});
  // it("Close DLMM Position (no liquidity)", async () => {
  //   const tokenXMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
  //   const tokenYMint = NATIVE_MINT; // WSOL
  //   const allPairs = await DLMM.getLbPairs(provider.connection);
  //   const matchingPair = allPairs.find(pair => 
  //     pair.account.tokenXMint.toBase58() === tokenXMint.toBase58() &&
  //     pair.account.tokenYMint.toBase58() === tokenYMint.toBase58()
  //   );
  //   if (!matchingPair) {
  //     console.log("⚠️  No matching pair found");
  //     return;
  //   }

  //   // Create an empty position (no liquidity added)
  //   const activeBinId = matchingPair.account.activeId;
  //   const lowerBinId = activeBinId - 5;
  //   const width = 10;
  //   const positionKeypair = Keypair.generate();
  //   const [eventAuthority] = deriveEventAuthority(METORA_PROGRAM_ID);

  //   await program.methods
  //     .addPostion(lowerBinId, width)
  //     .accountsStrict({
  //       lbPair: matchingPair.publicKey,
  //       owner: adminkeypair.publicKey,
  //       position: positionKeypair.publicKey,
  //       rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //       user: adminkeypair.publicKey,
  //       dlmmProgram: METORA_PROGRAM_ID,
  //       eventAuthority: eventAuthority,
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .signers([adminkeypair, positionKeypair])
  //     .rpc();

  //   // Derive bin arrays for the position range
  //   const upperBinId = lowerBinId + width - 1;
  //   const lowerBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(lowerBinId));
  //   const upperBinArrayIndex = binIdToBinArrayIndex(new anchor.BN(upperBinId));
  //   const [binArrayLower] = deriveBinArray(matchingPair.publicKey, lowerBinArrayIndex, METORA_PROGRAM_ID);
  //   const [binArrayUpper] = deriveBinArray(matchingPair.publicKey, upperBinArrayIndex, METORA_PROGRAM_ID);

  //   // Ensure bin arrays exist (DLMM may require the accounts)
  //   const lowerInfo = await provider.connection.getAccountInfo(binArrayLower);
  //   if (!lowerInfo) {
  //     try {
  //       const sig = await program.methods
  //         .addBin(new anchor.BN(lowerBinArrayIndex.toNumber()))
  //         .accountsStrict({
  //           lbPair: matchingPair.publicKey,
  //           binArray: binArrayLower,
  //           funder: adminkeypair.publicKey,
  //           systemProgram: SystemProgram.programId,
  //           dlmmProgram: METORA_PROGRAM_ID,
  //         })
  //         .signers([adminkeypair])
  //         .rpc();
  //       await provider.connection.confirmTransaction(sig, "confirmed");
  //     } catch {}
  //   }
  //   const upperInfo = await provider.connection.getAccountInfo(binArrayUpper);
  //   if (!upperInfo && !binArrayUpper.equals(binArrayLower)) {
  //     try {
  //       const sig = await program.methods
  //         .addBin(new anchor.BN(upperBinArrayIndex.toNumber()))
  //         .accountsStrict({
  //           lbPair: matchingPair.publicKey,
  //           binArray: binArrayUpper,
  //           funder: adminkeypair.publicKey,
  //           systemProgram: SystemProgram.programId,
  //           dlmmProgram: METORA_PROGRAM_ID,
  //         })
  //         .signers([adminkeypair])
  //         .rpc();
  //       await provider.connection.confirmTransaction(sig, "confirmed");
  //     } catch {}
  //   }

  //   // Close the empty position
  //   const closeSig = await program.methods
  //     .closePosition()
  //     .accountsStrict({
  //       lbPair: matchingPair.publicKey,
  //       owner: adminkeypair.publicKey,
  //       binArrayLower: binArrayLower,
  //       rentReciver: adminkeypair.publicKey,
  //       binArrayUpper: binArrayUpper,
  //       position: positionKeypair.publicKey,
  //       user: adminkeypair.publicKey,
  //       dlmmProgram: METORA_PROGRAM_ID,
  //       eventAuthority: eventAuthority,
  //     })
  //     .signers([adminkeypair])
  //     .rpc();

  //   console.log("✅ Position closed!", closeSig);
  //   await provider.connection.confirmTransaction(closeSig, "confirmed");
  // });

});


     