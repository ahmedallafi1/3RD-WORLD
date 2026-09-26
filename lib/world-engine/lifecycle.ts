import {query,withTransaction} from "@/lib/db";
import {
  dispatchNotificationOutbox,
  dropEmailHtml,
  enqueueEmail,
} from "@/lib/world-engine/notifications";
import {runHousekeeping} from "@/lib/ops/housekeeping";

type DropLifecycleRow={
  id:string;
  slug:string;
  name:string;
  world_code:string;
  headline:string|null;
  early_access_at:Date|null;
  opens_at:Date|null;
  closes_at:Date|null;
};

function siteUrl(){
  return (process.env.PUBLIC_SITE_URL??"http://localhost:3000").replace(/\/$/,"");
}

async function notifyEarly(drop:DropLifecycleRow){
  const recipients=await query<{email:string}>(
    `SELECT DISTINCT lower(c.email) AS email
     FROM customers c
     JOIN passport_profiles p ON p.customer_id=c.id
     WHERE p.tier IN ('EARLY','VIP')
       AND c.status='ACTIVE'
     UNION
     SELECT DISTINCT lower(COALESCE(g.email,c.email)) AS email
     FROM drop_access_grants g
     LEFT JOIN customers c ON c.id=g.customer_id
     WHERE g.drop_id=$1
       AND g.grant_type IN ('EARLY','VIP','PRIVATE')
       AND (g.starts_at IS NULL OR g.starts_at<=now())
       AND (g.ends_at IS NULL OR g.ends_at>now())`,
    [drop.id],
  );

  for(const row of recipients.rows){
    if(!row.email)continue;
    await enqueueEmail({
      type:"DROP_EARLY",
      recipient:row.email,
      subject:`${drop.world_code} / EARLY ACCESS`,
      html:dropEmailHtml({
        world:drop.world_code,
        headline:drop.headline??drop.world_code,
        copy:"YOUR PASSPORT ACCESS WINDOW IS OPEN.",
        url:siteUrl()+"/drop/"+drop.slug,
      }),
      dedupeKey:`drop:${drop.id}:early:${row.email}`,
    });
  }
  return recipients.rows.length;
}

async function notifyLive(drop:DropLifecycleRow){
  const recipients=await query<{email:string}>(
    `SELECT DISTINCT lower(email) AS email
     FROM access_signups
     WHERE drop_id=$1
       AND signup_type='WAITLIST'
       AND status IN ('SUBSCRIBED','NOTIFIED')`,
    [drop.id],
  );

  for(const row of recipients.rows){
    await enqueueEmail({
      type:"DROP_LIVE",
      recipient:row.email,
      subject:`${drop.world_code} / WORLD OPEN`,
      html:dropEmailHtml({
        world:drop.world_code,
        headline:drop.headline??drop.world_code,
        copy:"THE RELEASE IS LIVE. ENTER THE WORLD.",
        url:siteUrl()+"/drop/"+drop.slug,
      }),
      dedupeKey:`drop:${drop.id}:live:${row.email}`,
    });
  }
  return recipients.rows.length;
}

export async function tickWorldEngine(){
  const early=await query<DropLifecycleRow>(
    `SELECT d.id,d.slug,d.name,w.code AS world_code,d.headline,
            d.early_access_at,d.opens_at,d.closes_at
     FROM drops d
     JOIN worlds w ON w.id=d.world_id
     WHERE d.status IN ('SCHEDULED','LIVE')
       AND d.early_access_at IS NOT NULL
       AND d.early_access_at<=now()
       AND (d.opens_at IS NULL OR d.opens_at>now())
       AND (d.closes_at IS NULL OR d.closes_at>now())`,
  );

  const goingLive=await query<DropLifecycleRow>(
    `SELECT d.id,d.slug,d.name,w.code AS world_code,d.headline,
            d.early_access_at,d.opens_at,d.closes_at
     FROM drops d
     JOIN worlds w ON w.id=d.world_id
     WHERE d.status='SCHEDULED'
       AND d.opens_at IS NOT NULL
       AND d.opens_at<=now()
       AND (d.closes_at IS NULL OR d.closes_at>now())`,
  );

  let earlyRecipients=0;
  let liveRecipients=0;
  for(const drop of early.rows)earlyRecipients+=await notifyEarly(drop);
  for(const drop of goingLive.rows)liveRecipients+=await notifyLive(drop);

  const archiveHours=Math.max(1,Number(process.env.WORLD_ARCHIVE_AFTER_HOURS??24));
  const archiveBefore=new Date(Date.now()-archiveHours*60*60*1000);

  const lifecycle=await withTransaction(async client=>{
    const live=await client.query<{id:string}>(
      `UPDATE drops
       SET status='LIVE',updated_at=now()
       WHERE status='SCHEDULED'
         AND opens_at IS NOT NULL
         AND opens_at<=now()
         AND (closes_at IS NULL OR closes_at>now())
       RETURNING id`,
    );
    const closed=await client.query<{id:string}>(
      `UPDATE drops
       SET status='CLOSED',updated_at=now()
       WHERE status IN ('SCHEDULED','LIVE')
         AND closes_at IS NOT NULL
         AND closes_at<=now()
       RETURNING id`,
    );
    const archived=await client.query<{id:string}>(
      `UPDATE drops
       SET status='ARCHIVED',updated_at=now()
       WHERE status='CLOSED'
         AND archive_on_close=true
         AND closes_at IS NOT NULL
         AND closes_at<=$1
       RETURNING id`,
      [archiveBefore],
    );

    const worldsLive=await client.query<{id:string}>(
      `UPDATE worlds
       SET status='LIVE',updated_at=now()
       WHERE status='SCHEDULED'
         AND launch_at IS NOT NULL
         AND launch_at<=now()
         AND (close_at IS NULL OR close_at>now())
       RETURNING id`,
    );
    const worldsClosed=await client.query<{id:string}>(
      `UPDATE worlds
       SET status='CLOSED',updated_at=now()
       WHERE status='LIVE'
         AND close_at IS NOT NULL
         AND close_at<=now()
       RETURNING id`,
    );

    const result={
      dropsLive:live.rowCount??live.rows.length,
      dropsClosed:closed.rowCount??closed.rows.length,
      dropsArchived:archived.rowCount??archived.rows.length,
      worldsLive:worldsLive.rowCount??worldsLive.rows.length,
      worldsClosed:worldsClosed.rowCount??worldsClosed.rows.length,
      earlyRecipients,
      liveRecipients,
    };

    await client.query(
      "INSERT INTO lifecycle_runs(run_type,result) VALUES('WORLD_ENGINE',$1::jsonb)",
      [JSON.stringify(result)],
    );
    return result;
  });

  return lifecycle;
}

export async function runWorldEngine(){
  const housekeeping=await runHousekeeping();
  const lifecycle=await tickWorldEngine();
  const delivery=await dispatchNotificationOutbox(
    Math.max(1,Number(process.env.NOTIFICATION_BATCH_SIZE??40)),
  );
  return {housekeeping,lifecycle,delivery};
}
