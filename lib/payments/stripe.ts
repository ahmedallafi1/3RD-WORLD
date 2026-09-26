import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider, PaymentSessionInput } from "@/lib/payments/types";

const STRIPE_API="https://api.stripe.com/v1";

function requireStripeSecret(){
  const secret=process.env.STRIPE_SECRET_KEY;
  if(!secret)throw new Error("STRIPE_SECRET_KEY is not configured.");
  return secret;
}

async function stripePost(path:string,params:URLSearchParams){
  const response=await fetch(STRIPE_API+path,{
    method:"POST",
    headers:{
      authorization:`Bearer ${requireStripeSecret()}`,
      "content-type":"application/x-www-form-urlencoded",
    },
    body:params.toString(),
    cache:"no-store",
  });
  const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
  if(!response.ok){
    const stripeError=(payload?.error as Record<string,unknown>|undefined)?.message;
    throw new Error(typeof stripeError==="string"?stripeError:"Stripe request failed.");
  }
  return payload??{};
}

export const stripeProvider:PaymentProvider={
  async createPaymentSession(input:PaymentSessionInput){
    const params=new URLSearchParams();
    params.set("amount",String(input.amount));
    params.set("currency",input.currency.toLowerCase());
    params.set("automatic_payment_methods[enabled]","true");
    params.set("receipt_email",input.email);
    params.set("metadata[order_id]",input.orderId);
    params.set("metadata[order_number]",input.orderNumber);

    const payload=await stripePost("/payment_intents",params);
    const id=String(payload.id??"");
    const clientSecret=String(payload.client_secret??"");
    const status=String(payload.status??"unknown");
    if(!id||!clientSecret)throw new Error("Stripe did not return a usable payment session.");

    return {
      provider:"stripe",
      providerPaymentId:id,
      clientSecret,
      amount:input.amount,
      currency:input.currency,
      status,
    };
  },

  async cancelPayment(providerPaymentId:string){
    await stripePost(`/payment_intents/${encodeURIComponent(providerPaymentId)}/cancel`,new URLSearchParams());
  },
};

export function verifyStripeWebhook(args:{
  payload:string;
  signatureHeader:string;
  secret:string;
  toleranceSeconds?:number;
}){
  const parts=args.signatureHeader.split(",");
  const timestamp=parts.find(part=>part.startsWith("t="))?.slice(2);
  const signatures=parts.filter(part=>part.startsWith("v1=")).map(part=>part.slice(3));
  if(!timestamp||!signatures.length)return false;

  const age=Math.abs(Date.now()/1000-Number(timestamp));
  if(!Number.isFinite(age)||age>(args.toleranceSeconds??300))return false;

  const expected=createHmac("sha256",args.secret)
    .update(timestamp+"."+args.payload)
    .digest("hex");

  const expectedBuffer=Buffer.from(expected,"hex");
  return signatures.some(signature=>{
    try{
      const actual=Buffer.from(signature,"hex");
      return actual.length===expectedBuffer.length&&timingSafeEqual(actual,expectedBuffer);
    }catch{
      return false;
    }
  });
}
