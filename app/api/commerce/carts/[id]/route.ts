import { NextResponse } from "next/server";
import { getCart } from "@/lib/commerce/repositories/carts";

export async function GET(
  _request:Request,
  {params}:{params:Promise<{id:string}>},
){
  const {id}=await params;
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }
  const cart=await getCart(id);
  if(!cart)return NextResponse.json({error:"Cart not found."},{status:404});
  return NextResponse.json({data:cart});
}
