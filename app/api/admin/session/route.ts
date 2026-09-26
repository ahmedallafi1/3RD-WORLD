import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  ADMIN_COOKIE,
  createAdminSession,
  destroyAdminSession,
} from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const result = await query<{
    id: string;
    password_hash: string;
    active: boolean;
  }>(
    `SELECT id, password_hash, active
     FROM admin_users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );

  const user = result.rows[0];
  if (!user || !user.active || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const session = await createAdminSession(user.id);
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
