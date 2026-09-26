import {query,withTransaction} from "@/lib/db";
import {writeAdminAudit} from "@/lib/commerce/repositories/audit";
import type {PassportTier} from "@/lib/world-engine/types";

export async function listAccessGrants(limit=100){
  const result=await query<{
    id:string;drop_name:string;world_code:string;email:string|null;grant_type:string;
    starts_at:Date|null;ends_at:Date|null;created_at:Date;
  }>(
    `SELECT g.id,d.name AS drop_name,w.code AS world_code,g.email,g.grant_type,
            g.starts_at,g.ends_at,g.created_at
     FROM drop_access_grants g
     JOIN drops d ON d.id=g.drop_id
     JOIN worlds w ON w.id=d.world_id
     ORDER BY g.created_at DESC
     LIMIT $1`,
    [Math.max(1,Math.min(limit,250))],
  );
  return result.rows.map(row=>({
    id:row.id,
    dropName:row.drop_name,
    worldCode:row.world_code,
    email:row.email,
    grantType:row.grant_type,
    startsAt:row.starts_at?.toISOString()??null,
    endsAt:row.ends_at?.toISOString()??null,
    createdAt:row.created_at.toISOString(),
  }));
}

export async function createAccessGrant(args:{
  dropId:string;
  email:string;
  grantType:"EARLY"|"VIP"|"PRIVATE";
  startsAt?:string|null;
  endsAt?:string|null;
  actorId:string;
}){
  const email=args.email.trim().toLowerCase();
  if(!email||!email.includes("@"))throw new Error("Valid email is required.");

  return withTransaction(async client=>{
    const customer=await client.query<{id:string}>(
      "SELECT id FROM customers WHERE lower(email)=lower($1) LIMIT 1",
      [email],
    );
    const inserted=await client.query<{id:string}>(
      `INSERT INTO drop_access_grants
       (drop_id,customer_id,email,grant_type,starts_at,ends_at,source)
       VALUES($1,$2,$3,$4,$5,$6,'ADMIN')
       RETURNING id`,
      [
        args.dropId,
        customer.rows[0]?.id??null,
        email,
        args.grantType,
        args.startsAt||null,
        args.endsAt||null,
      ],
    );
    await writeAdminAudit(client,{
      actorId:args.actorId,
      action:"DROP_ACCESS_GRANT_CREATE",
      resourceType:"drop_access_grant",
      resourceId:inserted.rows[0].id,
      after:{
        dropId:args.dropId,
        email,
        grantType:args.grantType,
        startsAt:args.startsAt??null,
        endsAt:args.endsAt??null,
      },
    });
    return {id:inserted.rows[0].id};
  });
}

export async function setPassportTier(args:{
  email:string;
  tier:PassportTier;
  actorId:string;
}){
  const email=args.email.trim().toLowerCase();
  if(!email||!email.includes("@"))throw new Error("Valid email is required.");

  return withTransaction(async client=>{
    const customer=await client.query<{id:string}>(
      "SELECT id FROM customers WHERE lower(email)=lower($1) LIMIT 1",
      [email],
    );
    if(!customer.rows[0])throw new Error("Passport account not found.");

    const before=await client.query<{tier:string}>(
      "SELECT tier FROM passport_profiles WHERE customer_id=$1",
      [customer.rows[0].id],
    );
    await client.query(
      `INSERT INTO passport_profiles(customer_id,tier)
       VALUES($1,$2)
       ON CONFLICT(customer_id)
       DO UPDATE SET tier=EXCLUDED.tier,updated_at=now()`,
      [customer.rows[0].id,args.tier],
    );
    await writeAdminAudit(client,{
      actorId:args.actorId,
      action:"PASSPORT_TIER_SET",
      resourceType:"customer",
      resourceId:customer.rows[0].id,
      before:before.rows[0]??null,
      after:{tier:args.tier},
    });
    return {customerId:customer.rows[0].id,tier:args.tier};
  });
}

export async function listPassportTiers(limit=100){
  const result=await query<{
    email:string;passport_number:string|null;tier:PassportTier;updated_at:Date;
  }>(
    `SELECT c.email,c.passport_number,p.tier,p.updated_at
     FROM passport_profiles p
     JOIN customers c ON c.id=p.customer_id
     ORDER BY
       CASE p.tier WHEN 'VIP' THEN 0 WHEN 'EARLY' THEN 1 ELSE 2 END,
       p.updated_at DESC
     LIMIT $1`,
    [Math.max(1,Math.min(limit,250))],
  );
  return result.rows.map(row=>({
    email:row.email,
    passportNumber:row.passport_number,
    tier:row.tier,
    updatedAt:row.updated_at.toISOString(),
  }));
}
