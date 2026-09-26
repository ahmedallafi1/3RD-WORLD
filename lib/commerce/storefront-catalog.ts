import { products as fallbackProducts, type Product } from "@/lib/catalog";
import { isDatabaseConfigured, query } from "@/lib/db";
import {attachProductMedia} from "@/lib/media/storefront";

type Row={
  slug:string;
  name:string;
  world_code:string|null;
  category:Product["category"];
  description:string;
  size:string;
  color:string;
  price_amount:string;
  available:string;
};

function toneFor(color:string):Product["tone"]{
  const value=color.toLowerCase();
  if(value.includes("burgundy"))return "burgundy";
  if(value.includes("bone")||value.includes("cream"))return "bone";
  if(value.includes("navy"))return "navy";
  if(value.includes("grey")||value.includes("gray"))return "grey";
  return "black";
}

function groupRows(rows:Row[]):Product[]{
  const grouped=new Map<string,Product&{_available:number}>();
  for(const row of rows){
    const existing=grouped.get(row.slug);
    if(existing){
      if(!existing.sizes.includes(row.size))existing.sizes.push(row.size);
      existing._available+=Number(row.available);
      continue;
    }
    grouped.set(row.slug,{
      slug:row.slug,
      name:row.name,
      world:row.world_code??"3RD WORLD",
      price:Number(row.price_amount)/100,
      color:row.color,
      category:row.category,
      sizes:[row.size],
      description:row.description,
      material:"See product details",
      fit:"See size guide",
      tone:toneFor(row.color),
      status:"AVAILABLE",
      _available:Number(row.available),
    });
  }

  return [...grouped.values()].map(({_available,...product})=>({
    ...product,
    status:_available>0?"AVAILABLE":"SOLD OUT",
  }));
}

const baseSelect=`
  SELECT p.slug,p.name,w.code AS world_code,p.category,p.description,
         v.size,v.color,v.price_amount,
         COALESCE((
           SELECT sum(GREATEST(il.on_hand-il.reserved,0))
           FROM inventory_levels il
           WHERE il.variant_id=v.id
         ),0)::text AS available
  FROM products p
  LEFT JOIN worlds w ON w.id=p.world_id
  JOIN variants v ON v.product_id=p.id AND v.active=true
`;

export async function getStorefrontProducts():Promise<Product[]>{
  if(!isDatabaseConfigured())return fallbackProducts;

  try{
    const result=await query<Row>(
      baseSelect+`
       WHERE p.status='ACTIVE'
         AND (
           NOT EXISTS (
             SELECT 1 FROM drop_products any_dp WHERE any_dp.product_id=p.id
           )
           OR EXISTS (
             SELECT 1
             FROM drop_products dp
             JOIN drops d ON d.id=dp.drop_id
             WHERE dp.product_id=p.id
               AND d.status='LIVE'
               AND d.access_mode='PUBLIC'
               AND (d.opens_at IS NULL OR d.opens_at<=now())
               AND (d.closes_at IS NULL OR d.closes_at>now())
           )
         )
       ORDER BY p.created_at,v.created_at`,
    );
    return attachProductMedia(groupRows(result.rows));
  }catch{
    // Fail closed when the database-backed release rules cannot be evaluated.
    return [];
  }
}

export async function getStorefrontProductRaw(slug:string):Promise<Product|null>{
  if(!isDatabaseConfigured()){
    return fallbackProducts.find(product=>product.slug===slug)??null;
  }

  try{
    const result=await query<Row>(
      baseSelect+`
       WHERE p.status='ACTIVE' AND p.slug=$1
       ORDER BY v.created_at`,
      [slug],
    );
    const product=groupRows(result.rows)[0]??null;
    if(!product)return null;
    return (await attachProductMedia([product]))[0]??product;
  }catch{
    return null;
  }
}

export async function getStorefrontProduct(slug:string){
  const all=await getStorefrontProducts();
  return all.find(product=>product.slug===slug);
}
