import {query} from "@/lib/db";
import {emailHash,requestFingerprint} from "@/lib/security/request";
import type {NextRequest} from "next/server";

type Scope="ADMIN"|"CUSTOMER";

export async function assertAuthRateLimit(args:{
  request:NextRequest;
  email:string;
  scope:Scope;
}){
  const fingerprint=requestFingerprint(args.request);
  const hashedEmail=emailHash(args.email);
  const windowMinutes=Math.max(1,Number(process.env.AUTH_RATE_WINDOW_MINUTES??15));
  const maxAttempts=Math.max(3,Number(process.env.AUTH_RATE_MAX_ATTEMPTS??10));

  const result=await query<{count:string}>(
    `SELECT count(*)::text AS count
     FROM auth_attempts
     WHERE scope=$1
       AND success=false
       AND created_at>now()-($4::text || ' minutes')::interval
       AND (fingerprint=$2 OR email_hash=$3)`,
    [args.scope,fingerprint,hashedEmail,windowMinutes],
  );

  if(Number(result.rows[0]?.count??0)>=maxAttempts){
    throw new Error("Too many sign-in attempts. Try again later.");
  }

  return {fingerprint,emailHash:hashedEmail};
}

export async function recordAuthAttempt(args:{
  scope:Scope;
  fingerprint:string;
  emailHash:string;
  success:boolean;
}){
  await query(
    `INSERT INTO auth_attempts(scope,fingerprint,email_hash,success)
     VALUES($1,$2,$3,$4)`,
    [args.scope,args.fingerprint,args.emailHash,args.success],
  );
}
