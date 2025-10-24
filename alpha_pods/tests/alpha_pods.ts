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
    // await provider.connection.requestAirdrop(admin.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    // await provider.connection.requestAirdrop(member1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    // await provider.connection.requestAirdrop(member2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    // await provider.connection.requestAirdrop(member3.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
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
    expect(escrowAccount.admin.toString()).to.equal(admin.publicKey.toString());
    
    expect(escrowAccount.seed.toNumber()).to.equal(seed);
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
