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
  if(databaseReady){
    try{
      const published=await listPublishedContentPages();
      const required=new Set(["shipping","returns","privacy","terms"]);
      corePoliciesReady=[...required].every(slug=>published.some(page=>page.slug===slug&&page.body.trim()));
    }catch{
      corePoliciesReady=false;
    }
  }

  const items:ReadinessItem[]=[
    {key:"DATABASE",ready:databaseReady,required:true,detail:databaseReady?"CONNECTED":"NOT READY"},
    {key:"POLICIES",ready:corePoliciesReady,required:true,detail:corePoliciesReady?"PUBLISHED":"SHIPPING / RETURNS / PRIVACY / TERMS"},
    {key:"PUBLIC URL",ready:Boolean(process.env.PUBLIC_SITE_URL),required:true,detail:process.env.PUBLIC_SITE_URL?"CONFIGURED":"MISSING"},
    {key:"DROP SECRET",ready:Boolean(process.env.DROP_ACCESS_SECRET),required:true,detail:process.env.DROP_ACCESS_SECRET?"CONFIGURED":"MISSING"},
    {key:"CRON SECRET",ready:Boolean(process.env.CRON_SECRET),required:true,detail:process.env.CRON_SECRET?"CONFIGURED":"MISSING"},
    {key:"ADMIN MFA KEY",ready:Boolean(process.env.ADMIN_TOTP_ENCRYPTION_KEY),required:true,detail:process.env.ADMIN_TOTP_ENCRYPTION_KEY?"CONFIGURED":"MISSING"},
    {key:"STRIPE",ready:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),required:true,detail:process.env.STRIPE_SECRET_KEY?"CONFIGURED":"MISSING"},
    {key:"STRIPE WEBHOOK",ready:Boolean(process.env.STRIPE_WEBHOOK_SECRET),required:true,detail:process.env.STRIPE_WEBHOOK_SECRET?"CONFIGURED":"MISSING"},
    {key:"EMAIL",ready:Boolean(process.env.RESEND_API_KEY&&process.env.NOTIFICATION_FROM_EMAIL),required:true,detail:process.env.RESEND_API_KEY?"CONFIGURED":"MISSING"},
    {key:"SHIPPING",ready:Boolean(process.env.EASYPOST_API_KEY),required:true,detail:process.env.EASYPOST_API_KEY?"CONFIGURED":"MISSING"},
    {key:"TAX",ready:process.env.STRIPE_TAX_ENABLED==="true",required:process.env.CHECKOUT_MODE==="live",detail:process.env.STRIPE_TAX_ENABLED==="true"?"ENABLED":"DISABLED"},
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
