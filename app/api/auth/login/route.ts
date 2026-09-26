import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/commerce/repositories/customers";
import { createCustomerSession, CUSTOMER_COOKIE } from "@/lib/auth/session";
import {assertAuthRateLimit,recordAuthAttempt} from "@/lib/security/auth-rate-limit";
import {requestSessionMetadata} from "@/lib/security/request";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as
    | { email?: string; password?: string }
    | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";

  if(!email||!password){
    return NextResponse.json({error:"Email and password are required."},{status:400});
  }

  let rate;
  try{
    rate=await assertAuthRateLimit({request,email,scope:"CUSTOMER"});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Too many attempts."},
      {status:429},
    );
  }

  const customerId = await authenticateCustomer(email, password);
  if (!customerId) {
    await recordAuthAttempt({...rate,scope:"CUSTOMER",success:false});
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  await recordAuthAttempt({...rate,scope:"CUSTOMER",success:true});
  const session = await createCustomerSession(customerId,requestSessionMetadata(request));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
}
