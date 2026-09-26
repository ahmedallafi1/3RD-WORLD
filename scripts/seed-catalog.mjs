import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const {Pool}=pg;
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required.");

const seed=JSON.parse(
  await fs.readFile(path.join(process.cwd(),"db","seed-catalog.json"),"utf8")
);

const pool=new Pool({
  connectionString:process.env.DATABASE_URL,
  ssl:process.env.DATABASE_SSL==="true"?{rejectUnauthorized:false}:undefined,
});
const client=await pool.connect();
const inventoryPerSize=Math.max(0,Number(process.env.SEED_INVENTORY_PER_SIZE??0));

try{
  await client.query("BEGIN");
  const world=await client.query("SELECT id FROM worlds WHERE code=$1 LIMIT 1",[seed.world]);
  if(!world.rows[0])throw new Error("Seed WORLD not found. Run db:migrate first.");
  const location=await client.query("SELECT id FROM locations WHERE code='nyc-main' LIMIT 1");
  if(!location.rows[0])throw new Error("NYC Main location not found. Run db:migrate first.");

  for(const product of seed.products){
    const productRow=await client.query(
      `INSERT INTO products(world_id,slug,name,category,description,status)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(slug)
       DO UPDATE SET world_id=EXCLUDED.world_id,
                     name=EXCLUDED.name,
                     category=EXCLUDED.category,
                     description=EXCLUDED.description,
                     status=EXCLUDED.status,
                     updated_at=now()
       RETURNING id`,
      [
        world.rows[0].id,
        product.slug,
        product.name,
        product.category,
        product.description,
        product.status??"ACTIVE",
      ],
    );

    for(const size of product.sizes){
      const sku=(product.slug+"-"+size).replace(/[^a-z0-9]+/gi,"-").toUpperCase();
      const variant=await client.query(
        `INSERT INTO variants
         (product_id,sku,title,size,color,price_amount,currency,weight_grams,active)
         VALUES($1,$2,$3,$4,$5,$6,'USD',$7,true)
         ON CONFLICT(sku)
         DO UPDATE SET title=EXCLUDED.title,
                       size=EXCLUDED.size,
                       color=EXCLUDED.color,
                       price_amount=EXCLUDED.price_amount,
                       weight_grams=EXCLUDED.weight_grams,
                       active=true,
                       updated_at=now()
         RETURNING id`,
        [
          productRow.rows[0].id,
          sku,
          size,
          size,
          product.color,
          product.priceAmount,
          product.weightGrams??null,
        ],
      );

      await client.query(
        `INSERT INTO inventory_levels(variant_id,location_id,on_hand,reserved)
         VALUES($1,$2,$3,0)
         ON CONFLICT(variant_id,location_id) DO NOTHING`,
        [variant.rows[0].id,location.rows[0].id,inventoryPerSize],
      );
    }
  }

  await client.query("COMMIT");
  process.stdout.write("catalog seed complete\n");
}catch(error){
  await client.query("ROLLBACK");
  throw error;
}finally{
  client.release();
  await pool.end();
}
