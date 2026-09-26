import { NextRequest, NextResponse } from "next/server";
import { setCartLineQuantity } from "@/lib/commerce/repositories/carts";
import {assertCartToken} from "@/lib/security/cart-token";
import {assertRateLimit,requestFingerprint} from "@/lib/security/rate-limit";

export async function PUT(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }

  const {id}=await params;
  const body=await request.json().catch(()=>null) as
    | {variantId?:string;locationId?:string;quantity?:number;cartToken?:string}
    | null;

  if(!body?.variantId||!body.locationId||body.quantity===undefined){
    return NextResponse.json({error:"variantId, locationId and quantity are required."},{status:400});
  }

  try{
    await assertCartToken(
      id,
      request.headers.get("x-cart-token")??body.cartToken,
    );
    await assertRateLimit({
      scope:"cart-lines",
      fingerprint:requestFingerprint(request.headers),
      identity:id,
      limit:60,
      windowSeconds:600,
    });
    const quantity=Number(body.quantity);
    if(!Number.isInteger(quantity)||quantity<0||quantity>20){
      return NextResponse.json({error:"Quantity must be between 0 and 20."},{status:400});
    }
    const data=await setCartLineQuantity({
      cartId:id,
      variantId:body.variantId,
      locationId:body.locationId,
      quantity,
    });
    return NextResponse.json({data});
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to update cart.";
    const forbidden=message.includes("authorization");
    const rateLimited=message.startsWith("Too many attempts");
    return NextResponse.json(
      {error:message},
      {
        status:forbidden?403:rateLimited?429:409,
        headers:rateLimited?{"Retry-After":"600"}:undefined,
      },
    );
  }
}
