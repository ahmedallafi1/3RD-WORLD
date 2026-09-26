import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/commerce/repositories/customers";
import { createCustomerSession, CUSTOMER_COOKIE } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as
    | { email?: string; password?: string }
    | null;
  const email = body?.email ?? "";
  const password = body?.password ?? "";

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
    path: "/",
    expires: session.expiresAt,
  });
  return response;
}
