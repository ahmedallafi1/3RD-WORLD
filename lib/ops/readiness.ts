import {isDatabaseConfigured,query} from "@/lib/db";
import {listPublishedContentPages} from "@/lib/content/pages";

export type ReadinessItem={
  key:string;
  ready:boolean;
  required:boolean;
  detail:string;
};

export async function getProductionReadiness(){
  let databaseReady=false;
  if(isDatabaseConfigured()){
    try{
      const result=await query<{ok:number}>("SELECT 1 AS ok");
      databaseReady=result.rows[0]?.ok===1;
    }catch{
      databaseReady=false;
    }
  }

  let corePoliciesReady=false;
  let migrationsReady=false;
  let ownerMfaReady=false;
  let mediaReady=false;
  let customsReady=false;

  if(databaseReady){
    try{
      const published=await listPublishedContentPages();
      const required=new Set(["shipping","returns","privacy","terms"]);
      corePoliciesReady=[...required].every(slug=>
        published.some(page=>page.slug===slug&&page.body.trim()),
      );
    }catch{
      corePoliciesReady=false;
    }

    try{
      const migration=await query<{exists:boolean}>(
        `SELECT EXISTS(
           SELECT 1 FROM schema_migrations WHERE filename='016_release_scale_indexes.sql'
         ) AS exists`,
      );
      migrationsReady=Boolean(migration.rows[0]?.exists);
    }catch{
      migrationsReady=false;
    }

    try{
      const owners=await query<{total:string;protected:string}>(
        `SELECT count(*)::text AS total,
                count(*) FILTER (WHERE totp_enabled=true)::text AS protected
         FROM admin_users
         WHERE active=true AND role='OWNER'`,
      );
      const total=Number(owners.rows[0]?.total??0);
      const protectedCount=Number(owners.rows[0]?.protected??0);
      ownerMfaReady=total>0&&protectedCount===total;
    }catch{
      ownerMfaReady=false;
    }

    try{
      const media=await query<{total:string;covered:string}>(
        `SELECT count(*)::text AS total,
                count(*) FILTER (
                  WHERE EXISTS (
                    SELECT 1 FROM product_media pm
                    WHERE pm.product_id=p.id AND pm.role='COVER'
                  )
                )::text AS covered
         FROM products p
         WHERE p.status='ACTIVE'`,
      );
      const total=Number(media.rows[0]?.total??0);
      const covered=Number(media.rows[0]?.covered??0);
      mediaReady=total===0||covered===total;
    }catch{
      mediaReady=false;
    }

    try{
      const customs=await query<{missing:string}>(
        `SELECT count(*)::text AS missing
         FROM variants v
         JOIN products p ON p.id=v.product_id
         WHERE p.status='ACTIVE'
           AND v.active=true
           AND (
             v.weight_grams IS NULL
             OR v.weight_grams<=0
             OR v.hs_code IS NULL
             OR length(trim(v.hs_code))=0
             OR v.country_of_origin IS NULL
             OR length(trim(v.country_of_origin))<>2
           )`,
      );
      customsReady=Number(customs.rows[0]?.missing??1)===0;
    }catch{
      customsReady=false;
    }
  }

  const live=process.env.CHECKOUT_MODE==="live";
  const items:ReadinessItem[]=[
    {key:"DATABASE",ready:databaseReady,required:true,detail:databaseReady?"CONNECTED":"NOT READY"},
    {key:"MIGRATIONS",ready:migrationsReady,required:true,detail:migrationsReady?"CURRENT THROUGH 016":"RUN npm run db:migrate"},
    {key:"POLICIES",ready:corePoliciesReady,required:true,detail:corePoliciesReady?"PUBLISHED":"SHIPPING / RETURNS / PRIVACY / TERMS"},
    {key:"OWNER 2FA",ready:ownerMfaReady,required:live,detail:ownerMfaReady?"ALL OWNERS PROTECTED":"ENABLE 2FA FOR EVERY ACTIVE OWNER"},
    {key:"PRODUCT MEDIA",ready:mediaReady,required:live,detail:mediaReady?"COVER MEDIA READY":"ACTIVE PRODUCTS NEED COVER MEDIA"},
    {key:"CUSTOMS DATA",ready:customsReady,required:live,detail:customsReady?"WEIGHT / HS / ORIGIN READY":"COMPLETE ACTIVE VARIANT SHIPPING DATA"},
    {key:"PUBLIC URL",ready:Boolean(process.env.PUBLIC_SITE_URL),required:true,detail:process.env.PUBLIC_SITE_URL?"CONFIGURED":"MISSING"},
    {key:"DROP SECRET",ready:Boolean(process.env.DROP_ACCESS_SECRET),required:true,detail:process.env.DROP_ACCESS_SECRET?"CONFIGURED":"MISSING"},
    {key:"CRON SECRET",ready:Boolean(process.env.CRON_SECRET),required:true,detail:process.env.CRON_SECRET?"CONFIGURED":"MISSING"},
    {key:"ADMIN MFA KEY",ready:Boolean(process.env.ADMIN_TOTP_ENCRYPTION_KEY),required:true,detail:process.env.ADMIN_TOTP_ENCRYPTION_KEY?"CONFIGURED":"MISSING"},
    {key:"STRIPE",ready:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),required:true,detail:process.env.STRIPE_SECRET_KEY?"CONFIGURED":"MISSING"},
    {key:"STRIPE WEBHOOK",ready:Boolean(process.env.STRIPE_WEBHOOK_SECRET),required:true,detail:process.env.STRIPE_WEBHOOK_SECRET?"CONFIGURED":"MISSING"},
    {key:"EMAIL",ready:Boolean(process.env.RESEND_API_KEY&&process.env.NOTIFICATION_FROM_EMAIL),required:true,detail:process.env.RESEND_API_KEY?"CONFIGURED":"MISSING"},
    {key:"SHIPPING",ready:Boolean(process.env.EASYPOST_API_KEY),required:true,detail:process.env.EASYPOST_API_KEY?"CONFIGURED":"MISSING"},
    {key:"TAX",ready:process.env.STRIPE_TAX_ENABLED==="true",required:live,detail:process.env.STRIPE_TAX_ENABLED==="true"?"ENABLED":"DISABLED"},
    {key:"FX",ready:Boolean(process.env.OPEN_EXCHANGE_RATES_APP_ID),required:false,detail:process.env.OPEN_EXCHANGE_RATES_APP_ID?"LIVE FX":"EXPLICIT / BASE PRICING"},
  ];

  const required=items.filter(item=>item.required);
  return {
    items,
    ready:required.every(item=>item.ready),
    requiredReady:required.filter(item=>item.ready).length,
    requiredTotal:required.length,
  };
}
