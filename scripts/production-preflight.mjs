import pg from "pg";

const {Pool}=pg;
const checks=[];
const pass=(name,detail="OK")=>checks.push({name,ok:true,detail});
const fail=(name,detail)=>checks.push({name,ok:false,detail});

function requiredEnv(name){
  const value=process.env[name]?.trim();
  if(value)pass(name,"configured");
  else fail(name,"missing");
  return value;
}

const databaseUrl=requiredEnv("DATABASE_URL");
const publicUrl=requiredEnv("PUBLIC_SITE_URL");
requiredEnv("DROP_ACCESS_SECRET");
requiredEnv("CRON_SECRET");
requiredEnv("ADMIN_TOTP_ENCRYPTION_KEY");
requiredEnv("STRIPE_SECRET_KEY");
requiredEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
requiredEnv("STRIPE_WEBHOOK_SECRET");
requiredEnv("EASYPOST_API_KEY");
requiredEnv("RESEND_API_KEY");
requiredEnv("NOTIFICATION_FROM_EMAIL");

if(publicUrl){
  try{
    const parsed=new URL(publicUrl);
    if(parsed.protocol!=="https:")fail("PUBLIC_SITE_URL HTTPS","production URL must use https");
    else pass("PUBLIC_SITE_URL HTTPS");
  }catch{
    fail("PUBLIC_SITE_URL VALID","invalid URL");
  }
}

if(process.env.CHECKOUT_MODE!=="live"){
  fail("CHECKOUT_MODE","must be live for production launch");
}else{
  pass("CHECKOUT_MODE","live");
}

if(process.env.STRIPE_TAX_ENABLED!=="true"){
  fail("STRIPE_TAX_ENABLED","enable only after tax registrations/config are ready");
}else{
  pass("STRIPE_TAX_ENABLED");
}

if(databaseUrl){
  const pool=new Pool({
    connectionString:databaseUrl,
    max:1,
    connectionTimeoutMillis:Number(process.env.DATABASE_CONNECT_TIMEOUT_MS??5000),
    statement_timeout:15000,
    ssl:process.env.DATABASE_SSL==="true"
      ?{rejectUnauthorized:process.env.DATABASE_SSL_REJECT_UNAUTHORIZED!=="false"}
      :undefined,
  });
  try{
    await pool.query("SELECT 1");
    pass("DATABASE CONNECTION");

    const migration=await pool.query(
      "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename='016_release_scale_indexes.sql') AS ok",
    );
    migration.rows[0]?.ok?pass("MIGRATIONS"):fail("MIGRATIONS","run npm run db:migrate");

    const policies=await pool.query(
      `SELECT slug,status,length(trim(body)) AS size
       FROM content_pages
       WHERE slug=ANY($1::text[])`,
      [["shipping","returns","privacy","terms"]],
    );
    const map=new Map(policies.rows.map(row=>[row.slug,row]));
    for(const slug of ["shipping","returns","privacy","terms"]){
      const page=map.get(slug);
      if(page?.status==="PUBLISHED"&&Number(page.size)>0)pass("POLICY "+slug.toUpperCase());
      else fail("POLICY "+slug.toUpperCase(),"publish non-empty content");
    }

    const owners=await pool.query(
      "SELECT count(*)::int AS total,count(*) FILTER (WHERE totp_enabled=true)::int AS protected FROM admin_users WHERE active=true AND role='OWNER'",
    );
    const owner=owners.rows[0];
    if(owner.total>0&&owner.total===owner.protected)pass("OWNER 2FA",String(owner.protected)+" protected");
    else fail("OWNER 2FA",String(owner.protected)+"/"+String(owner.total)+" protected");

    const media=await pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE EXISTS(
                SELECT 1 FROM product_media pm WHERE pm.product_id=p.id AND pm.role='COVER'
              ))::int AS covered
       FROM products p WHERE p.status='ACTIVE'`,
    );
    const mediaRow=media.rows[0];
    if(mediaRow.covered===mediaRow.total)pass("PRODUCT COVER MEDIA",String(mediaRow.covered)+" products");
    else fail("PRODUCT COVER MEDIA",String(mediaRow.covered)+"/"+String(mediaRow.total)+" covered");

    const customs=await pool.query(
      `SELECT count(*)::int AS missing
       FROM variants v JOIN products p ON p.id=v.product_id
       WHERE p.status='ACTIVE' AND v.active=true
         AND (v.weight_grams IS NULL OR v.weight_grams<=0 OR v.hs_code IS NULL
              OR length(trim(v.hs_code))=0 OR v.country_of_origin IS NULL
              OR length(trim(v.country_of_origin))<>2)`,
    );
    customs.rows[0].missing===0
      ?pass("CUSTOMS DATA")
      :fail("CUSTOMS DATA",String(customs.rows[0].missing)+" active variants incomplete");

    const inventory=await pool.query(
      `SELECT count(*)::int AS sellable
       FROM variants v JOIN products p ON p.id=v.product_id
       WHERE p.status='ACTIVE' AND v.active=true
         AND EXISTS(
           SELECT 1 FROM inventory_levels il
           WHERE il.variant_id=v.id AND il.on_hand-il.reserved>0
         )`,
    );
    Number(inventory.rows[0].sellable)>0
      ?pass("SELLABLE INVENTORY",String(inventory.rows[0].sellable)+" variants")
      :fail("SELLABLE INVENTORY","no active variant has available stock");
  }catch(error){
    fail("DATABASE PREFLIGHT",error instanceof Error?error.message:"database check failed");
  }finally{
    await pool.end();
  }
}

const longest=Math.max(...checks.map(check=>check.name.length),10);
for(const check of checks){
  process.stdout.write(
    (check.ok?"PASS ":"FAIL ")+check.name.padEnd(longest)+"  "+check.detail+"\n",
  );
}
const failures=checks.filter(check=>!check.ok);
process.stdout.write("\n"+(failures.length?"NOT READY":"READY FOR FINAL LIVE SMOKE TEST")+"\n");
if(failures.length)process.exitCode=1;
