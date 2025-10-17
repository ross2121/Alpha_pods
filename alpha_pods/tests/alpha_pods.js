"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const web3_js_1 = require("@solana/web3.js");
const chai_1 = require("chai");
describe("alpha_pods", () => {
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.alphaPods;
    const provider = anchor.getProvider();
    let admin;
    let member1;
    let member2;
    let member3;
    let escrowPda;
    let escrowBump;
    let seed;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        const secretKeyArray = [
            123, 133, 250, 221, 237, 158, 87, 58, 6, 57, 62, 193, 202, 235, 190, 13, 18, 21, 47, 98, 24, 62, 69, 69, 18, 194, 81, 72, 159, 184, 174, 118, 82, 197, 109, 205,
            235, 192, 3, 96, 149, 165, 99, 222, 143, 191, 103, 42, 147, 43, 200, 178, 125, 213, 222, 3, 20, 104, 168, 189, 104, 13, 71, 224
        ];
        const secretarray = new Uint8Array(secretKeyArray);
        admin = web3_js_1.Keypair.fromSecretKey(secretarray);
        console.log(admin.publicKey.toBase58());
        member1 = web3_js_1.Keypair.generate();
        member2 = web3_js_1.Keypair.generate();
        member3 = web3_js_1.Keypair.generate();
        seed = Math.floor(Math.random() * 1000000);
        // await provider.connection.requestAirdrop(admin.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
        // await provider.connection.requestAirdrop(member1.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
        // await provider.connection.requestAirdrop(member2.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
        // await provider.connection.requestAirdrop(member3.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
        console.log(admin.secretKey.toString());
        [escrowPda, escrowBump] = web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from("escrow"),
            admin.publicKey.toBuffer(),
            Buffer.from(new anchor.BN(seed).toArrayLike(Buffer, "le", 8)),
        ], program.programId);
        console.log(escrowPda);
    }));
    it("Initialize escrow", () => __awaiter(void 0, void 0, void 0, function* () {
        const members = [member1.publicKey, member2.publicKey, member3.publicKey];
        const threshold = 5;
        const tx = yield program.methods
            .initialize(new anchor.BN(seed), members, new anchor.BN(threshold))
            .accountsStrict({
            admin: admin.publicKey,
            escrow: escrowPda,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([admin])
            .rpc();
        console.log("Initialize transaction signature:", tx);
        const escrowAccount = yield program.account.initializeAdmin.fetch(escrowPda);
        (0, chai_1.expect)(escrowAccount.admin.toString()).to.equal(admin.publicKey.toString());
        (0, chai_1.expect)(escrowAccount.threshold.toNumber()).to.equal(threshold);
        (0, chai_1.expect)(escrowAccount.members.length).to.equal(3);
        (0, chai_1.expect)(escrowAccount.seed.toNumber()).to.equal(seed);
    }));
    it("Add member", () => __awaiter(void 0, void 0, void 0, function* () {
        const newMember = web3_js_1.Keypair.generate();
        const tx = yield program.methods
            .addMember(newMember.publicKey)
            .accountsStrict({
            admin: admin.publicKey,
            escrow: escrowPda,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([admin])
            .rpc();
        console.log("Add member transaction signature:", tx);
        const escrowAccount = yield program.account.initializeAdmin.fetch(escrowPda);
        (0, chai_1.expect)(escrowAccount.members.length).to.equal(4);
        (0, chai_1.expect)(escrowAccount.members[3].publicKey.toString()).to.equal(newMember.publicKey.toString());
    }));
    it("Remove member", () => __awaiter(void 0, void 0, void 0, function* () {
        // Get the current escrow account to get the seed
        const currentEscrow = yield program.account.initializeAdmin.fetch(escrowPda);
        const currentSeed = currentEscrow.seed.toNumber();
        const tx = yield program.methods
            .removeMember(member3.publicKey)
            .accountsStrict({
            admin: admin.publicKey,
            escrow: escrowPda,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([admin])
            .rpc();
        console.log("Remove member transaction signature:", tx);
        const escrowAccount = yield program.account.initializeAdmin.fetch(escrowPda);
        (0, chai_1.expect)(escrowAccount.members.length).to.equal(3);
    }));
    it("Deposit SOL", () => __awaiter(void 0, void 0, void 0, function* () {
        const depositAmount = 0.5;
        const lamports = depositAmount * anchor.web3.LAMPORTS_PER_SOL;
        const tx = yield program.methods
            .depositSol(new anchor.BN(lamports))
            .accountsStrict({
            admin: admin.publicKey,
            member: member1.publicKey,
            escrow: escrowPda,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([admin, member1])
            .rpc();
        console.log("Deposit SOL transaction signature:", tx);
        // Verify deposit was recorded
        const escrowAccount = yield program.account.initializeAdmin.fetch(escrowPda);
        const member = escrowAccount.members.find(m => m.publicKey.toString() === member1.publicKey.toString());
        (0, chai_1.expect)(member === null || member === void 0 ? void 0 : member.amount.toNumber()).to.equal(lamports);
    }));
    it("Withdraw SOL", () => __awaiter(void 0, void 0, void 0, function* () {
        const withdrawAmount = 0.2; // SOL
        const lamports = withdrawAmount * anchor.web3.LAMPORTS_PER_SOL;
        const initialBalance = yield provider.connection.getBalance(member1.publicKey);
        const tx = yield program.methods
            .withdrawSol(new anchor.BN(lamports))
            .accountsStrict({
            member: member1.publicKey,
            escrow: escrowPda,
            systemProgram: web3_js_1.SystemProgram.programId,
        })
            .signers([member1])
            .rpc();
        console.log("Withdraw SOL transaction signature:", tx);
        // Verify withdrawal
        const finalBalance = yield provider.connection.getBalance(member1.publicKey);
        (0, chai_1.expect)(finalBalance).to.be.greaterThan(initialBalance);
        // Verify member balance was updated
        const escrowAccount = yield program.account.initializeAdmin.fetch(escrowPda);
        const member = escrowAccount.members.find(m => m.publicKey.toString() === member1.publicKey.toString());
        (0, chai_1.expect)(member === null || member === void 0 ? void 0 : member.amount.toNumber()).to.equal(0.3 * anchor.web3.LAMPORTS_PER_SOL);
    }));
    it("Fail to add member with non-admin", () => __awaiter(void 0, void 0, void 0, function* () {
        const newMember = web3_js_1.Keypair.generate();
        try {
            yield program.methods
                .addMember(newMember.publicKey)
                .accountsStrict({
                admin: member1.publicKey,
                escrow: escrowPda,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([member1])
                .rpc();
            chai_1.expect.fail("Should have failed");
        }
        catch (error) {
            (0, chai_1.expect)(error.message).to.include("AccountNotEnoughKeys");
        }
    }));
    it("Fail to withdraw more than deposited", () => __awaiter(void 0, void 0, void 0, function* () {
        const withdrawAmount = 1.0; // SOL - more than deposited
        const lamports = withdrawAmount * anchor.web3.LAMPORTS_PER_SOL;
        try {
            yield program.methods
                .withdrawSol(new anchor.BN(lamports))
                .accountsStrict({
                member: member1.publicKey,
                escrow: escrowPda,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([member1])
                .rpc();
            chai_1.expect.fail("Should have failed");
        }
        catch (error) {
            (0, chai_1.expect)(error.message).to.include("AccountNotEnoughKeys");
        }
    }));
    it("Fail to withdraw with non-member", () => __awaiter(void 0, void 0, void 0, function* () {
        const nonMember = web3_js_1.Keypair.generate();
        // await provider.connection.requestAirdrop(nonMember.publicKey, anchor.web3.LAMPORTS_PER_SOL);
        const withdrawAmount = 0.1; // SOL
        const lamports = withdrawAmount * anchor.web3.LAMPORTS_PER_SOL;
        try {
            yield program.methods
                .withdrawSol(new anchor.BN(lamports))
                .accountsStrict({
                member: nonMember.publicKey,
                escrow: escrowPda,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([nonMember])
                .rpc();
            chai_1.expect.fail("Should have failed");
        }
        catch (error) {
            (0, chai_1.expect)(error.message).to.include("No member exist for this address");
        }
    }));
});
