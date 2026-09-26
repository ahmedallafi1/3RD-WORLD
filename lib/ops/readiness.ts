import {query} from "@/lib/db";
import {getCommerceReadiness} from "@/lib/commerce/readiness";
import {emailDeliveryConfigured} from "@/lib/world-engine/notifications";

export type ReadinessItem={
  key:string;
  ready:boolean;
  required:boolean;
  detail:string;
};

export async function getSystemReadiness(){
  const databaseConfigured=Boolean(process.env.DATABASE_URL);
  let databaseReady=false;
  let pendingMigrations:string[]=[];

  if(databaseConfigured){
    try{
      await query("SELECT 1");
      databaseReady=true;

      const requiredTables=[
        "worlds","drops","drop_products","passport_profiles",
        "notification_outbox","auth_attempts","security_events",
      ];
      const result=await query<{table_name:string}>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema='public' AND table_name=ANY($1::text[])`,
        [requiredTables],
      );
      const present=new Set(result.rows.map(row=>row.table_name));
      pendingMigrations=requiredTables.filter(name=>!present.has(name));
    }catch{
      databaseReady=false;
    }
  }

  const commerce=getCommerceReadiness().map(item=>({
    key:item.key,
    ready:item.ready,
    required:["PAYMENTS","WEBHOOK","SHIPPING"].includes(item.key),
    detail:item.detail,
  }));

  const items:ReadinessItem[]=[
    {
      key:"DATABASE",
      ready:databaseReady&&pendingMigrations.length===0,
      required:true,
      detail:!databaseConfigured?"DATABASE_URL MISSING":
        !databaseReady?"DATABASE UNREACHABLE":
        pendingMigrations.length?"MIGRATIONS MISSING: "+pendingMigrations.join(", "):"CONNECTED / CURRENT",
    },
    {
      key:"ACCESS_SECRET",
      ready:Boolean(process.env.DROP_ACCESS_SECRET),
      required:true,
      detail:process.env.DROP_ACCESS_SECRET?"CONFIGURED":"DROP_ACCESS_SECRET MISSING",
    },
    {
      key:"CRON",
      ready:Boolean(process.env.CRON_SECRET),
      required:true,
      detail:process.env.CRON_SECRET?"PROTECTED":"CRON_SECRET MISSING",
    },
    {
      key:"PUBLIC_URL",
      ready:Boolean(process.env.PUBLIC_SITE_URL),
      required:true,
      detail:process.env.PUBLIC_SITE_URL??"PUBLIC_SITE_URL MISSING",
    },
    {
      key:"EMAIL",
      ready:emailDeliveryConfigured(),
      required:true,
      detail:emailDeliveryConfigured()?"TRANSACTIONAL EMAIL READY":"RESEND / FROM EMAIL MISSING",
    },
    ...commerce,
  ];

  return {
    ready:items.filter(item=>item.required).every(item=>item.ready),
    items,
  };
}
