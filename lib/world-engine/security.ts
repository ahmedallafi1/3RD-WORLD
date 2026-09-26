import {createHash,createHmac,randomBytes} from "node:crypto";

function accessSecret(){
  const secret=process.env.DROP_ACCESS_SECRET||process.env.STRIPE_WEBHOOK_SECRET;
  if(secret)return secret;
  if(process.env.NODE_ENV==="production"){
    throw new Error("DROP_ACCESS_SECRET is not configured.");
  }
  return "development-only-change-me";
}

export function hashAccessCode(code:string){
  return createHmac("sha256",accessSecret())
    .update(code.trim().toUpperCase())
    .digest("hex");
}

export function newDropSessionToken(){
  return randomBytes(32).toString("base64url");
}

export function hashDropSessionToken(token:string){
  return createHash("sha256").update(token).digest("hex");
}

export function dropAccessCookieName(slug:string){
  return "tw_drop_"+slug.toLowerCase().replace(/[^a-z0-9_-]/g,"_");
}


export function hashAccessFingerprint(value:string){
  return createHmac("sha256",accessSecret()).update(value).digest("hex");
}
