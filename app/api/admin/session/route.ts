import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  ADMIN_COOKIE,
  createAdminSession,
  destroyAdminSession,
} from "@/lib/auth/session";
import {
  assertRateLimit,
  normalizedIdentity,
  requestFingerprint,
} from "@/lib/security/rate-limit";
import {createAdminMfaChallenge} from "@/lib/security/admin-mfa";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as
    | { email?: string; password?: string }
    | null;

  const email = normalizedIdentity(body?.email);
  const password = body?.password ?? "";
  if (!email || !password || email.length>320 || password.length>1024) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try{
    await assertRateLimit({
      scope:"admin-login",
      fingerprint:requestFingerprint(request.headers),
      identity:email,
      limit:8,
      windowSeconds:900,
    });
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Too many attempts."},
      {status:429,headers:{"Retry-After":"900"}},
    );
  }

  const result = await query<{
    id: string;
    password_hash: string;
    active: boolean;
    totp_enabled: boolean;
  }>(
    `SELECT id, password_hash, active, totp_enabled
     FROM admin_users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );

  const user = result.rows[0];
  if (!user || !user.active || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if(user.totp_enabled){
    const challenge=await createAdminMfaChallenge(user.id);
    return NextResponse.json({
      ok:true,
      mfaRequired:true,
      challengeToken:challenge.token,
    });
  }

  const session = await createAdminSession(user.id);
  const response = NextResponse.json({ ok: true, mfaRequired:false });
  response.cookies.set(ADMIN_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    priority:"high",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  await destroyAdminSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    priority:"high",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
