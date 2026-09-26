import { checkoutMode } from "@/lib/commerce/checkout-readiness";
import { easyPostConfigured } from "@/lib/shipping/easypost";
import { stripeTaxConfigured } from "@/lib/tax/stripe-tax";

export function getCommerceReadiness(){
  const mode=checkoutMode();
  return [
    {key:"DATABASE",ready:Boolean(process.env.DATABASE_URL),detail:process.env.DATABASE_URL?"CONNECTED":"MISSING DATABASE_URL"},
    {key:"CHECKOUT MODE",ready:mode!=="off",detail:mode.toUpperCase()},
    {key:"STRIPE",ready:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),detail:"PAYMENT INTENTS + ELEMENTS"},
    {key:"WEBHOOK",ready:Boolean(process.env.STRIPE_WEBHOOK_SECRET),detail:"SIGNED PAYMENT EVENTS"},
    {key:"SHIPPING",ready:easyPostConfigured(),detail:easyPostConfigured()?"EASYPOST LIVE RATING":"MARKET FLAT-RATE FALLBACK"},
    {key:"TAX",ready:stripeTaxConfigured(),detail:stripeTaxConfigured()?"STRIPE TAX":"NOT LIVE"},
    {key:"DUTIES",ready:Boolean(process.env.USE_EASYPOST_LANDED_COST==="true"&&process.env.EASYPOST_API_KEY),detail:process.env.USE_EASYPOST_LANDED_COST==="true"?"EASYPOST / ZONOS LANDED COST":"DDU OR NOT LIVE"},
  ];
}
