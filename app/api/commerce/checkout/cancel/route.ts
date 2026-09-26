import {NextRequest,NextResponse} from "next/server";
import {cancelCheckoutOrder} from "@/lib/payments/cancel-checkout";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }
  const body=await request.json().catch(()=>null) as {orderId?:string}|null;
  if(!body?.orderId)return NextResponse.json({error:"orderId is required."},{status:400});

  await cancelCheckoutOrder(body.orderId);
  return NextResponse.json({ok:true});
}
