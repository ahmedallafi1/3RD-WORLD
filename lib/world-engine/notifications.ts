import {query,withTransaction} from "@/lib/db";

type NotificationType="DROP_EARLY"|"DROP_LIVE"|"RESTOCK";

export async function enqueueEmail(args:{
  type:NotificationType;
  recipient:string;
  subject:string;
  html:string;
  dedupeKey:string;
}){
  await query(
    `INSERT INTO notification_outbox
     (channel,notification_type,recipient,subject,body_html,dedupe_key,status)
     VALUES('EMAIL',$1,$2,$3,$4,$5,'PENDING')
     ON CONFLICT(dedupe_key) DO NOTHING`,
    [args.type,args.recipient.trim().toLowerCase(),args.subject,args.html,args.dedupeKey],
  );
}

export function emailDeliveryConfigured(){
  return Boolean(process.env.RESEND_API_KEY&&process.env.NOTIFICATION_FROM_EMAIL);
}

async function sendResend(args:{to:string;subject:string;html:string}){
  const key=process.env.RESEND_API_KEY;
  const from=process.env.NOTIFICATION_FROM_EMAIL;
  if(!key||!from)throw new Error("Email provider is not configured.");

  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{
      authorization:`Bearer ${key}`,
      "content-type":"application/json",
    },
    body:JSON.stringify({
      from,
      to:[args.to],
      subject:args.subject,
      html:args.html,
    }),
    cache:"no-store",
  });
  const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
  if(!response.ok){
    const message=typeof payload?.message==="string"?payload.message:"Email delivery failed.";
    throw new Error(message);
  }
  return String(payload?.id??"");
}

export async function dispatchNotificationOutbox(limit=40){
  if(!emailDeliveryConfigured()){
    return {sent:0,failed:0,skipped:true};
  }

  const rows=await withTransaction(async client=>{
    const selected=await client.query<{
      id:string;recipient:string;subject:string;body_html:string;
    }>(
      `SELECT id,recipient,subject,body_html
       FROM notification_outbox
       WHERE status='PENDING' AND available_at<=now()
       ORDER BY created_at
       FOR UPDATE SKIP LOCKED
       LIMIT $1`,
      [Math.max(1,Math.min(limit,100))],
    );
    for(const row of selected.rows){
      await client.query(
        `UPDATE notification_outbox
         SET status='SENDING',attempts=attempts+1,updated_at=now()
         WHERE id=$1`,
        [row.id],
      );
    }
    return selected.rows;
  });

  let sent=0;
  let failed=0;
  for(const row of rows){
    try{
      const providerRef=await sendResend({
        to:row.recipient,
        subject:row.subject,
        html:row.body_html,
      });
      await query(
        `UPDATE notification_outbox
         SET status='SENT',provider='resend',provider_ref=$2,sent_at=now(),updated_at=now()
         WHERE id=$1`,
        [row.id,providerRef],
      );
      sent++;
    }catch(error){
      const message=error instanceof Error?error.message:"Delivery failed.";
      await query(
        `UPDATE notification_outbox
         SET status=CASE WHEN attempts>=5 THEN 'FAILED' ELSE 'PENDING' END,
             last_error=$2,
             available_at=now()+interval '15 minutes',
             updated_at=now()
         WHERE id=$1`,
        [row.id,message],
      );
      failed++;
    }
  }
  return {sent,failed,skipped:false};
}

export function dropEmailHtml(args:{world:string;headline:string;url:string;copy:string}){
  return `<!doctype html><html><body style="margin:0;background:#090909;color:#f4f3ef;font-family:Arial,sans-serif">
  <div style="max-width:640px;margin:auto;padding:48px 24px">
    <div style="font-weight:800;font-size:20px">3RD WORLD</div>
    <p style="font-size:11px;opacity:.65;margin-top:48px">${args.world}</p>
    <h1 style="font-size:56px;line-height:.9;letter-spacing:-3px;margin:12px 0 24px">${args.headline}</h1>
    <p style="font-size:16px;line-height:1.5;opacity:.8">${args.copy}</p>
    <a href="${args.url}" style="display:inline-block;margin-top:30px;color:#f4f3ef;text-decoration:none;border-bottom:1px solid #f4f3ef;padding-bottom:4px">ENTER THE WORLD</a>
  </div></body></html>`;
}
