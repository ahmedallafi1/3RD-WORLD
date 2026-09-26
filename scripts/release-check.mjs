const required=[
  "DATABASE_URL",
  "DROP_ACCESS_SECRET",
  "CRON_SECRET",
  "PUBLIC_SITE_URL",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "EASYPOST_API_KEY",
  "RESEND_API_KEY",
  "NOTIFICATION_FROM_EMAIL",
  "SECURITY_HASH_SECRET",
  "SECURITY_ENCRYPTION_KEY",
];

const missing=required.filter(key=>!process.env[key]);
const problems=[];

if(process.env.CHECKOUT_MODE!=="live")problems.push("CHECKOUT_MODE must be live for production launch.");
if(process.env.THIRD_WORLD_ADMIN_PREVIEW==="true")problems.push("THIRD_WORLD_ADMIN_PREVIEW must be false in production.");
if(process.env.PUBLIC_SITE_URL&&!/^https:\/\//i.test(process.env.PUBLIC_SITE_URL)){
  problems.push("PUBLIC_SITE_URL must use HTTPS.");
}
if((process.env.DROP_ACCESS_SECRET??"").length<32)problems.push("DROP_ACCESS_SECRET should be at least 32 characters.");
if((process.env.CRON_SECRET??"").length<32)problems.push("CRON_SECRET should be at least 32 characters.");
if((process.env.SECURITY_HASH_SECRET??"").length<32)problems.push("SECURITY_HASH_SECRET should be at least 32 characters.");
try{
  const key=Buffer.from(process.env.SECURITY_ENCRYPTION_KEY??"","base64");
  if(key.length!==32)problems.push("SECURITY_ENCRYPTION_KEY must decode to exactly 32 bytes.");
}catch{
  problems.push("SECURITY_ENCRYPTION_KEY is invalid base64.");
}

if(missing.length)problems.push("Missing: "+missing.join(", "));

if(problems.length){
  process.stderr.write("3RD WORLD release check failed:\n- "+problems.join("\n- ")+"\n");
  process.exit(1);
}

process.stdout.write("3RD WORLD production configuration check passed.\n");
