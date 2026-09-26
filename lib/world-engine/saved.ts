import {query} from "@/lib/db";
import type {Product} from "@/lib/catalog";

export async function isProductSaved(customerId:string,slug:string){
  const result=await query<{saved:boolean}>(
    `SELECT EXISTS(
       SELECT 1
       FROM saved_products s
       JOIN products p ON p.id=s.product_id
       WHERE s.customer_id=$1 AND p.slug=$2
     ) AS saved`,
    [customerId,slug],
  );
  return Boolean(result.rows[0]?.saved);
}

export async function setProductSaved(args:{
  customerId:string;
  slug:string;
  saved:boolean;
}){
  if(args.saved){
    const result=await query<{id:string}>(
      `INSERT INTO saved_products(customer_id,product_id)
       SELECT $1,p.id FROM products p WHERE p.slug=$2
       ON CONFLICT(customer_id,product_id) DO NOTHING
       RETURNING product_id AS id`,
      [args.customerId,args.slug],
    );
    if(!result.rows[0]){
      const exists=await query<{id:string}>("SELECT id FROM products WHERE slug=$1",[args.slug]);
      if(!exists.rows[0])throw new Error("Product not found.");
    }
  }else{
    await query(
      `DELETE FROM saved_products s
       USING products p
       WHERE s.product_id=p.id AND s.customer_id=$1 AND p.slug=$2`,
      [args.customerId,args.slug],
    );
  }
}

export async function listSavedProducts(customerId:string):Promise<Product[]>{
  const result=await query<{
    slug:string;name:string;world_code:string|null;category:Product["category"];
    description:string;size:string;color:string;price_amount:string;available:string;
  }>(
    `SELECT p.slug,p.name,w.code AS world_code,p.category,p.description,
            v.size,v.color,v.price_amount,
            COALESCE((
              SELECT sum(GREATEST(il.on_hand-il.reserved,0))
              FROM inventory_levels il WHERE il.variant_id=v.id
            ),0)::text AS available
     FROM saved_products s
     JOIN products p ON p.id=s.product_id
     LEFT JOIN worlds w ON w.id=p.world_id
     JOIN variants v ON v.product_id=p.id AND v.active=true
     WHERE s.customer_id=$1 AND p.status='ACTIVE'
     ORDER BY s.created_at DESC,v.created_at`,
    [customerId],
  );

  const grouped=new Map<string,Product&{_available:number}>();
  for(const row of result.rows){
    const existing=grouped.get(row.slug);
    if(existing){
      if(!existing.sizes.includes(row.size))existing.sizes.push(row.size);
      existing._available+=Number(row.available);
      continue;
    }
    const color=row.color.toLowerCase();
    const tone:Product["tone"]=color.includes("burgundy")?"burgundy":
      color.includes("bone")||color.includes("cream")?"bone":
      color.includes("navy")?"navy":
      color.includes("grey")||color.includes("gray")?"grey":"black";
    grouped.set(row.slug,{
      slug:row.slug,name:row.name,world:row.world_code??"3RD WORLD",
      price:Number(row.price_amount)/100,color:row.color,category:row.category,
      sizes:[row.size],description:row.description,material:"See product details",
      fit:"See size guide",tone,status:"AVAILABLE",_available:Number(row.available),
    });
  }

  return [...grouped.values()].map(({_available,...product})=>({
    ...product,
    status:_available>0?"AVAILABLE":"SOLD OUT",
  }));
}
