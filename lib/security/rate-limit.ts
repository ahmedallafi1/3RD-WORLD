import {createHash} from "node:crypto";
import {query} from "@/lib/db";

function keyHash(value:string){
  return createHash("sha256").update(value).digest("hex");
}

export function requestFingerprint(headers:Headers){
  const ip=headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ??headers.get("cf-connecting-ip")
    ??headers.get("x-real-ip")
    ??"unknown";
  const agent=headers.get("user-agent")??"unknown";
  return keyHash(ip+"|"+agent);
}

export function normalizedIdentity(value?:string|null){
  return (value??"").trim().toLowerCase().slice(0,320);
}

export async function assertRateLimit(args:{
  scope:string;
  fingerprint:string;
  identity?:string|null;
  limit:number;
  windowSeconds:number;
}){
  const identity=normalizedIdentity(args.identity);
  const composite=keyHash([args.scope,args.fingerprint,identity].join("|"));

  const result=await query<{hits:number}>(
    `INSERT INTO security_rate_limits(key_hash,window_started_at,hits,updated_at)
     VALUES($1,now(),1,now())
     ON CONFLICT(key_hash)
     DO UPDATE SET
       hits=CASE
         WHEN security_rate_limits.window_started_at<=now()-make_interval(secs=>$2)
           THEN 1
         ELSE security_rate_limits.hits+1
       END,
       window_started_at=CASE
         WHEN security_rate_limits.window_started_at<=now()-make_interval(secs=>$2)
           THEN now()
         ELSE security_rate_limits.window_started_at
       END,
       updated_at=now()
     RETURNING hits`,
    [composite,args.windowSeconds],
  );

  if(Number(result.rows[0]?.hits??0)>args.limit){
    await query(
      `INSERT INTO security_events(event_type,key_hash,actor_type,payload)
       VALUES('RATE_LIMITED',$1,'REQUEST',$2::jsonb)`,
      [
        composite,
        JSON.stringify({
          scope:args.scope,
          limit:args.limit,
          windowSeconds:args.windowSeconds,
        }),
      ],
    ).catch(()=>undefined);
    throw new Error("Too many attempts. Try again later.");
  }
}

export async function pruneRateLimits(){
  await query(
    "DELETE FROM security_rate_limits WHERE updated_at<now()-interval '48 hours'",
  );
}
