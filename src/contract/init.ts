
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import { AlphaPods } from "../idl/alpha_pods";
import dotenv from "dotenv";

dotenv.config();

// Initialize the program connection
const connection = new Connection(process.env.RPC_URL || "https://api.devnet.solana.com");
const provider = new AnchorProvider(connection, {} as any, {});
anchor.setProvider(provider);

export const init = async (
    adminKeypair: Keypair,
    members: PublicKey[],
    threshold: number,
    seed?: number
) => {
    try {
        // Load the program
        const program = new Program(AlphaPods as any, provider) as Program<AlphaPods>;
        
        // Generate seed if not provided
        const escrowSeed = seed || Math.floor(Math.random() * 1000000);
        
        // Generate PDA for escrow account
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
        
        // Initialize the escrow account
        const tx = await program.methods
            .initialize(new anchor.BN(escrowSeed), members, new anchor.BN(threshold))
            .accountsStrict({
                admin: adminKeypair.publicKey,
                escrow: escrowPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([adminKeypair])
            .rpc();
            
        console.log("Initialize transaction signature:", tx);
        
        // Fetch and verify the escrow account
        const escrowAccount = await program.account.initializeAdmin.fetch(escrowPda);
        
        return {
            success: true,
            transactionSignature: tx,
            escrowPda: escrowPda.toBase58(),
            escrowBump,
            seed: escrowSeed,
            account: {
                admin: escrowAccount.admin.toBase58(),
                threshold: escrowAccount.threshold.toNumber(),
                membersCount: escrowAccount.members.length,
                seed: escrowAccount.seed.toNumber(),
            }
        };
        
    } catch (error) {
        console.error("Error initializing escrow:", error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Helper function to create admin keypair from secret key
export const createAdminKeypair = (secretKey: number[]): Keypair => {
    const secretKeyArray = new Uint8Array(secretKey);
    return Keypair.fromSecretKey(secretKeyArray);
};

// Helper function to get escrow PDA
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

// Helper function to fetch escrow account
export const fetchEscrowAccount = async (escrowPda: PublicKey) => {
    try {
        const program = new Program(AlphaPods as any, provider) as Program<AlphaPods>;
        const account = await program.account.initializeAdmin.fetch(escrowPda);
        return {
            success: true,
            account: {
                admin: account.admin.toBase58(),
                threshold: account.threshold.toNumber(),
                membersCount: account.members.length,
                seed: account.seed.toNumber(),
                members: account.members.map(member => ({
                    publicKey: member.publicKey.toBase58(),
                    amount: member.amount.toNumber()
                }))
            }
        };
    } catch (error) {
        console.error("Error fetching escrow account:", error);
        return {
            success: false,
            error: error.message
        };
    }
};