import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {refundOrder} from "@/lib/payments/refunds";

const allowed=new Set(["OWNER","ADMIN","OPERATIONS"]);

export async function POST(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role)){
    return NextResponse.json({error:"Forbidden"},{status:403});
  }

  const {id}=await params;
  const body=await request.json().catch(()=>({})) as {amount?:number;reason?:string};

  try{
    const data=await refundOrder({
      orderId:id,
      amount:body.amount,
      reason:body.reason,
      actorId:user.id,
    });
    return NextResponse.json({data});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to refund order."},
      {status:409},
    );
  }
}
