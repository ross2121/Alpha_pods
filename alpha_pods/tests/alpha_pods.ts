import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AlphaPods } from "../target/types/alpha_pods";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("alpha_pods", () => {
  // Configure the client to use the local cluster.
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

  before(async () => {

    admin = Keypair.generate();
    member1 = Keypair.generate();
    member2 = Keypair.generate();
    member3 = Keypair.generate();
    seed = Math.floor(Math.random() * 1000000);

    // Airdrop SOL to admin
    await provider.connection.requestAirdrop(admin.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(member1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(member2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(member3.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);

    // Find escrow PDA
    [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        admin.publicKey.toBuffer(),
        Buffer.from(seed.toString()),
      ],
      program.programId
    );
  });

  it("Initialize escrow", async () => {
    const members = [member1.publicKey, member2.publicKey, member3.publicKey];
    const threshold = 5;

    const tx = await program.methods
      .initialize(new anchor.BN(seed), members, new anchor.BN(threshold))
      .accountsStrict({
        admin: admin.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
    console.log("Initialize transaction signature:", tx);

  
    const escrowAccount = await program.account.initializeAdmin.fetch(escrowPda);
    expect(escrowAccount.admin.toString()).to.equal(admin.publicKey.toString());
    expect(escrowAccount.threshold).to.equal(threshold);
    expect(escrowAccount.members.length).to.equal(3);
    expect(escrowAccount.seed).to.equal(seed);
  });

  it("Add member", async () => {
    const newMember = Keypair.generate();
    await provider.connection.requestAirdrop(newMember.publicKey, anchor.web3.LAMPORTS_PER_SOL);

    const tx = await program.methods
      .addMember(newMember.publicKey)
      .accountsStrict({
        admin: admin.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    console.log("Add member transaction signature:", tx);

    // Verify member was added
    const escrowAccount = await program.account.initializeAdmin.fetch(escrowPda);
    expect(escrowAccount.members.length).to.equal(4);
    expect(escrowAccount.members[3].publicKey.toString()).to.equal(newMember.publicKey.toString());
  });

  it("Remove member", async () => {
    const tx = await program.methods
      .removeMember(member3.publicKey)
      .accountsStrict({
        admin: admin.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    console.log("Remove member transaction signature:", tx);

    // Verify member was removed
    const escrowAccount = await program.account.initializeAdmin.fetch(escrowPda);
    expect(escrowAccount.members.length).to.equal(3);
  });

  it("Deposit SOL", async () => {
    const depositAmount = 0.5; // SOL
    const lamports = depositAmount * anchor.web3.LAMPORTS_PER_SOL;

    const tx = await program.methods
      .depositSol(new anchor.BN(lamports))
      .accountsStrict({
        admin: admin.publicKey,
        member: member1.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin, member1])
      .rpc();

    console.log("Deposit SOL transaction signature:", tx);

    // Verify deposit was recorded
    const escrowAccount = await program.account.initializeAdmin.fetch(escrowPda);
    const member = escrowAccount.members.find(m => m.publicKey.toString() === member1.publicKey.toString());
    expect(member?.amount.toNumber()).to.equal(lamports);
  });

  it("Withdraw SOL", async () => {
    const withdrawAmount = 0.2; // SOL
    const lamports = withdrawAmount * anchor.web3.LAMPORTS_PER_SOL;

    const initialBalance = await provider.connection.getBalance(member1.publicKey);

    const tx = await program.methods
      .withdrawSol(new anchor.BN(lamports))
      .accountsStrict({
        member: member1.publicKey,
        escrow: escrowPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([member1])
      .rpc();

    console.log("Withdraw SOL transaction signature:", tx);

    // Verify withdrawal
    const finalBalance = await provider.connection.getBalance(member1.publicKey);
    expect(finalBalance).to.be.greaterThan(initialBalance);

    // Verify member balance was updated
    const escrowAccount = await program.account.initializeAdmin.fetch(escrowPda);
    const member = escrowAccount.members.find(m => m.publicKey.toString() === member1.publicKey.toString());
    expect(member?.amount.toNumber()).to.equal(0.3 * anchor.web3.LAMPORTS_PER_SOL);
  });

  it("Fail to add member with non-admin", async () => {
    const newMember = Keypair.generate();

    try {
      await program.methods
        .addMember(newMember.publicKey)
        .accountsStrict({
          admin: member1.publicKey, // Using member instead of admin
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
    await provider.connection.requestAirdrop(nonMember.publicKey, anchor.web3.LAMPORTS_PER_SOL);

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
