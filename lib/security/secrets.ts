import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";

function key(){
  const raw=process.env.SECURITY_ENCRYPTION_KEY;
  if(!raw)throw new Error("SECURITY_ENCRYPTION_KEY is not configured.");
  const decoded=Buffer.from(raw,"base64");
  if(decoded.length!==32)throw new Error("SECURITY_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return decoded;
}

export function encryptSecret(value:string){
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key(),iv);
  const encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  const tag=cipher.getAuthTag();
  return ["v1",iv.toString("base64url"),tag.toString("base64url"),encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value:string){
  const [version,ivValue,tagValue,dataValue]=value.split(".");
  if(version!=="v1"||!ivValue||!tagValue||!dataValue)throw new Error("Invalid encrypted secret.");
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(ivValue,"base64url"));
  decipher.setAuthTag(Buffer.from(tagValue,"base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataValue,"base64url")),
    decipher.final(),
  ]).toString("utf8");
}
