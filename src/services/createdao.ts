import {
    withCreateRealm,
    MintMaxVoteWeightSource,
  } from '@realms-today/spl-governance';
  import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
  } from '@solana/web3.js';
  import BN from 'bn.js';
  import { PrismaClient, Role } from '@prisma/client';
  import dotenv from 'dotenv';
  import { privyauthorization } from '../services/auth';
  
  dotenv.config();
  
  const prisma = new PrismaClient();
  
  export const createdao = async (
    realmName: string,
    realmAuthority: PublicKey,
    userId: bigint,
    privyWalletId: string
  ) => {
    const connection = new Connection(
      process.env.RPC_URL || 'https://api.devnet.solana.com',
      { commitment: 'confirmed' }
    );
  
    const communityMint = new PublicKey(
      'AuzCK8jdZQ9Dvud9DnFbZ8KuUeuhqZJ2BDoAwzGEmEWd'
    );
    const councilMint = undefined;
  
    const programId = new PublicKey(
      'GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw'
    );
    const programVersion = 3;
  
    const instructions: TransactionInstruction[] = [];
  
    const realmAddress = await withCreateRealm(
      instructions,
      programId,
      programVersion,
      realmName,
      realmAuthority, 
      communityMint,
      realmAuthority, 
      councilMint,
      MintMaxVoteWeightSource.FULL_SUPPLY_FRACTION,
      new BN(1) as any 
    );
  
    const tx = new Transaction().add(...instructions);
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = realmAuthority;
     console.log("user",userId);
    const privy = await privyauthorization(userId);
    if (!privy) {
      throw new Error('Not able to authorize Privy wallet');
    }
  
    const rpc = await privy.walletApi.solana.signAndSendTransaction({
      walletId: privyWalletId,
      transaction: tx,
      caip2: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    });
  
    const signature =
      typeof rpc === 'string'
        ? rpc
        : (rpc as any).hash ?? JSON.stringify(rpc);
  
    console.log('Realm created:', realmAddress.toBase58(), 'tx:', signature);
  
    return { realmAddress, signature };
  };