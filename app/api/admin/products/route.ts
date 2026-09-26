import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import {
  createProduct,
  listAdminProducts,
  type AdminProductInput,
} from "@/lib/commerce/repositories/products";

const allowed=new Set(["OWNER","ADMIN","CONTENT"]);

export async function GET(){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  return NextResponse.json({data:await listAdminProducts()});
}

export async function POST(request:NextRequest){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});

  const body=await request.json().catch(()=>null) as AdminProductInput|null;
  if(!body)return NextResponse.json({error:"Invalid request."},{status:400});

  try{
    const result=await createProduct(body,user.id);
    return NextResponse.json({data:result},{status:201});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to create product."},
      {status:400},
    );
  }
}
