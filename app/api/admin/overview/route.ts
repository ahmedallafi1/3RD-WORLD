import { NextResponse } from "next/server";
import { getAdminOverview } from "@/lib/commerce/admin-data";

export const dynamic = "force-dynamic";

export function GET() {
  if (process.env.THIRD_WORLD_ADMIN_PREVIEW !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: getAdminOverview() });
}
