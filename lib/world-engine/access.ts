import {query,withTransaction} from "@/lib/db";
import {hashAccessCode,hashDropSessionToken,newDropSessionToken} from "@/lib/world-engine/security";
import {
  dispatchNotificationOutbox,
  emailDeliveryConfigured,
  enqueueEmail,
} from "@/lib/world-engine/notifications";
import type {DropAccessDecision,DropAccessLevel,DropPhase,DropRecord,PassportTier} from "@/lib/world-engine/types";

export function getDropPhase(drop:DropRecord,now=new Date()):DropPhase{
  if(drop.status==="CLOSED"||drop.status==="ARCHIVED")return "CLOSED";
  if(drop.status==="DRAFT")return "UPCOMING";
  const nowMs=now.getTime();
  const closes=drop.closesAt?Date.parse(drop.closesAt):null;
  if(closes&&nowMs>=closes)return "CLOSED";

  const opens=drop.opensAt?Date.parse(drop.opensAt):null;
  if(drop.status==="LIVE")return "LIVE";
  if(opens&&nowMs>=opens)return "LIVE";

  const early=drop.earlyAccessAt?Date.parse(drop.earlyAccessAt):null;
  if(early&&nowMs>=early)return "EARLY";
  return "UPCOMING";
}

export async function getPassportTier(customerId?:string|null):Promise<PassportTier|null>{
  if(!customerId)return null;
  const result=await query<{tier:PassportTier}>(
    `SELECT tier FROM passport_profiles WHERE customer_id=$1 LIMIT 1`,
    [customerId],
  );
  return result.rows[0]?.tier??"MEMBER";
}

async function getGrant(args:{
  dropId:string;
  customerId?:string|null;
  email?:string|null;
}):Promise<DropAccessLevel|null>{
  const result=await query<{grant_type:"EARLY"|"VIP"|"PRIVATE"}>(
    `SELECT grant_type
     FROM drop_access_grants
     WHERE drop_id=$1
       AND (
         ($2::uuid IS NOT NULL AND customer_id=$2::uuid)
         OR ($3::text IS NOT NULL AND lower(email)=lower($3))
       )
       AND (starts_at IS NULL OR starts_at<=now())
       AND (ends_at IS NULL OR ends_at>now())
     ORDER BY
       CASE grant_type WHEN 'PRIVATE' THEN 3 WHEN 'VIP' THEN 2 ELSE 1 END DESC
     LIMIT 1`,
    [args.dropId,args.customerId??null,args.email??null],
  );
  return result.rows[0]?.grant_type??null;
}

async function getSessionAccess(dropId:string,rawToken?:string|null):Promise<DropAccessLevel|null>{
  if(!rawToken)return null;
  const result=await query<{access_level:DropAccessLevel}>(
    `SELECT access_level
     FROM drop_access_sessions
     WHERE drop_id=$1
       AND token_hash=$2
       AND expires_at>now()
     LIMIT 1`,
    [dropId,hashDropSessionToken(rawToken)],
  );
  return result.rows[0]?.access_level??null;
}

async function isWaitlisted(dropId:string,email?:string|null){
  if(!email)return false;
  const result=await query<{exists:boolean}>(
    `SELECT EXISTS(
       SELECT 1 FROM access_signups
       WHERE drop_id=$1
         AND lower(email)=lower($2)
         AND signup_type='WAITLIST'
         AND status IN ('SUBSCRIBED','NOTIFIED')
     ) AS exists`,
    [dropId,email],
  );
  return Boolean(result.rows[0]?.exists);
}

function tierAllowsEarly(tier:PassportTier|null){
  return tier==="EARLY"||tier==="VIP";
}

export async function evaluateDropAccess(args:{
  drop:DropRecord;
  customerId?:string|null;
  email?:string|null;
  sessionToken?:string|null;
}):Promise<DropAccessDecision>{
  const phase=getDropPhase(args.drop);
  if(phase==="CLOSED"){
    return {phase,granted:false,level:null,reason:"CLOSED"};
  }

  if(!process.env.DATABASE_URL){
    if(phase==="LIVE"&&args.drop.accessMode==="PUBLIC"){
      return {phase,granted:true,level:"PUBLIC",reason:"PUBLIC"};
    }
    return {
      phase,
      granted:false,
      level:null,
      reason:args.drop.accessMode==="CODE"?"CODE_REQUIRED":
        args.drop.accessMode==="EMAIL"?"EMAIL_REQUIRED":
        args.drop.accessMode==="PRIVATE"?"PRIVATE":"TOO_EARLY",
    };
  }

  const [sessionLevel,tier,grant]=await Promise.all([
    getSessionAccess(args.drop.id,args.sessionToken),
    getPassportTier(args.customerId),
    getGrant({
      dropId:args.drop.id,
      customerId:args.customerId,
      email:args.email,
    }),
  ]);

  if(sessionLevel){
    return {phase,granted:true,level:sessionLevel,reason:"SESSION"};
  }

  if(grant==="PRIVATE"){
    return {phase,granted:true,level:"PRIVATE",reason:"GRANT"};
  }

  if(phase==="UPCOMING"){
    return {phase,granted:false,level:null,reason:"TOO_EARLY"};
  }

  if(phase==="EARLY"){
    if(grant==="VIP"){
      return {phase,granted:true,level:"VIP",reason:"GRANT"};
    }
    if(grant==="EARLY"){
      return {phase,granted:true,level:"EARLY",reason:"GRANT"};
    }
    if(tierAllowsEarly(tier)){
      return {phase,granted:true,level:tier==="VIP"?"VIP":"EARLY",reason:"PASSPORT"};
    }
    return {phase,granted:false,level:null,reason:"TOO_EARLY"};
  }

  if(args.drop.accessMode==="PUBLIC"){
    return {phase,granted:true,level:"PUBLIC",reason:"PUBLIC"};
  }

  if(args.drop.accessMode==="EMAIL"){
    if(args.customerId&&args.email&&await isWaitlisted(args.drop.id,args.email)){
      return {phase,granted:true,level:"EMAIL",reason:"WAITLIST"};
    }
    return {phase,granted:false,level:null,reason:"EMAIL_REQUIRED"};
  }

  if(args.drop.accessMode==="CODE"){
    return {phase,granted:false,level:null,reason:"CODE_REQUIRED"};
  }

  return {phase,granted:false,level:null,reason:"PRIVATE"};
}

function sessionExpiry(drop:DropRecord){
  const twelveHours=Date.now()+12*60*60*1000;
  const closes=drop.closesAt?Date.parse(drop.closesAt):Number.POSITIVE_INFINITY;
  return new Date(Math.min(twelveHours,closes));
}

export async function redeemDropCode(args:{
  drop:DropRecord;
  code:string;
  customerId?:string|null;
  email?:string|null;
}){
  const codeHash=hashAccessCode(args.code);
  return withTransaction(async client=>{
    const code=await client.query<{
      id:string;max_uses:number|null;usage_count:number;
    }>(
      `SELECT id,max_uses,usage_count
       FROM drop_access_codes
       WHERE drop_id=$1
         AND code_hash=$2
         AND active=true
         AND (starts_at IS NULL OR starts_at<=now())
         AND (ends_at IS NULL OR ends_at>now())
       FOR UPDATE`,
      [args.drop.id,codeHash],
    );
    const row=code.rows[0];
    if(!row)throw new Error("Invalid or expired access code.");
    if(row.max_uses!==null&&row.usage_count>=row.max_uses){
      throw new Error("This access code has reached its limit.");
    }

    const rawToken=newDropSessionToken();
    await client.query(
      `UPDATE drop_access_codes
       SET usage_count=usage_count+1
       WHERE id=$1`,
      [row.id],
    );
    await client.query(
      `INSERT INTO drop_access_sessions
       (drop_id,token_hash,customer_id,email,access_level,expires_at)
       VALUES($1,$2,$3,$4,'CODE',$5)`,
      [
        args.drop.id,
        hashDropSessionToken(rawToken),
        args.customerId??null,
        args.email?.trim().toLowerCase()??null,
        sessionExpiry(args.drop),
      ],
    );
    await client.query(
      `INSERT INTO access_events
       (drop_id,customer_id,email,event_type,access_level,payload)
       VALUES($1,$2,$3,'CODE_REDEEMED','CODE',$4::jsonb)`,
      [
        args.drop.id,
        args.customerId??null,
        args.email?.trim().toLowerCase()??null,
        JSON.stringify({code_id:row.id}),
      ],
    );

    return {token:rawToken,expiresAt:sessionExpiry(args.drop)};
  });
}

export async function requestWaitlistEmailAccess(args:{
  drop:DropRecord;
  email:string;
  customerId?:string|null;
}){
  if(getDropPhase(args.drop)!=="LIVE"){
    throw new Error("Email access is not open yet.");
  }
  if(!emailDeliveryConfigured()){
    throw new Error("Email access delivery is not configured.");
  }

  const email=args.email.trim().toLowerCase();
  const waitlisted=await isWaitlisted(args.drop.id,email);
  if(!waitlisted)throw new Error("This email is not on the access list.");

  const rawToken=newDropSessionToken();
  const expiresAt=new Date(Date.now()+30*60*1000);
  await query(
    `INSERT INTO drop_access_sessions
     (drop_id,token_hash,customer_id,email,access_level,expires_at)
     VALUES($1,$2,$3,$4,'EMAIL',$5)`,
    [
      args.drop.id,
      hashDropSessionToken(rawToken),
      args.customerId??null,
      email,
      expiresAt,
    ],
  );

  const base=(process.env.PUBLIC_SITE_URL??"http://localhost:3000").replace(/\/$/,"");
  const url=base+"/api/drops/"+encodeURIComponent(args.drop.slug)+"/verify?token="+encodeURIComponent(rawToken);
  await enqueueEmail({
    type:"DROP_LIVE",
    recipient:email,
    subject:args.drop.worldCode+" / ACCESS LINK",
    html:`<!doctype html><html><body style="margin:0;background:#090909;color:#f4f3ef;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;padding:48px 24px"><div style="font-weight:800">3RD WORLD</div><h1 style="font-size:52px;line-height:.9;margin:48px 0 20px">ENTER ${args.drop.worldCode}</h1><p>YOUR PRIVATE EMAIL ACCESS LINK EXPIRES IN 30 MINUTES.</p><a href="${url}" style="color:#f4f3ef">ENTER THE WORLD</a></div></body></html>`,
    dedupeKey:"email-access:"+args.drop.id+":"+email+":"+Date.now(),
  });
  await dispatchNotificationOutbox(10);

  await query(
    `INSERT INTO access_events
     (drop_id,customer_id,email,event_type,access_level)
     VALUES($1,$2,$3,'EMAIL_LINK_SENT','EMAIL')`,
    [args.drop.id,args.customerId??null,email],
  );

  return {verificationSent:true};
}

export async function consumeWaitlistEmailToken(args:{
  drop:DropRecord;
  token:string;
}){
  return withTransaction(async client=>{
    const tokenHash=hashDropSessionToken(args.token);
    const pending=await client.query<{
      id:string;customer_id:string|null;email:string|null;
    }>(
      `SELECT id,customer_id,email
       FROM drop_access_sessions
       WHERE drop_id=$1
         AND token_hash=$2
         AND access_level='EMAIL'
         AND expires_at>now()
       FOR UPDATE`,
      [args.drop.id,tokenHash],
    );
    const row=pending.rows[0];
    if(!row)throw new Error("Access link is invalid or expired.");

    await client.query("DELETE FROM drop_access_sessions WHERE id=$1",[row.id]);
    const rawToken=newDropSessionToken();
    const expiresAt=sessionExpiry(args.drop);
    await client.query(
      `INSERT INTO drop_access_sessions
       (drop_id,token_hash,customer_id,email,access_level,expires_at)
       VALUES($1,$2,$3,$4,'EMAIL',$5)`,
      [args.drop.id,hashDropSessionToken(rawToken),row.customer_id,row.email,expiresAt],
    );
    await client.query(
      `INSERT INTO access_events
       (drop_id,customer_id,email,event_type,access_level)
       VALUES($1,$2,$3,'EMAIL_VERIFIED','EMAIL')`,
      [args.drop.id,row.customer_id,row.email],
    );
    return {token:rawToken,expiresAt};
  });
}

export async function joinAccessList(args:{
  email:string;
  dropId?:string|null;
  productId?:string|null;
  customerId?:string|null;
  type:"WORLD"|"WAITLIST"|"RESTOCK";
  source?:string;
}){
  const email=args.email.trim().toLowerCase();
  if(!email||!email.includes("@"))throw new Error("Enter a valid email address.");

  await withTransaction(async client=>{
    await client.query(
      `INSERT INTO access_signups
       (drop_id,product_id,customer_id,email,signup_type,status,source)
       VALUES($1,$2,$3,$4,$5,'SUBSCRIBED',$6)
       ON CONFLICT DO NOTHING`,
      [
        args.dropId??null,
        args.productId??null,
        args.customerId??null,
        email,
        args.type,
        args.source??null,
      ],
    );

    await client.query(
      `UPDATE access_signups
       SET status='SUBSCRIBED',
           customer_id=COALESCE($3,customer_id),
           source=COALESCE($6,source),
           updated_at=now()
       WHERE lower(email)=lower($4)
         AND signup_type=$5
         AND (($1::uuid IS NULL AND drop_id IS NULL) OR drop_id=$1::uuid)
         AND (($2::uuid IS NULL AND product_id IS NULL) OR product_id=$2::uuid)`,
      [
        args.dropId??null,
        args.productId??null,
        args.customerId??null,
        email,
        args.type,
        args.source??null,
      ],
    );
  });

  return {email};
}


export async function assertAccessAttemptAllowed(fingerprint:string){
  const limit=Math.max(3,Number(process.env.ACCESS_ATTEMPT_LIMIT??12));
  const result=await query<{count:string}>(
    `SELECT count(*)::text AS count
     FROM access_events
     WHERE event_type='ACCESS_DENIED'
       AND payload->>'fingerprint'=$1
       AND created_at>now()-interval '10 minutes'`,
    [fingerprint],
  );
  if(Number(result.rows[0]?.count??0)>=limit){
    throw new Error("Too many access attempts. Try again later.");
  }
}

export async function recordAccessAttempt(args:{
  dropId:string;
  customerId?:string|null;
  email?:string|null;
  granted:boolean;
  accessLevel?:string|null;
  fingerprint:string;
}){
  await query(
    `INSERT INTO access_events
     (drop_id,customer_id,email,event_type,access_level,payload)
     VALUES($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      args.dropId,
      args.customerId??null,
      args.email?.trim().toLowerCase()??null,
      args.granted?"ACCESS_GRANTED":"ACCESS_DENIED",
      args.accessLevel??null,
      JSON.stringify({fingerprint:args.fingerprint}),
    ],
  );
}
