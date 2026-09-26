import { products as fallbackProducts, type Product } from "@/lib/catalog";
import { isDatabaseConfigured, query } from "@/lib/db";

type Row={
  slug:string;
  name:string;
  world_code:string|null;
  category:Product["category"];
  description:string;
  size:string;
  color:string;
  price_amount:string;
};

function toneFor(color:string):Product["tone"]{
  const value=color.toLowerCase();
  if(value.includes("burgundy"))return "burgundy";
  if(value.includes("bone")||value.includes("cream"))return "bone";
  if(value.includes("navy"))return "navy";
  if(value.includes("grey")||value.includes("gray"))return "grey";
  return "black";
}

export async function getStorefrontProducts():Promise<Product[]>{
  if(!isDatabaseConfigured())return fallbackProducts;

  try{
    const result=await query<Row>(
      `SELECT p.slug,p.name,w.code AS world_code,p.category,p.description,
              v.size,v.color,v.price_amount
       FROM products p
       LEFT JOIN worlds w ON w.id=p.world_id
       JOIN variants v ON v.product_id=p.id AND v.active=true
       WHERE p.status='ACTIVE'
       ORDER BY p.created_at,v.created_at`,
    );
    const grouped=new Map<string,Product>();
    for(const row of result.rows){
      const existing=grouped.get(row.slug);
      if(existing){
        if(!existing.sizes.includes(row.size))existing.sizes.push(row.size);
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
      });
    }
    return grouped.size?[...grouped.values()]:fallbackProducts;
  }catch{
    return fallbackProducts;
  }
}

export async function getStorefrontProduct(slug:string){
  const all=await getStorefrontProducts();
  return all.find(product=>product.slug===slug);
}
