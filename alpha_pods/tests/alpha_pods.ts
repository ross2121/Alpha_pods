import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AlphaPods } from "../target/types/alpha_pods";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import axios from "axios";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";

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
  let escrowPda: PublicKey;
  let escrowBump: number;
  let seed: number;
  let adminkeypair:Keypair

  before(async () => {
    const secretKeyArray = [
      123,133,250,221,237,158,87,58,6,57,62,193,202,235,190,13,18,21,47,98,24,62,69,69,18,194,81,72,159,184,174,118,82,197,109,205,
      235,192,3,96,149,165,99,222,143,191,103,42,147,43,200,178,125,213,222,3,20,104,168,189,104,13,71,224
    ];
    const secretarray=new Uint8Array(secretKeyArray);
    admin = Keypair.fromSecretKey(secretarray);

    member1 = Keypair.generate();
    member2 = Keypair.generate();
    member3 = Keypair.generate();
    
    seed =58
   const secretKeyArray2 = [174,70,95,178,70,166,25,216,124,162,189,78,48,118,32,164,207,194,42,216,57,126,67,186,232,204,104,173,172,247,41,136,26,0,127,191,26,115,1,50,172,196,82,192,124,190,83,122,116,127,96,102,198,66,197,81,67,94,196,203,151,16,230,130]; 
    const secretarray2=new Uint8Array(secretKeyArray2);
    adminkeypair= Keypair.fromSecretKey(secretarray2);
    console.log("admin",adminkeypair.publicKey.toString());
    [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        adminkeypair.publicKey.toBuffer(),
        Buffer.from(new anchor.BN(seed).toArrayLike(Buffer, "le", 8)),
      ],
      program.programId
    );
    console.log("pda",escrowPda);
 
  });

  // it("Initialize escrow", async () => {
  //   const tx = await program.methods
  //     .initialize(new anchor.BN(seed))
  //     .accountsStrict({
  //       admin: adminkeypair.publicKey,
  //       creator:admin.publicKey,
  //       escrow: escrowPda,
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
  it("Quote",async()=>{
    const ORDER_URL="https://lite-api.jup.ag/ultra/v1";
     const quotemint = "So11111111111111111111111111111111111111112";
     const basemint ="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
     const amount = 0.5
     const amountInLamport=Math.floor(amount * 1e6)
     console.log("escrow",escrowPda.toString()); 
     const url = `${ORDER_URL}/order?inputMint=${basemint}&outputMint=${quotemint}&amount=${amountInLamport}&taker=${escrowPda.toString()}`;  
   try {
     const response = await axios.get(url);
     console.log("Order Response:", response.data);
     const transactionBuffer = Buffer.from(response.data.transaction, 'base64');
     const transactionArray = Array.from(transactionBuffer);
     const swap = await program.methods
     .executeSignedTx(transactionBuffer)
     .accountsStrict({
         admin: adminkeypair.publicKey,
         escrow: escrowPda,
         recipient: new PublicKey(response.data.toAccount || escrowPda.toString()),
         jupiterProgram: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
         systemProgram: SystemProgram.programId,
     })
     .signers([adminkeypair])
     .rpc();
     console.log("Swap transaction:", swap);
   } catch (error) {
     console.error("Error fetching order:", error);
     throw error;
   }
   
     
 
  })

  it("Create LP Pool", async () => {
    // Test parameters
    const minta = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"); // USDC
    const mintb = new PublicKey("DP3fit2BHZviEgKD9di8LqMeZH6HYJwRf59ebe3mKaCa"); // SOL
    const activeId = 50000; // Example bin ID
    const binStep = 20;     // 0.2% bin step (in basis points, divided by 100)
    
    // Derive PDAs for Metora
    const binStepBytes = Buffer.allocUnsafe(2);
    binStepBytes.writeUInt16LE(binStep, 0);
    
    // Sort mints lexicographically
    const mints = [minta, mintb].sort((a, b) => a.toBase58().localeCompare(b.toBase58()));
    
    // Derive LP Account PDA
      const [lpAccountPda, lpBump] = PublicKey.findProgramAddressSync(
        [mints[0].toBuffer(), mints[1].toBuffer(), binStepBytes],
        METORA_PROGRAM_ID 
      );
    console.log("LP Account PDA:", lpAccountPda.toString());
    
    // Derive Oracle PDA
    const [oraclePda, oracleBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("oracle"), lpAccountPda.toBuffer()],
      METORA_PROGRAM_ID
    );
    console.log("Oracle PDA:", oraclePda.toString());
    
    // Derive Preset Parameter PDA
    const [presetParameterPda, presetBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("preset_parameter"), binStepBytes],
      METORA_PROGRAM_ID
    );
    console.log("Preset Parameter PDA:", presetParameterPda.toString());
    
    // Derive Reserve PDAs (ATAs)
    const vaultaPda = await getAssociatedTokenAddress(minta, lpAccountPda, true);
    const vaultbPda = await getAssociatedTokenAddress(mintb, lpAccountPda, true);
    console.log("Vault A (Reserve X):", vaultaPda.toString());
    console.log("Vault B (Reserve Y):", vaultbPda.toString());
    
    // Derive member ATAs
    const memberMintaAta = await getAssociatedTokenAddress(minta, adminkeypair.publicKey);
    const memberMintbAta = await getAssociatedTokenAddress(mintb, adminkeypair.publicKey);
    const temp=Keypair.generate();
    const temp2=Keypair.generate();
    try {
      console.log("\nCalling lppool instruction...");
      const txSignature = await program.methods
        .lppool(activeId, binStep)
        .accountsStrict({
          member: adminkeypair.publicKey,
          escrow: escrowPda,
          lpAccount:lpAccountPda,
          oracle: oraclePda,
          memberMinta: memberMintaAta,
          memberMintb: memberMintbAta,
          minta: minta,
          mintb: mintb,
          vaulta: vaultaPda,
          vaultb: vaultbPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          presetParameter: presetParameterPda,
          rent: SYSVAR_RENT_PUBKEY,
          meteoraProgram: METORA_PROGRAM_ID,
          eventAuthority: EVENT_AUTHORITY,
        })
        .signers([adminkeypair])
        .rpc();
      
      console.log("Transaction successful!");
      console.log("Signature:", txSignature);
      
      // Verify accounts were created
      const lpAccountInfo = await provider.connection.getAccountInfo(lpAccountPda);
      console.log("LP Account created:", lpAccountInfo !== null);
      
    } catch (error: any) {
      console.error("Transaction failed:", error);
      if (error.logs) {
        console.error("Error logs:", error.logs);
      }
      throw error;
    }
  });

});

