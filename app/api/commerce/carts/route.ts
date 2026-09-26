import { NextRequest, NextResponse } from "next/server";
import { createCart } from "@/lib/commerce/repositories/carts";
import { getCustomerUser } from "@/lib/auth/session";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }

  const body=await request.json().catch(()=>({})) as {email?:string;currency?:string};
  const customer=await getCustomerUser();
  const cart=await createCart({
    customerId:customer?.id,
    email:body.email??customer?.email,
    currency:body.currency??"USD",
  });
  return NextResponse.json({data:cart},{status:201});
}
