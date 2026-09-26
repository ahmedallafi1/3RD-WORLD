import {query,withTransaction} from "@/lib/db";
import {writeAdminAudit} from "@/lib/commerce/repositories/audit";

export type CampaignType="FILM"|"EDITORIAL"|"LOOKBOOK"|"STORY"|"SOUND";
export type CampaignStatus="DRAFT"|"PUBLISHED"|"ARCHIVED";

export async function listCampaigns(limit=200){
  const result=await query<{
    id:string;world_code:string;type:CampaignType;title:string;slug:string;
    eyebrow:string|null;body:string|null;position:number;status:CampaignStatus;
    published_at:Date|null;created_at:Date;
  }>(
    `SELECT c.id,w.code AS world_code,c.type,c.title,c.slug,c.eyebrow,c.body,
            c.position,c.status,c.published_at,c.created_at
     FROM world_campaigns c
     JOIN worlds w ON w.id=c.world_id
     ORDER BY w.created_at DESC,c.position,c.created_at DESC
     LIMIT $1`,
    [Math.max(1,Math.min(limit,500))],
  );
  return result.rows.map(row=>({
    id:row.id,worldCode:row.world_code,type:row.type,title:row.title,slug:row.slug,
    eyebrow:row.eyebrow,body:row.body,position:row.position,status:row.status,
    publishedAt:row.published_at?.toISOString()??null,createdAt:row.created_at.toISOString(),
  }));
}

export async function createCampaign(args:{
  worldId:string;
  type:CampaignType;
  title:string;
  slug:string;
  eyebrow?:string|null;
  body?:string|null;
  position?:number;
  status?:CampaignStatus;
  actorId:string;
}){
  const status=args.status??"DRAFT";
  if(!args.worldId||!args.title.trim()||!args.slug.trim())throw new Error("World, title and slug are required.");

  return withTransaction(async client=>{
    const inserted=await client.query<{id:string}>(
      `INSERT INTO world_campaigns
       (world_id,type,title,slug,eyebrow,body,position,status,published_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $8='PUBLISHED' THEN now() ELSE NULL END)
       RETURNING id`,
      [
        args.worldId,args.type,args.title.trim(),args.slug.trim().toLowerCase(),
        args.eyebrow?.trim()||null,args.body?.trim()||null,args.position??0,status,
      ],
    );
    await writeAdminAudit(client,{
      actorId:args.actorId,
      action:"CAMPAIGN_CREATE",
      resourceType:"world_campaign",
      resourceId:inserted.rows[0].id,
      after:args,
    });
    return {id:inserted.rows[0].id};
  });
}

export async function setCampaignStatus(args:{
  campaignId:string;
  status:CampaignStatus;
  actorId:string;
}){
  return withTransaction(async client=>{
    const before=await client.query(
      "SELECT * FROM world_campaigns WHERE id=$1 FOR UPDATE",
      [args.campaignId],
    );
    if(!before.rows[0])throw new Error("Campaign not found.");

    await client.query(
      `UPDATE world_campaigns
       SET status=$2,
           published_at=CASE
             WHEN $2='PUBLISHED' THEN COALESCE(published_at,now())
             ELSE published_at
           END,
           updated_at=now()
       WHERE id=$1`,
      [args.campaignId,args.status],
    );
    await writeAdminAudit(client,{
      actorId:args.actorId,
      action:"CAMPAIGN_STATUS_SET",
      resourceType:"world_campaign",
      resourceId:args.campaignId,
      before:before.rows[0],
      after:{status:args.status},
    });
  });
}
