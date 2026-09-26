import { NextRequest, NextResponse } from "next/server";
import { setCartLineQuantity } from "@/lib/commerce/repositories/carts";

export async function PUT(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }

  const {id}=await params;
  const body=await request.json().catch(()=>null) as
    | {variantId?:string;locationId?:string;quantity?:number}
    | null;

  if(!body?.variantId||!body.locationId||body.quantity===undefined){
    return NextResponse.json({error:"variantId, locationId and quantity are required."},{status:400});
  }

  try{
    const data=await setCartLineQuantity({
      cartId:id,
      variantId:body.variantId,
      locationId:body.locationId,
      quantity:Number(body.quantity),
    });
    return NextResponse.json({data});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to update cart."},
      {status:409},
    );
  }
}
