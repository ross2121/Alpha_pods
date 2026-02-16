import {
    withCreateRealm,
    MintMaxVoteWeightSource,
  } from '@realms-today/spl-governance';
  import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
  } from '@solana/web3.js';
  import * as anchor from '@coral-xyz/anchor';
  import bs58 from 'bs58';
  import BN from 'bn.js';
   
  export const createdao=async()=>{
  const connection = new Connection('https://api.devnet.solana.com');
  const decode=bs58.decode("53aqP3YEA1yDPYZ9GrsASVPXEB1LBXCG1WtwGve4VeyiogG3zqTvDBJSxeM49ov62JG84ZFd1vxmqfkrProBzGAd")
  const payer = Keypair.fromSecretKey(decode);
  
  const communityMint = new PublicKey('AuzCK8jdZQ9Dvud9DnFbZ8KuUeuhqZJ2BDoAwzGEmEWd');
  const councilMint =undefined
  
  // You can use the default shared instance or deploy your own
  const programId = new PublicKey('GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw');
  const programVersion = 3;
  
  const realmName = 'My DAO3s2ss3';
  
  const instructions: TransactionInstruction[] = [];
  
  const realmAddress = await withCreateRealm(
    instructions,
    programId,
    programVersion,
    realmName,
    payer.publicKey,          // realm authority
    communityMint,
    payer.publicKey,          // payer
    councilMint,              // optional council mint (undefined if none)
    MintMaxVoteWeightSource.FULL_SUPPLY_FRACTION,
    new BN(1) as any,                // min community weight to create governance
  );
  
  const tx = new Transaction().add(...instructions);
  await sendAndConfirmTransaction(connection, tx, [payer]);
  console.log("tx",realmAddress);
}
createdao();