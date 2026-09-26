import {NextRequest,NextResponse} from "next/server";
import {query} from "@/lib/db";
import {finalizeOrderTax} from "@/lib/tax/order-tax";
import {verifyStripeWebhook} from "@/lib/payments/stripe";
import {
  failOrCancelPayment,
  markOrderPaidFromPayment,
  recordStripeEvent,
  updatePaymentAttemptStatus,
} from "@/lib/payments/repository";

type StripeLikeEvent={
  id:string;
  type:string;
  data?:{
    object?:{
      id?:string;
      status?:string;
      metadata?:Record<string,string>;
      payment_method_types?:string[];
      last_payment_error?:{message?:string};
    };
  };
};

export async function POST(request:NextRequest){
  const secret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!secret)return NextResponse.json({error:"Webhook is not configured."},{status:503});

  const signature=request.headers.get("stripe-signature");
  if(!signature)return NextResponse.json({error:"Missing signature."},{status:400});

  const payload=await request.text();
  if(!verifyStripeWebhook({payload,signatureHeader:signature,secret})){
    return NextResponse.json({error:"Invalid signature."},{status:400});
  }

  let event:StripeLikeEvent;
  try{
    event=JSON.parse(payload) as StripeLikeEvent;
  }catch{
    return NextResponse.json({error:"Invalid payload."},{status:400});
  }

  const object=event.data?.object;
  const providerPaymentId=object?.id;
  const orderId=object?.metadata?.order_id;

  try{
    const recorded=await recordStripeEvent({
      eventId:event.id,
      eventType:event.type,
      providerPaymentId,
      orderId,
      payload:event,
    });
    if(recorded.duplicate)return NextResponse.json({received:true,duplicate:true});

    if(providerPaymentId&&orderId){
      if(event.type==="payment_intent.succeeded"){
        await markOrderPaidFromPayment({
          orderId,
          providerPaymentId,
          paymentMethodType:object?.payment_method_types?.[0],
        });
        await finalizeOrderTax(orderId);
      }else if(event.type==="payment_intent.processing"){
        await updatePaymentAttemptStatus({
          providerPaymentId,
          status:"PROCESSING",
          paymentMethodType:object?.payment_method_types?.[0],
        });
      }else if(event.type==="payment_intent.payment_failed"){
        await failOrCancelPayment({
          orderId,
          providerPaymentId,
          status:"FAILED",
          lastError:object?.last_payment_error?.message,
        });
      }else if(event.type==="payment_intent.canceled"){
        await failOrCancelPayment({
          orderId,
          providerPaymentId,
          status:"CANCELLED",
        });
      }
    }

    return NextResponse.json({received:true});
  }catch(error){
    // Let Stripe retry an event if our internal processing failed.
    await query(
      "DELETE FROM payment_events WHERE provider='stripe' AND provider_event_id=$1",
      [event.id],
    ).catch(()=>undefined);

    return NextResponse.json(
      {error:error instanceof Error?error.message:"Webhook processing failed."},
      {status:500},
    );
  }
}
