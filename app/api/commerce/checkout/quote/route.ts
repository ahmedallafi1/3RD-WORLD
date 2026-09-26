import {NextRequest,NextResponse} from "next/server";
import {quoteCheckout} from "@/lib/commerce/checkout-quotes";
import type {ShippingAddress} from "@/lib/shipping/easypost";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }

  const body=await request.json().catch(()=>null) as {
    cartId?:string;
    countryCode?:string;
    shippingAddress?:ShippingAddress;
  }|null;

  if(!body?.cartId||!body.countryCode){
    return NextResponse.json({error:"cartId and countryCode are required."},{status:400});
  }

  try{
    return NextResponse.json({data:await quoteCheckout({
      cartId:body.cartId,
      countryCode:body.countryCode,
      shippingAddress:body.shippingAddress,
    })});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to quote checkout."},{status:400});
  }
}
