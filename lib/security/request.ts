import {createHmac,randomUUID} from "node:crypto";
import type {NextRequest} from "next/server";

function secret(){
  return process.env.SECURITY_HASH_SECRET
    ||process.env.DROP_ACCESS_SECRET
    ||process.env.STRIPE_WEBHOOK_SECRET
    ||"development-security-secret";
}

export function requestId(request?:NextRequest){
  return request?.headers.get("x-request-id")||randomUUID();
}

export function requestIp(request:NextRequest){
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ||request.headers.get("cf-connecting-ip")
    ||request.headers.get("x-real-ip")
    ||"unknown";
}

export function hashSecurityValue(value:string){
  return createHmac("sha256",secret()).update(value).digest("hex");
}

export function requestFingerprint(request:NextRequest){
  const ip=requestIp(request);
  const agent=request.headers.get("user-agent")||"unknown";
  return hashSecurityValue(ip+"|"+agent);
}

export function emailHash(email:string){
  return hashSecurityValue(email.trim().toLowerCase());
}

export function requestSessionMetadata(request:NextRequest){
  return {
    ipHash:hashSecurityValue(requestIp(request)),
    userAgentHash:hashSecurityValue(request.headers.get("user-agent")||"unknown"),
  };
}
