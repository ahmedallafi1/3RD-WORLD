import type {NextRequest} from "next/server";
import {query} from "@/lib/db";
import {requestFingerprint} from "@/lib/security/request";

export async function assertActionRateLimit(args:{
  request:NextRequest;
  action:string;
  maxAttempts?:number;
  windowMinutes?:number;
}){
  if(!process.env.DATABASE_URL)return;

  const fingerprint=requestFingerprint(args.request);
  const maxAttempts=Math.max(1,args.maxAttempts??20);
  const windowMinutes=Math.max(1,args.windowMinutes??10);

  const result=await query<{count:string}>(
    `SELECT count(*)::text AS count
     FROM security_events
     WHERE event_type='RATE_ACTION'
       AND fingerprint=$1
       AND metadata->>'action'=$2
       AND created_at>now()-($3::text || ' minutes')::interval`,
    [fingerprint,args.action,windowMinutes],
  );

  if(Number(result.rows[0]?.count??0)>=maxAttempts){
    throw new Error("Too many requests. Try again later.");
  }

  await query(
    `INSERT INTO security_events(event_type,actor_type,fingerprint,metadata)
     VALUES('RATE_ACTION','ANONYMOUS',$1,$2::jsonb)`,
    [fingerprint,JSON.stringify({action:args.action})],
  );
}
