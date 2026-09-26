import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import {
  archiveProduct,
  updateProduct,
  type AdminProductInput,
} from "@/lib/commerce/repositories/products";

const allowed=new Set(["OWNER","ADMIN","CONTENT"]);

export async function PATCH(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  const body=await request.json().catch(()=>null) as Partial<AdminProductInput>|null;
  if(!body)return NextResponse.json({error:"Invalid request."},{status:400});

  try{
    const data=await updateProduct(id,body,user.id);
    return NextResponse.json({data});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to update product."},{status:400});
  }
}

export async function DELETE(
  _request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  try{
    await archiveProduct(id,user.id);
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to archive product."},{status:400});
  }
}
