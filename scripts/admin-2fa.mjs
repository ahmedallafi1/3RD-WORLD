import crypto from "node:crypto";
import pg from "pg";

const {Pool}=pg;
const ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32(buffer){
  let bits="";
  for(const byte of buffer)bits+=byte.toString(2).padStart(8,"0");
  let out="";
  for(let i=0;i<bits.length;i+=5){
    const chunk=bits.slice(i,i+5).padEnd(5,"0");
    out+=ALPHABET[parseInt(chunk,2)];
  }
  return out;
}

const [, , emailArg, actionArg="enable"] = process.argv;
const email=emailArg?.trim().toLowerCase();
const action=actionArg.toLowerCase();

if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required.");
if(!email)throw new Error("Usage: npm run admin:2fa -- owner@example.com [enable|disable]");
if(!["enable","disable"].includes(action))throw new Error("Action must be enable or disable.");

const pool=new Pool({
  connectionString:process.env.DATABASE_URL,
  ssl:process.env.DATABASE_SSL==="true"?{rejectUnauthorized:false}:undefined,
});

const user=await pool.query("SELECT id,email FROM admin_users WHERE email=$1 LIMIT 1",[email]);
if(!user.rows[0]){
  await pool.end();
  throw new Error("Admin user not found.");
}

if(action==="disable"){
  await pool.query(
    "UPDATE admin_users SET totp_enabled=false,totp_secret=NULL,updated_at=now() WHERE id=$1",
    [user.rows[0].id],
  );
  await pool.query("DELETE FROM admin_sessions WHERE admin_user_id=$1",[user.rows[0].id]);
  await pool.end();
  process.stdout.write("2FA disabled and active admin sessions revoked.\n");
  process.exit(0);
}

const secret=base32(crypto.randomBytes(20));
await pool.query(
  "UPDATE admin_users SET totp_secret=$2,totp_enabled=true,updated_at=now() WHERE id=$1",
  [user.rows[0].id,secret],
);
await pool.query("DELETE FROM admin_sessions WHERE admin_user_id=$1",[user.rows[0].id]);
await pool.end();

const issuer=encodeURIComponent("3RD WORLD");
const label=encodeURIComponent("3RD WORLD:"+email);
const url=`otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

process.stdout.write("2FA enabled. Existing admin sessions were revoked.\n");
process.stdout.write("Secret: "+secret+"\n");
process.stdout.write("Authenticator URL: "+url+"\n");
process.stdout.write("Add this secret/URL to an authenticator app, then test login before closing this terminal.\n");
