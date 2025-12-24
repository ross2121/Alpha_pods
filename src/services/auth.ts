import { Keypair } from "@solana/web3.js";
import crypto from "crypto";
import bs58 from "bs58";
import * as jose from 'jose';
import { PrivyClient } from "@privy-io/server-auth";
const algorithm = 'aes-256-cbc';

// Get the signing keypair from environment
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
// Sign JWT using Ed25519 (EdDSA) with proper claims
export const getjwt = async (userid: bigint): Promise<string> => {
  const keypair = getSigningKeypair();
  
  // Create JWK from Ed25519 keypair for signing
  // Ed25519 secret key is 64 bytes: first 32 are private seed, last 32 are public
  const jwkPrivate = {
    kty: "OKP" as const,
    crv: "Ed25519" as const,
    d: Buffer.from(keypair.secretKey.slice(0, 32)).toString('base64url'),
    x: Buffer.from(keypair.publicKey.toBytes()).toString('base64url'),
  };
  
  const privateKey = await jose.importJWK(jwkPrivate, 'EdDSA');

  // Create JWT with proper claims
  const token = await new jose.SignJWT({
    sub: userid.toString(),  // Subject (user ID) - Privy uses this
  })
    .setProtectedHeader({ 
      alg: 'EdDSA',
      kid: 'alpha-pods-key-001'  // Must match JWKS kid
    })
    .setIssuedAt()
    .setExpirationTime('1h')  // Token expires in 1 hour
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
const token=await getjwt(userid);
console.log("Tokem",token);
const privy=await privytoken();
if(!privy){
  return;
}  
const {authorizationKey}=await privy.walletApi.generateUserSigner({
  userJwt:token
});
privy.walletApi.updateAuthorizationKey(authorizationKey);
return true;
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