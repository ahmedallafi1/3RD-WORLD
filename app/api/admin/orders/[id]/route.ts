import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/session";
import { transitionOrder } from "@/lib/commerce/repositories/orders-db";
import type { OrderStatus } from "@/lib/commerce/domain";

const allowed=new Set(["OWNER","ADMIN","OPERATIONS"]);
const allowedStatuses=new Set<OrderStatus>([
  "ALLOCATED","FULFILLING","FULFILLED","CANCELLED","PARTIALLY_REFUNDED","REFUNDED",
]);

export async function PATCH(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});

  const body=await request.json().catch(()=>null) as {status?:OrderStatus}|null;
  if(!body?.status||!allowedStatuses.has(body.status)){
    return NextResponse.json({error:"Invalid status."},{status:400});
  }

  const {id}=await params;
  try{
    const data=await transitionOrder({
      orderId:id,
      to:body.status,
      actorType:"ADMIN",
      actorId:user.id,
    });
    return NextResponse.json({data});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to update order."},{status:409});
  }
}
