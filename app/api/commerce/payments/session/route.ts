import {NextRequest,NextResponse} from "next/server";
import {getPaymentProvider} from "@/lib/payments";
import {getOrderForPayment,recordPaymentSession} from "@/lib/payments/repository";
import {assertOrderCheckoutReady} from "@/lib/commerce/checkout-readiness";
import {assertCheckoutToken} from "@/lib/security/checkout-token";
import {assertRateLimit,requestFingerprint} from "@/lib/security/rate-limit";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }
  if(!process.env.STRIPE_SECRET_KEY){
    return NextResponse.json({error:"Payment provider is not configured."},{status:503});
  }

  const body=await request.json().catch(()=>null) as {orderId?:string;checkoutToken?:string}|null;
  if(!body?.orderId||!body.checkoutToken){
    return NextResponse.json({error:"Checkout authorization is required."},{status:400});
  }

  try{
    await assertRateLimit({
      scope:"payment-session",
      fingerprint:requestFingerprint(request.headers),
      identity:body.orderId,
      limit:20,
      windowSeconds:600,
    });
    await assertCheckoutToken(body.orderId,body.checkoutToken);
    await assertOrderCheckoutReady(body.orderId);
    const order=await getOrderForPayment(body.orderId);
    const provider=getPaymentProvider();
    const session=await provider.createPaymentSession({
      orderId:order.id,
      orderNumber:order.orderNumber,
      amount:order.grandTotalAmount,
      currency:order.currency,
      email:order.email,
    });
    await recordPaymentSession(order.id,session);

    return NextResponse.json({
      data:{
        provider:session.provider,
        clientSecret:session.clientSecret,
        amount:session.amount,
        currency:session.currency,
        publishableKey:process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY??null,
      },
    });
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to create payment session."},
      {status:400},
    );
  }
}
