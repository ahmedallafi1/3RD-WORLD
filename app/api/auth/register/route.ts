import { NextRequest, NextResponse } from "next/server";
import { createCustomerAccount } from "@/lib/commerce/repositories/customers";
import { createCustomerSession, CUSTOMER_COOKIE } from "@/lib/auth/session";
import {
  assertRateLimit,
  normalizedIdentity,
  requestFingerprint,
} from "@/lib/security/rate-limit";

function cleanName(value?:string){
  return (value??"").trim().slice(0,80);
}

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as
    | { email?: string; password?: string; firstName?: string; lastName?: string }
    | null;

  const email=normalizedIdentity(body?.email);
  const password=body?.password??"";
  if (!email || !password || email.length>320 || password.length>1024) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try{
    await assertRateLimit({
      scope:"customer-register",
      fingerprint:requestFingerprint(request.headers),
      identity:email,
      limit:5,
      windowSeconds:3600,
    });

    const customerId = await createCustomerAccount({
      email,
      password,
      firstName:cleanName(body?.firstName),
      lastName:cleanName(body?.lastName),
    });
    const session = await createCustomerSession(customerId);
    const response = NextResponse.json({ ok: true }, { status: 201 });
    response.cookies.set(CUSTOMER_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      priority:"high",
      path: "/",
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    const message=error instanceof Error?error.message:"Unable to create account.";
    const rateLimited=message.startsWith("Too many attempts");
    return NextResponse.json(
      {error:rateLimited?message:"Unable to create account with those details."},
      {
        status:rateLimited?429:400,
        headers:rateLimited?{"Retry-After":"3600"}:undefined,
      },
    );
  }
}
