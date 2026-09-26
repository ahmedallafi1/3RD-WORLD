import {withTransaction,query} from "@/lib/db";
import {writeAdminAudit} from "@/lib/commerce/repositories/audit";

export type ProductMediaRole="COVER"|"GALLERY"|"DETAIL"|"CAMPAIGN";
export type ProductMediaKind="IMAGE"|"VIDEO";

export async function listAdminProductMedia(){
  const result=await query<{
    product_id:string;media_id:string;kind:ProductMediaKind;storage_key:string;
    alt_text:string|null;position:number;role:ProductMediaRole;
  }>(
    `SELECT pm.product_id,pm.media_id,m.kind,m.storage_key,m.alt_text,pm.position,pm.role
     FROM product_media pm
     JOIN media_assets m ON m.id=pm.media_id
     ORDER BY pm.product_id,pm.position,m.created_at`,
  );
  return result.rows.map(row=>({
    productId:row.product_id,
    mediaId:row.media_id,
    kind:row.kind,
    storageKey:row.storage_key,
    altText:row.alt_text,
    position:row.position,
    role:row.role,
  }));
}

export async function attachProductMedia(args:{
  productId:string;
  kind:ProductMediaKind;
  storageKey:string;
  altText?:string|null;
  role:ProductMediaRole;
  position?:number;
  actorId:string;
}){
  const storageKey=args.storageKey.trim();
  const alt=(args.altText??"").trim();
  if(!storageKey||storageKey.length>2048)throw new Error("Valid media URL or storage key is required.");
  if(/^javascript:/i.test(storageKey)||/^data:/i.test(storageKey)){
    throw new Error("Unsupported media location.");
  }
  if(process.env.NODE_ENV==="production"&&/^http:\/\//i.test(storageKey)){
    throw new Error("Production media must use HTTPS.");
  }
  if(alt.length>240)throw new Error("Alt text is too long.");
  const position=args.position??0;
  if(!Number.isInteger(position)||position<0||position>1000)throw new Error("Invalid media position.");

  return withTransaction(async client=>{
    const product=await client.query<{id:string}>(
      "SELECT id FROM products WHERE id=$1 FOR UPDATE",
      [args.productId],
    );
    if(!product.rows[0])throw new Error("Product not found.");

    const asset=await client.query<{id:string}>(
      `INSERT INTO media_assets(kind,storage_key,alt_text)
       VALUES($1,$2,$3)
       ON CONFLICT(storage_key)
       DO UPDATE SET alt_text=COALESCE(EXCLUDED.alt_text,media_assets.alt_text)
       RETURNING id`,
      [args.kind,storageKey,alt||null],
    );

    await client.query(
      `INSERT INTO product_media(product_id,media_id,position,role)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(product_id,media_id)
       DO UPDATE SET position=EXCLUDED.position,role=EXCLUDED.role`,
      [args.productId,asset.rows[0].id,position,args.role],
    );

    await writeAdminAudit(client,{
      actorId:args.actorId,
      action:"PRODUCT_MEDIA_ATTACH",
      resourceType:"product",
      resourceId:args.productId,
      after:{
        mediaId:asset.rows[0].id,
        kind:args.kind,
        storageKey,
        altText:alt||null,
        role:args.role,
        position,
      },
    });

    return {mediaId:asset.rows[0].id};
  });
}

export async function detachProductMedia(args:{
  productId:string;
  mediaId:string;
  actorId:string;
}){
  return withTransaction(async client=>{
    const before=await client.query(
      `SELECT pm.*,m.storage_key,m.kind,m.alt_text
       FROM product_media pm
       JOIN media_assets m ON m.id=pm.media_id
       WHERE pm.product_id=$1 AND pm.media_id=$2
       FOR UPDATE`,
      [args.productId,args.mediaId],
    );
    if(!before.rows[0])throw new Error("Media assignment not found.");

    await client.query(
      "DELETE FROM product_media WHERE product_id=$1 AND media_id=$2",
      [args.productId,args.mediaId],
    );
    await writeAdminAudit(client,{
      actorId:args.actorId,
      action:"PRODUCT_MEDIA_DETACH",
      resourceType:"product",
      resourceId:args.productId,
      before:before.rows[0],
    });
  });
}
