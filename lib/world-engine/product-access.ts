import {query} from "@/lib/db";
import {evaluateDropAccess} from "@/lib/world-engine/access";
import {dropAccessCookieName} from "@/lib/world-engine/security";
import type {DropAccessDecision,DropRecord} from "@/lib/world-engine/types";

export type ProductDropGate={
  productId:string;
  drop:DropRecord;
  maxPerCustomer:number;
};

export async function getProductDropGateBySlug(slug:string):Promise<ProductDropGate|null>{
  const result=await query<{
    product_id:string;drop_id:string;world_id:string;world_code:string;world_slug:string;
    name:string;drop_slug:string;status:string;access_mode:DropRecord["accessMode"];
    early_access_at:Date|null;opens_at:Date|null;closes_at:Date|null;
    headline:string|null;subheadline:string|null;waitlist_enabled:boolean;
    per_variant_limit:number;max_per_customer:number|null;
  }>(
    `SELECT p.id AS product_id,d.id AS drop_id,d.world_id,w.code AS world_code,w.slug AS world_slug,
            d.name,d.slug AS drop_slug,d.status,d.access_mode,d.early_access_at,d.opens_at,d.closes_at,
            d.headline,d.subheadline,d.waitlist_enabled,d.per_variant_limit,dp.max_per_customer
     FROM products p
     JOIN drop_products dp ON dp.product_id=p.id
     JOIN drops d ON d.id=dp.drop_id
     JOIN worlds w ON w.id=d.world_id
     WHERE p.slug=$1
       AND d.status IN ('DRAFT','SCHEDULED','LIVE','CLOSED','ARCHIVED')
     ORDER BY COALESCE(d.opens_at,d.created_at) DESC
     LIMIT 1`,
    [slug],
  );
  const row=result.rows[0];
  if(!row)return null;
  return {
    productId:row.product_id,
    maxPerCustomer:row.max_per_customer??row.per_variant_limit,
    drop:{
      id:row.drop_id,
      worldId:row.world_id,
      worldCode:row.world_code,
      worldSlug:row.world_slug,
      name:row.name,
      slug:row.drop_slug,
      status:row.status,
      accessMode:row.access_mode,
      earlyAccessAt:row.early_access_at?.toISOString()??null,
      opensAt:row.opens_at?.toISOString()??null,
      closesAt:row.closes_at?.toISOString()??null,
      headline:row.headline,
      subheadline:row.subheadline,
      waitlistEnabled:row.waitlist_enabled,
      perVariantLimit:row.per_variant_limit,
    },
  };
}

export async function evaluateProductAccess(args:{
  slug:string;
  customerId?:string|null;
  email?:string|null;
  accessTokens?:Record<string,string>;
}):Promise<{gate:ProductDropGate|null;decision:DropAccessDecision|null;granted:boolean}>{
  const gate=await getProductDropGateBySlug(args.slug);
  if(!gate)return {gate:null,decision:null,granted:true};

  const token=args.accessTokens?.[dropAccessCookieName(gate.drop.slug)]??null;
  const decision=await evaluateDropAccess({
    drop:gate.drop,
    customerId:args.customerId,
    email:args.email,
    sessionToken:token,
  });
  return {gate,decision,granted:decision.granted};
}

export async function isProductPubliclyVisible(slug:string){
  const access=await evaluateProductAccess({slug});
  return access.granted || access.decision?.phase==="CLOSED";
}

export async function assertProductCheckoutAccess(args:{
  slug:string;
  customerId?:string|null;
  email?:string|null;
  accessTokens?:Record<string,string>;
}){
  const access=await evaluateProductAccess(args);
  if(!access.granted){
    const world=access.gate?.drop.worldCode??"this release";
    throw new Error(`${world} requires active drop access before checkout.`);
  }
  return access;
}
