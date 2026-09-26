import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {verifyTotp} from "@/lib/auth/totp";
import {
  ADMIN_COOKIE,
  createAdminSession,
  destroyAdminSession,
} from "@/lib/auth/session";
import {
  assertAuthRateLimit,
  recordAuthAttempt,
} from "@/lib/security/auth-rate-limit";
import {requestSessionMetadata} from "@/lib/security/request";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as
    | { email?: string; password?: string; code?:string }
    | null;

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  let rate;
  try{
    rate=await assertAuthRateLimit({request,email,scope:"ADMIN"});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Too many attempts."},
      {status:429},
    );
  }

  const result = await query<{
    id: string;
    password_hash: string;
    active: boolean;
    totp_secret:string|null;
    totp_enabled:boolean;
  }>(
    `SELECT id, password_hash, active, totp_secret, totp_enabled
     FROM admin_users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );

  const user = result.rows[0];
  const passwordValid=Boolean(
    user &&
    user.active &&
    await verifyPassword(password,user.password_hash)
  );

  if(!passwordValid){
    await recordAuthAttempt({...rate,scope:"ADMIN",success:false});
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  if(user.totp_enabled){
    if(!body?.code){
      return NextResponse.json(
        {error:"Two-factor code required.",code:"TWO_FACTOR_REQUIRED"},
        {status:401},
      );
    }
    if(!user.totp_secret||!verifyTotp(user.totp_secret,body.code)){
      await recordAuthAttempt({...rate,scope:"ADMIN",success:false});
      return NextResponse.json({error:"Invalid two-factor code."},{status:401});
    }
  }

  await recordAuthAttempt({...rate,scope:"ADMIN",success:true});
  await query(
    "UPDATE admin_users SET last_login_at=now(),updated_at=now() WHERE id=$1",
    [user.id],
  );

  const session = await createAdminSession(user.id,requestSessionMetadata(request));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
