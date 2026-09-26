import {NextRequest,NextResponse} from "next/server";
import {getCart} from "@/lib/commerce/repositories/carts";
import {assertCartToken} from "@/lib/security/cart-token";

export async function GET(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  const {id}=await params;
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }

  const token=request.headers.get("x-cart-token")??request.nextUrl.searchParams.get("cartToken");
  try{
    await assertCartToken(id,token);
  }catch{
    return NextResponse.json({error:"Cart authorization is invalid."},{status:403});
  }

  const cart=await getCart(id);
  if(!cart)return NextResponse.json({error:"Cart not found."},{status:404});
  return NextResponse.json({data:cart});
}
