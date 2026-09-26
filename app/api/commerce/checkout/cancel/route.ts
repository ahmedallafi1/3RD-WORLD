import {NextRequest,NextResponse} from "next/server";
import {cancelCheckoutOrder} from "@/lib/payments/cancel-checkout";
import {assertCheckoutToken} from "@/lib/security/checkout-token";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }
  const body=await request.json().catch(()=>null) as {orderId?:string;checkoutToken?:string}|null;
  if(!body?.orderId||!body.checkoutToken){
    return NextResponse.json({error:"Checkout authorization is required."},{status:400});
  }

  try{
    await assertCheckoutToken(body.orderId,body.checkoutToken);
  }catch{
    return NextResponse.json({error:"Checkout authorization is invalid."},{status:403});
  }

  await cancelCheckoutOrder(body.orderId);
  return NextResponse.json({ok:true});
}
