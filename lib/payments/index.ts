import { stripeProvider } from "@/lib/payments/stripe";

export function getPaymentProvider(){
  const provider=(process.env.PAYMENT_PROVIDER??"stripe").toLowerCase();
  if(provider!=="stripe")throw new Error(`Unsupported payment provider: ${provider}`);
  return stripeProvider;
}
