import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey(){
  const raw=process.env.ADMIN_TOTP_ENCRYPTION_KEY;
  if(!raw)throw new Error("ADMIN_TOTP_ENCRYPTION_KEY is not configured.");
  const key=Buffer.from(raw,"base64url");
  if(key.length!==32)throw new Error("ADMIN_TOTP_ENCRYPTION_KEY must decode to 32 bytes.");
  return key;
}

export function generateTotpSecret(){
  const bytes=randomBytes(20);
  let bits="";
  for(const value of bytes)bits+=value.toString(2).padStart(8,"0");
  let out="";
  for(let i=0;i<bits.length;i+=5){
    const chunk=bits.slice(i,i+5).padEnd(5,"0");
    out+=BASE32[Number.parseInt(chunk,2)];
  }
  return out;
}

function decodeBase32(value:string){
  const clean=value.toUpperCase().replace(/=+$/,"").replace(/[^A-Z2-7]/g,"");
  let bits="";
  for(const char of clean){
    const index=BASE32.indexOf(char);
    if(index<0)continue;
    bits+=index.toString(2).padStart(5,"0");
  }
  const bytes:number[]=[];
  for(let i=0;i+8<=bits.length;i+=8){
    bytes.push(Number.parseInt(bits.slice(i,i+8),2));
  }
  return Buffer.from(bytes);
}

function totpAt(secret:string,timeMs:number){
  const counter=Math.floor(timeMs/30000);
  const buffer=Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest=createHmac("sha1",decodeBase32(secret)).update(buffer).digest();
  const offset=digest[digest.length-1]&0x0f;
  const binary=((digest[offset]&0x7f)<<24)
    |((digest[offset+1]&0xff)<<16)
    |((digest[offset+2]&0xff)<<8)
    |(digest[offset+3]&0xff);
  return String(binary%1_000_000).padStart(6,"0");
}

export function verifyTotp(secret:string,code:string,now=Date.now()){
  const normalized=code.replace(/\s+/g,"");
  if(!/^\d{6}$/.test(normalized))return false;

  for(const drift of [-1,0,1]){
    const expected=totpAt(secret,now+drift*30000);
    const left=Buffer.from(expected);
    const right=Buffer.from(normalized);
    if(left.length===right.length&&timingSafeEqual(left,right))return true;
  }
  return false;
}

export function encryptTotpSecret(secret:string){
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",encryptionKey(),iv);
  const encrypted=Buffer.concat([cipher.update(secret,"utf8"),cipher.final()]);
  const tag=cipher.getAuthTag();
  return ["v1",iv.toString("base64url"),tag.toString("base64url"),encrypted.toString("base64url")].join(".");
}

export function decryptTotpSecret(value:string){
  const [version,ivRaw,tagRaw,cipherRaw]=value.split(".");
  if(version!=="v1"||!ivRaw||!tagRaw||!cipherRaw)throw new Error("Invalid MFA secret.");
  const decipher=createDecipheriv("aes-256-gcm",encryptionKey(),Buffer.from(ivRaw,"base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw,"base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherRaw,"base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function makeTotpUri(args:{email:string;secret:string}){
  const issuer="3RD WORLD";
  const label=encodeURIComponent(issuer+":"+args.email);
  const params=new URLSearchParams({
    secret:args.secret,
    issuer,
    algorithm:"SHA1",
    digits:"6",
    period:"30",
  });
  return "otpauth://totp/"+label+"?"+params.toString();
}

export function newMfaChallengeToken(){
  return randomBytes(32).toString("base64url");
}

export function hashMfaChallengeToken(token:string){
  return createHash("sha256").update(token).digest("hex");
}

export function newRecoveryCode(){
  return randomBytes(9).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12);
}

export function hashRecoveryCode(code:string){
  return createHmac("sha256",encryptionKey())
    .update(code.trim().toUpperCase().replace(/\s+/g,""))
    .digest("hex");
}
