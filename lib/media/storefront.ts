import {query} from "@/lib/db";
import type {Product,ProductMedia} from "@/lib/catalog";
import {resolveMediaUrl} from "@/lib/media/urls";

export async function attachProductMedia(products:Product[]):Promise<Product[]>{
  if(!products.length||!process.env.DATABASE_URL)return products;
  const slugs=[...new Set(products.map(product=>product.slug))];

  const result=await query<{
    slug:string;
    kind:"IMAGE"|"VIDEO";
    storage_key:string;
    alt_text:string|null;
    role:ProductMedia["role"];
    position:number;
  }>(
    `SELECT p.slug,m.kind,m.storage_key,m.alt_text,pm.role,pm.position
     FROM products p
     JOIN product_media pm ON pm.product_id=p.id
     JOIN media_assets m ON m.id=pm.media_id
     WHERE p.slug=ANY($1::text[])
     ORDER BY p.slug,
              CASE pm.role WHEN 'COVER' THEN 0 WHEN 'GALLERY' THEN 1 WHEN 'DETAIL' THEN 2 ELSE 3 END,
              pm.position,
              m.created_at`,
    [slugs],
  );

  const bySlug=new Map<string,ProductMedia[]>();
  for(const row of result.rows){
    const src=resolveMediaUrl(row.storage_key);
    if(!src)continue;
    const list=bySlug.get(row.slug)??[];
    list.push({
      src,
      alt:row.alt_text?.trim()||"",
      role:row.role,
      kind:row.kind,
    });
    bySlug.set(row.slug,list);
  }

  return products.map(product=>({
    ...product,
    media:bySlug.get(product.slug)??product.media,
  }));
}
