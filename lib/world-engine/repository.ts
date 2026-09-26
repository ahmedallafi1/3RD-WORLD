import {isDatabaseConfigured,query} from "@/lib/db";
import {products as fallbackProducts,type Product} from "@/lib/catalog";
import type {DropRecord,WorldRecord} from "@/lib/world-engine/types";

export async function listArchiveWorlds():Promise<WorldRecord[]>{
  if(!isDatabaseConfigured()){
    return [{
      id:"preview-world-001",
      code:"WORLD 001",
      title:"NO BORDERS",
      slug:"001",
      status:"LIVE",
      year:2026,
      tagline:"NO BORDERS.",
      description:"The first transmission from 3RD WORLD.",
      accentColor:null,
      launchAt:null,
      closeAt:null,
    }];
  }

  const result=await query<{
    id:string;code:string;title:string;slug:string;status:string;year:number|null;
    tagline:string|null;description:string|null;accent_color:string|null;
    launch_at:Date|null;close_at:Date|null;
  }>(
    `SELECT id,code,title,slug,status,year,tagline,description,accent_color,launch_at,close_at
     FROM worlds
     WHERE public_archive=true
       AND (
         status IN ('CLOSED','ARCHIVED')
         OR (
           status='LIVE'
           AND NOT EXISTS (
             SELECT 1 FROM drops d
             WHERE d.world_id=worlds.id
               AND d.status='LIVE'
               AND d.access_mode<>'PUBLIC'
               AND (d.closes_at IS NULL OR d.closes_at>now())
           )
         )
       )
     ORDER BY COALESCE(launch_at,created_at) DESC`
  );

  return result.rows.map(row=>({
    id:row.id,
    code:row.code,
    title:row.title,
    slug:row.slug,
    status:row.status,
    year:row.year,
    tagline:row.tagline,
    description:row.description,
    accentColor:row.accent_color,
    launchAt:row.launch_at?.toISOString()??null,
    closeAt:row.close_at?.toISOString()??null,
  }));
}

export async function getWorld(slug:string):Promise<WorldRecord|null>{
  if(!isDatabaseConfigured()){
    const worlds=await listArchiveWorlds();
    return worlds.find(world=>world.slug===slug)??null;
  }

  const result=await query<{
    id:string;code:string;title:string;slug:string;status:string;year:number|null;
    tagline:string|null;description:string|null;accent_color:string|null;
    launch_at:Date|null;close_at:Date|null;
  }>(
    `SELECT id,code,title,slug,status,year,tagline,description,accent_color,launch_at,close_at
     FROM worlds
     WHERE slug=$1
       AND public_archive=true
       AND (
         status IN ('CLOSED','ARCHIVED')
         OR (
           status='LIVE'
           AND NOT EXISTS (
             SELECT 1 FROM drops d
             WHERE d.world_id=worlds.id
               AND d.status='LIVE'
               AND d.access_mode<>'PUBLIC'
               AND (d.closes_at IS NULL OR d.closes_at>now())
           )
         )
       )
     LIMIT 1`,
    [slug],
  );
  const row=result.rows[0];
  return row?{
    id:row.id,code:row.code,title:row.title,slug:row.slug,status:row.status,year:row.year,
    tagline:row.tagline,description:row.description,accentColor:row.accent_color,
    launchAt:row.launch_at?.toISOString()??null,closeAt:row.close_at?.toISOString()??null,
  }:null;
}

export async function getWorldProducts(worldId:string):Promise<Product[]>{
  if(!isDatabaseConfigured())return fallbackProducts;

  const result=await query<{
    slug:string;name:string;world_code:string;category:Product["category"];
    description:string;size:string;color:string;price_amount:string;
  }>(
    `SELECT p.slug,p.name,w.code AS world_code,p.category,p.description,
            v.size,v.color,v.price_amount
     FROM products p
     JOIN worlds w ON w.id=p.world_id
     JOIN variants v ON v.product_id=p.id AND v.active=true
     WHERE p.world_id=$1 AND p.status='ACTIVE'
       AND NOT EXISTS (
         SELECT 1
         FROM drop_products dp
         JOIN drops d ON d.id=dp.drop_id
         WHERE dp.product_id=p.id
           AND d.status IN ('DRAFT','SCHEDULED','LIVE')
           AND (d.closes_at IS NULL OR d.closes_at>now())
           AND NOT (
             d.status='LIVE'
             AND d.access_mode='PUBLIC'
             AND (d.opens_at IS NULL OR d.opens_at<=now())
             AND (d.closes_at IS NULL OR d.closes_at>now())
           )
       )
     ORDER BY p.created_at,v.created_at`,
    [worldId],
  );

  const grouped=new Map<string,Product>();
  for(const row of result.rows){
    const existing=grouped.get(row.slug);
    if(existing){
      if(!existing.sizes.includes(row.size))existing.sizes.push(row.size);
      continue;
    }
    const color=row.color.toLowerCase();
    const tone:Product["tone"]=color.includes("burgundy")?"burgundy":
      color.includes("bone")||color.includes("cream")?"bone":
      color.includes("navy")?"navy":
      color.includes("grey")||color.includes("gray")?"grey":"black";
    grouped.set(row.slug,{
      slug:row.slug,name:row.name,world:row.world_code,
      price:Number(row.price_amount)/100,color:row.color,category:row.category,
      sizes:[row.size],description:row.description,material:"See product details",
      fit:"See size guide",tone,status:"AVAILABLE",
    });
  }
  return [...grouped.values()];
}

export async function listWorldCampaigns(worldId:string){
  if(!isDatabaseConfigured())return [];
  const result=await query<{
    id:string;type:string;title:string;slug:string;eyebrow:string|null;body:string|null;position:number;
  }>(
    `SELECT id,type,title,slug,eyebrow,body,position
     FROM world_campaigns
     WHERE world_id=$1 AND status='PUBLISHED'
     ORDER BY position,published_at,created_at`,
    [worldId],
  );
  return result.rows;
}

export async function getDropBySlug(slug:string):Promise<DropRecord|null>{
  if(!isDatabaseConfigured()){
    if(slug!=="002")return null;
    return {
      id:"preview-drop-002",worldId:"preview-world-002",worldCode:"WORLD 002",worldSlug:"002",
      name:"DROP 002",slug:"002",status:"SCHEDULED",accessMode:"EMAIL",
      earlyAccessAt:null,opensAt:process.env.NEXT_PUBLIC_DROP_OPENS_AT??null,closesAt:null,
      headline:"WORLD 002",subheadline:"FIRST ACCESS",waitlistEnabled:true,perVariantLimit:2,
    };
  }

  const result=await query<{
    id:string;world_id:string;world_code:string;world_slug:string;name:string;slug:string;
    status:string;access_mode:DropRecord["accessMode"];early_access_at:Date|null;
    opens_at:Date|null;closes_at:Date|null;headline:string|null;subheadline:string|null;
    waitlist_enabled:boolean;per_variant_limit:number;
  }>(
    `SELECT d.id,d.world_id,w.code AS world_code,w.slug AS world_slug,d.name,d.slug,d.status,
            d.access_mode,d.early_access_at,d.opens_at,d.closes_at,d.headline,d.subheadline,
            d.waitlist_enabled,d.per_variant_limit
     FROM drops d
     JOIN worlds w ON w.id=d.world_id
     WHERE d.slug=$1
     LIMIT 1`,
    [slug],
  );
  const row=result.rows[0];
  return row?{
    id:row.id,worldId:row.world_id,worldCode:row.world_code,worldSlug:row.world_slug,
    name:row.name,slug:row.slug,status:row.status,accessMode:row.access_mode,
    earlyAccessAt:row.early_access_at?.toISOString()??null,
    opensAt:row.opens_at?.toISOString()??null,closesAt:row.closes_at?.toISOString()??null,
    headline:row.headline,subheadline:row.subheadline,waitlistEnabled:row.waitlist_enabled,
    perVariantLimit:row.per_variant_limit,
  }:null;
}

export async function getPrimaryDrop():Promise<DropRecord|null>{
  if(!isDatabaseConfigured())return getDropBySlug("002");
  const result=await query<{slug:string}>(
    `SELECT slug FROM drops
     WHERE status IN ('LIVE','SCHEDULED')
     ORDER BY CASE WHEN status='LIVE' THEN 0 ELSE 1 END,
              COALESCE(opens_at,created_at)
     LIMIT 1`,
  );
  return result.rows[0]?getDropBySlug(result.rows[0].slug):null;
}

export async function getDropProducts(dropId:string):Promise<Product[]>{
  if(!isDatabaseConfigured())return fallbackProducts.slice(0,4);

  const result=await query<{
    slug:string;name:string;world_code:string;category:Product["category"];
    description:string;size:string;color:string;price_amount:string;position:number;
  }>(
    `SELECT p.slug,p.name,w.code AS world_code,p.category,p.description,
            v.size,v.color,v.price_amount,dp.position
     FROM drop_products dp
     JOIN products p ON p.id=dp.product_id
     JOIN worlds w ON w.id=p.world_id
     JOIN variants v ON v.product_id=p.id AND v.active=true
     WHERE dp.drop_id=$1 AND p.status='ACTIVE'
     ORDER BY dp.position,p.created_at,v.created_at`,
    [dropId],
  );

  const grouped=new Map<string,Product>();
  for(const row of result.rows){
    const existing=grouped.get(row.slug);
    if(existing){
      if(!existing.sizes.includes(row.size))existing.sizes.push(row.size);
      continue;
    }
    const color=row.color.toLowerCase();
    const tone:Product["tone"]=color.includes("burgundy")?"burgundy":
      color.includes("bone")||color.includes("cream")?"bone":
      color.includes("navy")?"navy":
      color.includes("grey")||color.includes("gray")?"grey":"black";
    grouped.set(row.slug,{
      slug:row.slug,name:row.name,world:row.world_code,
      price:Number(row.price_amount)/100,color:row.color,category:row.category,
      sizes:[row.size],description:row.description,material:"See product details",
      fit:"See size guide",tone,status:"AVAILABLE",
    });
  }
  return [...grouped.values()];
}
