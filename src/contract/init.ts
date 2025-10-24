
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js"
import dotenv from "dotenv";

import * as idl from "../idl/alpha_pods.json";
import { AlphaPods } from "../idl/alpha_pods";
dotenv.config();
const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com");
const keypair=new Keypair();
const wallet=new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
})
export const init = async (
    adminKeypair: Keypair,
) => {
    try {
        const program = new Program<AlphaPods>(idl as AlphaPods, provider)
        const escrowSeed =Math.floor(Math.random() * 1000000)
    
        const [escrowPda, escrowBump] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("escrow"),
                adminKeypair.publicKey.toBuffer(),
                Buffer.from(new anchor.BN(escrowSeed).toArrayLike(Buffer, "le", 8)),
            ],
            program.programId
        );
        console.log("Escrow PDA:", escrowPda.toBase58());
        console.log("Escrow Bump:", escrowBump);
        console.log("Seed:", escrowSeed);
        const tx = await program.methods
            .initialize(new anchor.BN(escrowSeed))
            .accountsStrict({
                admin: adminKeypair.publicKey,
                escrow: escrowPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([adminKeypair])
            .rpc();
            
        console.log("Initialize transaction signature:", tx);
        const escrowAccount = await program.account.initializeAdmin.fetch(escrowPda);
        return {
            success: true,
            transactionSignature: tx,
            escrowPda: escrowPda.toBase58(),
            escrowBump,
            seed: escrowSeed,
            account: {
                admin: escrowAccount.admin.toBase58(),
                seed: escrowAccount.seed.toNumber(),
            }
        };
        
    } catch (error) {
        console.error("Error initializing escrow:", error);
        return {
            success: false,
    
        };
    }
};
export const createAdminKeypair = (secretKey: number[]): Keypair => {
    const secretKeyArray = new Uint8Array(secretKey);
    return Keypair.fromSecretKey(secretKeyArray);
};

export const getEscrowPda = (adminPublicKey: PublicKey, seed: number, programId: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("escrow"),
            adminPublicKey.toBuffer(),
            Buffer.from(new anchor.BN(seed).toArrayLike(Buffer, "le", 8)),
        ],
        programId
    );
};
export const fetchEscrowAccount = async (escrowPda: PublicKey) => {
    try {
        const program = new Program<AlphaPods>(idl as any, provider);
        const account = await program.account.initializeAdmin.fetch(escrowPda);
        return {
            success: true,
            account: {
                admin: account.admin.toBase58(),
                seed: account.seed.toNumber(),
               
            }
        };
    } catch (error) {
        console.error("Error fetching escrow account:", error);
        return {
            success: false,
        
        };
    }
};