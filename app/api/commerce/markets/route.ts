import {NextResponse} from "next/server";
import {listMarkets} from "@/lib/commerce/markets";

export const dynamic="force-dynamic";

export async function GET(){
  return NextResponse.json({data:await listMarkets()});
}
