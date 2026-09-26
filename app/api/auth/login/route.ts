import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/commerce/repositories/customers";
import { createCustomerSession, CUSTOMER_COOKIE } from "@/lib/auth/session";
import {
  assertRateLimit,
  normalizedIdentity,
  requestFingerprint,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as
    | { email?: string; password?: string }
    | null;
  const email = normalizedIdentity(body?.email);
  const password = body?.password ?? "";

  if(!email||!password||email.length>320||password.length>1024){
    return NextResponse.json({error:"Invalid credentials."},{status:401});
  }

  try{
    await assertRateLimit({
      scope:"customer-login",
      fingerprint:requestFingerprint(request.headers),
      identity:email,
      limit:10,
      windowSeconds:600,
    });
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Too many attempts."},
      {status:429,headers:{"Retry-After":"600"}},
    );
  }

  const customerId = await authenticateCustomer(email, password);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const session = await createCustomerSession(customerId);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    priority:"high",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
}
