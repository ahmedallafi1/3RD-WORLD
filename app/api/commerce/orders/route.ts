import { NextRequest, NextResponse } from "next/server";
import { getCustomerUser } from "@/lib/auth/session";
import { createPendingOrderFromCart } from "@/lib/commerce/repositories/orders-db";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }

  const body=await request.json().catch(()=>null) as
    | {cartId?:string;email?:string;marketCode?:string;shippingAddress?:Record<string,unknown>}
    | null;
  const customer=await getCustomerUser();
  const email=body?.email??customer?.email;

  if(!body?.cartId||!email){
    return NextResponse.json({error:"cartId and email are required."},{status:400});
  }

  try{
    const data=await createPendingOrderFromCart({
      cartId:body.cartId,
      email,
      customerId:customer?.id,
      marketCode:body.marketCode,
      shippingAddress:body.shippingAddress,
    });
    return NextResponse.json({data},{status:201});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to create order."},
      {status:409},
    );
  }
}
