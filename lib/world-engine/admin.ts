import {randomBytes} from "node:crypto";
import {query,withTransaction} from "@/lib/db";
import {writeAdminAudit} from "@/lib/commerce/repositories/audit";
import {hashAccessCode} from "@/lib/world-engine/security";

export type AdminDropInput={
  worldId:string;
  name:string;
  slug:string;
  status:"DRAFT"|"SCHEDULED"|"LIVE"|"CLOSED"|"ARCHIVED";
  accessMode:"PUBLIC"|"EMAIL"|"CODE"|"PRIVATE";
  earlyAccessAt?:string|null;
  opensAt?:string|null;
  closesAt?:string|null;
  headline?:string|null;
  subheadline?:string|null;
  waitlistEnabled?:boolean;
  perVariantLimit?:number;
};

export async function listAdminWorldOptions(){
  const result=await query<{id:string;code:string;title:string;slug:string;status:string}>(
    `SELECT id,code,title,slug,status
     FROM worlds
     WHERE status<>'ARCHIVED'
     ORDER BY created_at DESC`,
  );
  return result.rows;
}

export async function createDrop(input:AdminDropInput,actorId:string){
  if(!input.worldId||!input.name.trim()||!input.slug.trim()){
    throw new Error("World, name and slug are required.");
  }
  const limit=input.perVariantLimit??2;
  if(!Number.isInteger(limit)||limit<=0)throw new Error("Per-variant limit must be positive.");

  return withTransaction(async client=>{
    const result=await client.query<{id:string}>(
      `INSERT INTO drops
       (world_id,name,slug,status,access_mode,early_access_at,opens_at,closes_at,
        headline,subheadline,waitlist_enabled,per_variant_limit)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        input.worldId,
        input.name.trim(),
        input.slug.trim().toLowerCase(),
        input.status,
        input.accessMode,
        input.earlyAccessAt||null,
        input.opensAt||null,
        input.closesAt||null,
        input.headline?.trim()||null,
        input.subheadline?.trim()||null,
        input.waitlistEnabled??true,
        limit,
      ],
    );
    await writeAdminAudit(client,{
      actorId,
      action:"DROP_CREATE",
      resourceType:"drop",
      resourceId:result.rows[0].id,
      after:input,
    });
    return {id:result.rows[0].id};
  });
}

export async function createDropAccessCode(args:{
  dropId:string;
  actorId:string;
  code?:string;
  label?:string;
  maxUses?:number|null;
  startsAt?:string|null;
  endsAt?:string|null;
}){
  const rawCode=(args.code?.trim()||("3W-"+randomBytes(4).toString("hex"))).toUpperCase();
  if(rawCode.length<4)throw new Error("Access code is too short.");
  if(args.maxUses!==undefined&&args.maxUses!==null&&(!Number.isInteger(args.maxUses)||args.maxUses<=0)){
    throw new Error("Max uses must be a positive integer.");
  }

  return withTransaction(async client=>{
    const inserted=await client.query<{id:string}>(
      `INSERT INTO drop_access_codes
       (drop_id,label,code_hash,max_uses,starts_at,ends_at,active)
       VALUES($1,$2,$3,$4,$5,$6,true)
       RETURNING id`,
      [
        args.dropId,
        args.label?.trim()||null,
        hashAccessCode(rawCode),
        args.maxUses??null,
        args.startsAt||null,
        args.endsAt||null,
      ],
    );
    await writeAdminAudit(client,{
      actorId,
      action:"DROP_ACCESS_CODE_CREATE",
      resourceType:"drop_access_code",
      resourceId:inserted.rows[0].id,
      after:{
        dropId:args.dropId,
        label:args.label??null,
        maxUses:args.maxUses??null,
        startsAt:args.startsAt??null,
        endsAt:args.endsAt??null,
      },
    });
    return {id:inserted.rows[0].id,code:rawCode};
  });
}
