import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AlphaPods } from "../target/types/alpha_pods";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("alpha_pods", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.alphaPods as Program<AlphaPods>;
  const provider = anchor.getProvider();
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
    console.log(admin.publicKey.toBase58());
    member1 = Keypair.generate();
    member2 = Keypair.generate();
    member3 = Keypair.generate();
    seed = Math.floor(Math.random() * 1000000);
     adminkeypair=new Keypair();
   
    console.log(admin.secretKey.toString());
    [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        adminkeypair.publicKey.toBuffer(),
        Buffer.from(new anchor.BN(seed).toArrayLike(Buffer, "le", 8)),
      ],
      program.programId
    );
    console.log(escrowPda);
 
  });

  it("Initialize escrow", async () => {
    const tx = await program.methods
      .initialize(new anchor.BN(seed))
      .accountsStrict({
        admin: adminkeypair.publicKey,
        creator:admin.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin,adminkeypair])
      .rpc();
    console.log("Initialize transaction signature:", tx);
    const escrowAccount = await program.account.initializeAdmin.fetch(escrowPda);
   
  });

  it("Deposit SOL to escrow", async () => {
    const depositAmount = 0.5; // SOL
    const lamports = depositAmount * anchor.web3.LAMPORTS_PER_SOL;

    // Get initial balances
    const initialMemberBalance = await provider.connection.getBalance(member1.publicKey);
    const initialEscrowBalance = await provider.connection.getBalance(escrowPda);

    console.log("Initial member balance:", initialMemberBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    console.log("Initial escrow balance:", initialEscrowBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

    // Deposit SOL to escrow
    const tx = await program.methods
      .depositSol(new anchor.BN(depositAmount))
      .accountsStrict({
        member: member1.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([member1])
      .rpc();

    console.log("Deposit transaction signature:", tx);

    // Get final balances
    const finalMemberBalance = await provider.connection.getBalance(member1.publicKey);
    const finalEscrowBalance = await provider.connection.getBalance(escrowPda);

    console.log("Final member balance:", finalMemberBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    console.log("Final escrow balance:", finalEscrowBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

    // Verify the deposit worked
    expect(finalEscrowBalance).to.be.greaterThan(initialEscrowBalance);
    expect(finalMemberBalance).to.be.lessThan(initialMemberBalance);
    
    // Verify the exact amount was transferred (accounting for transaction fees)
    const expectedEscrowIncrease = lamports;
    const actualEscrowIncrease = finalEscrowBalance - initialEscrowBalance;
    expect(actualEscrowIncrease).to.equal(expectedEscrowIncrease);
  });

  it("Deposit SOL from multiple members", async () => {
    const depositAmount1 = 0.3; // SOL from member2
    const depositAmount2 = 0.2; // SOL from member3
    const lamports1 = depositAmount1 * anchor.web3.LAMPORTS_PER_SOL;
    const lamports2 = depositAmount2 * anchor.web3.LAMPORTS_PER_SOL;

    // Get initial escrow balance
    const initialEscrowBalance = await provider.connection.getBalance(escrowPda);
    console.log("Initial escrow balance:", initialEscrowBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

    // First deposit from member2
    const tx1 = await program.methods
      .depositSol(new anchor.BN(depositAmount1))
      .accountsStrict({
        member: member2.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([member2])
      .rpc();

    console.log("First deposit transaction signature:", tx1);

    // Second deposit from member3
    const tx2 = await program.methods
      .depositSol(new anchor.BN(depositAmount2))
      .accountsStrict({
        member: member3.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([member3])
      .rpc();

    console.log("Second deposit transaction signature:", tx2);

    // Get final escrow balance
    const finalEscrowBalance = await provider.connection.getBalance(escrowPda);
    console.log("Final escrow balance:", finalEscrowBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");

    // Verify both deposits worked
    const totalDeposited = lamports1 + lamports2;
    const actualIncrease = finalEscrowBalance - initialEscrowBalance;
    expect(actualIncrease).to.equal(totalDeposited);
    console.log("Total deposited:", totalDeposited / anchor.web3.LAMPORTS_PER_SOL, "SOL");
  });

  it("Fail to deposit with non-member", async () => {
    const nonMember = Keypair.generate();
    await provider.connection.requestAirdrop(nonMember.publicKey, anchor.web3.LAMPORTS_PER_SOL);

    const depositAmount = 0.1; // SOL

    try {
      await program.methods
        .depositSol(new anchor.BN(depositAmount))
        .accountsStrict({
          member: nonMember.publicKey,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([nonMember])
        .rpc();

      expect.fail("Should have failed - non-member cannot deposit");
    } catch (error) {
      console.log("Expected error:", error.message);
      expect(error.message).to.include("AccountNotEnoughKeys");
    }
  });

  it("Fail to deposit more than balance", async () => {
    const depositAmount = 10.0; // SOL - more than member has

    try {
      await program.methods
        .depositSol(new anchor.BN(depositAmount))
        .accountsStrict({
          member: member1.publicKey,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([member1])
        .rpc();

      expect.fail("Should have failed - insufficient balance");
    } catch (error) {
      console.log("Expected error:", error.message);
      expect(error.message).to.include("insufficient funds");
    }
  });

  
  it("Fail to withdraw more than deposited", async () => {
    const withdrawAmount = 1.0; // SOL - more than deposited
    const lamports = withdrawAmount * anchor.web3.LAMPORTS_PER_SOL;

    try {
      await program.methods
        .withdrawSol(new anchor.BN(lamports))
        .accountsStrict({
          member: member1.publicKey,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([member1])
        .rpc();

      expect.fail("Should have failed");
    } catch (error) {
      expect(error.message).to.include("AccountNotEnoughKeys");
    }
  });

  it("Fail to withdraw with non-member", async () => {
    const nonMember = Keypair.generate();
    // await provider.connection.requestAirdrop(nonMember.publicKey, anchor.web3.LAMPORTS_PER_SOL);

    const withdrawAmount = 0.1; // SOL
    const lamports = withdrawAmount * anchor.web3.LAMPORTS_PER_SOL;

    try {
      await program.methods
        .withdrawSol(new anchor.BN(lamports))
        .accountsStrict({
          member: nonMember.publicKey,
          escrow: escrowPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([nonMember])
        .rpc();

      expect.fail("Should have failed");
    } catch (error) {
      expect(error.message).to.include("No member exist for this address");
    }
  });
});
