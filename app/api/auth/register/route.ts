import { NextRequest, NextResponse } from "next/server";
import { createCustomerAccount } from "@/lib/commerce/repositories/customers";
import { createCustomerSession, CUSTOMER_COOKIE } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as
    | { email?: string; password?: string; firstName?: string; lastName?: string }
    | null;

  if (!body?.email || !body.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const customerId = await createCustomerAccount({
      email: body.email,
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    const session = await createCustomerSession(customerId);
    const response = NextResponse.json({ ok: true, customerId }, { status: 201 });
    response.cookies.set(CUSTOMER_COOKIE, session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
