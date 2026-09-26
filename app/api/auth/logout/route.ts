import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE,
  destroyCustomerSession,
} from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(CUSTOMER_COOKIE)?.value;
  await destroyCustomerSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
