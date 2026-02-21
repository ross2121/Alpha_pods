import { Keypair } from "@solana/web3.js";
import crypto from "crypto";
import bs58 from "bs58";
import * as jose from 'jose';
import { PrivyClient } from "@privy-io/server-auth";
import { PrismaClient } from "@prisma/client";
const algorithm = 'aes-256-cbc';

const getSigningKeypair = (): Keypair => {
  const secretKeyArray = process.env.SECRET_KEY?.split(",").map(Number);
  if (!secretKeyArray) {
    throw new Error("SECRET_KEY not configured");
  }
  return Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
};

export const generateWallet = () => {
    const keypair = Keypair.generate();
    return {
        publicKey: keypair.publicKey.toString(),
        secretKey: keypair.secretKey,
    };
};
export const encryptPrivateKey = (secretKey: Uint8Array): { encrypted: string, iv: string } => {
    const key = crypto.scryptSync(process.env.CRYPTO_SECRET || 'your-secret-key-change-this', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    const secretKeyBase58 = bs58.encode(secretKey);
    
    let encrypted = cipher.update(secretKeyBase58, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
        encrypted,
        iv: iv.toString('hex')
    };
};
export const decryptPrivateKey = (encrypted: string, ivHex: string): Uint8Array => {
    const key = crypto.scryptSync(process.env.CRYPTO_SECRET || 'your-secret-key-change-this', 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return bs58.decode(decrypted);
};
export const getjwt = async (userid: string | bigint): Promise<string> => {
  const keypair = getSigningKeypair();
  const jwkPrivate = {
    kty: "OKP" as const,
    crv: "Ed25519" as const,
    d: Buffer.from(keypair.secretKey.slice(0, 32)).toString('base64url'),
    x: Buffer.from(keypair.publicKey.toBytes()).toString('base64url'),
  };
  
  const privateKey = await jose.importJWK(jwkPrivate, 'EdDSA');


  const token = await new jose.SignJWT({
    sub: typeof userid === 'bigint' ? userid.toString() : userid,  
  })
    .setProtectedHeader({ 
      alg: 'EdDSA',
      kid: 'alpha-pods-key-001'  
    })
    .setIssuedAt()
    .setExpirationTime('1h')  
    .setIssuer('alpha-pods')
    .sign(privateKey);

  return token;
};
export const privytoken=async()=>{
  const appId=process.env.APP_ID;
  const appsecret=process.env.APP_SECRET;
  if(!appId||!appsecret){
    console.log("No app id found")
    return false;
  }
  const privy=new PrivyClient(appId,appsecret)
  return privy;
}
export const privyauthorization=async(userid:bigint)=>{
  const privy=await privytoken();
  if(!privy){
    console.log("no Privy found");
    return;
  }
  
  // Get user from database to find their telegram_id (custom auth ID)
  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: userid }
  });
  
  if (!user) {
    console.log(`[privyauthorization] User not found with id: ${userid}`);
    return;
  }
  
  try {
    // Get the Privy user ID from the wallet
    // The wallet ownerId is the Privy user ID
    const wallet = await privy.walletApi.getWallet({ id: user.Privy_id });
    const privyUserId = wallet.ownerId;
    
    if (!privyUserId) {
      console.error(`[privyauthorization] Wallet ${user.Privy_id} has no ownerId`);
      return;
    }
    
    console.log(`[privyauthorization] Privy User ID: ${privyUserId}, Wallet ID: ${user.Privy_id}`);
    
    // Generate JWT with Privy user ID as subject (not database user ID)
    // Privy user ID is already a string, no need to convert to BigInt
    const token = await getjwt(privyUserId);
    console.log(`[privyauthorization] Token generated for Privy user ID: ${privyUserId}`);
    
    const {authorizationKey} = await privy.walletApi.generateUserSigner({
      userJwt: token
    });
    privy.walletApi.updateAuthorizationKey(authorizationKey);
    console.log(`[privyauthorization] Successfully authorized Privy wallet`);
    return privy;
  } catch (error: any) {
    console.error(`[privyauthorization] Error:`, error.message || error);
    console.error(`[privyauthorization] Stack:`, error.stack);
    return;
  }
}
export const getjsks = async (req: any, res: any) => {
  try {
    const Secret_Key = process.env.SECRET_KEY?.split(",").map(Number);
    
    if (!Secret_Key) {
      console.log("No secret key");
      return res.status(400).json({ error: "SECRET_KEY not configured" });
    }
    const secretKey = new Uint8Array(Secret_Key);
    const superadmin = Keypair.fromSecretKey(secretKey);
    console.log("Superadmin", superadmin.publicKey.toString());
    const publicKeyBytes = superadmin.publicKey.toBytes();
    const jwk = {
      kty: "OKP",           
      crv: "Ed25519",      
      x: Buffer.from(publicKeyBytes).toString('base64url'), 
      kid: "alpha-pods-key-001",
      use: "sig",
      alg: "EdDSA"
    };

    console.log("JWK created:", jwk);
    res.json({ keys: [jwk] });
  } catch (error: any) {
    console.error("Error in getjsks:", error);
    res.status(500).json({ error: error.message });
  }
}