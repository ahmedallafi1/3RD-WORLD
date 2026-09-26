import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import {hashSecurityValue} from "@/lib/security/request";

export const ADMIN_COOKIE = "tw_admin_session";
export const CUSTOMER_COOKIE = "tw_customer_session";

export type AdminRole = "OWNER" | "ADMIN" | "OPERATIONS" | "CONTENT" | "SUPPORT";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export type CustomerUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  passportNumber: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function createAdminSession(adminUserId: string, metadata?: {ipHash?:string;userAgentHash?:string}) {
  const token = newSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

  await query(
    `INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at, ip_hash, user_agent_hash)
     VALUES ($1, $2, $3, $4, $5)`,
    [adminUserId, tokenHash, expiresAt, metadata?.ipHash??null, metadata?.userAgentHash??null],
  );

  return { token, expiresAt };
}

export async function createCustomerSession(customerId: string, metadata?: {ipHash?:string;userAgentHash?:string}) {
  const token = newSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO customer_sessions (customer_id, token_hash, expires_at, ip_hash, user_agent_hash)
     VALUES ($1, $2, $3, $4, $5)`,
    [customerId, tokenHash, expiresAt, metadata?.ipHash??null, metadata?.userAgentHash??null],
  );

  return { token, expiresAt };
}

export async function getAdminUser(): Promise<AdminUser | null> {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.THIRD_WORLD_ADMIN_PREVIEW === "true" &&
    !process.env.DATABASE_URL
  ) {
    return {
      id: "preview",
      email: "preview@3rdworld.local",
      name: "Preview Owner",
      role: "OWNER",
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token || !process.env.DATABASE_URL) return null;

  const result = await query<{
    id: string;
    email: string;
    name: string;
    role: AdminRole;
    user_agent_hash:string|null;
  }>(
    `SELECT u.id, u.email, u.name, u.role, s.user_agent_hash
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.admin_user_id
     WHERE s.token_hash = $1
       AND s.expires_at > now()
       AND u.active = true
     LIMIT 1`,
    [hashToken(token)],
  );

  const row=result.rows[0];
  if(!row)return null;

  if(row.user_agent_hash){
    const headerStore=await headers();
    const currentHash=hashSecurityValue(headerStore.get("user-agent")||"unknown");
    if(currentHash!==row.user_agent_hash){
      await query("DELETE FROM admin_sessions WHERE token_hash=$1",[hashToken(token)]).catch(()=>undefined);
      return null;
    }
  }

  return {
    id:row.id,
    email:row.email,
    name:row.name,
    role:row.role,
  };
}

export async function requireAdminUser(allowed?: AdminRole[]) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  if (allowed && !allowed.includes(user.role)) {
    redirect("/admin");
  }

  return user;
}

export async function getCustomerUser(): Promise<CustomerUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE)?.value;
  if (!token || !process.env.DATABASE_URL) return null;

  const result = await query<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    passport_number: string | null;
    user_agent_hash:string|null;
  }>(
    `SELECT c.id, c.email, c.first_name, c.last_name, c.passport_number, s.user_agent_hash
     FROM customer_sessions s
     JOIN customers c ON c.id = s.customer_id
     WHERE s.token_hash = $1
       AND s.expires_at > now()
       AND c.status = 'ACTIVE'
     LIMIT 1`,
    [hashToken(token)],
  );

  const row = result.rows[0];
  if (!row) return null;

  if(row.user_agent_hash){
    const headerStore=await headers();
    const currentHash=hashSecurityValue(headerStore.get("user-agent")||"unknown");
    if(currentHash!==row.user_agent_hash){
      await query("DELETE FROM customer_sessions WHERE token_hash=$1",[hashToken(token)]).catch(()=>undefined);
      return null;
    }
  }

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    passportNumber: row.passport_number,
  };
}

export async function destroyAdminSession(rawToken?: string) {
  if (!rawToken || !process.env.DATABASE_URL) return;
  await query("DELETE FROM admin_sessions WHERE token_hash = $1", [
    hashToken(rawToken),
  ]);
}

export async function destroyCustomerSession(rawToken?: string) {
  if (!rawToken || !process.env.DATABASE_URL) return;
  await query("DELETE FROM customer_sessions WHERE token_hash = $1", [
    hashToken(rawToken),
  ]);
}
