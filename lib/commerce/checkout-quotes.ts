import { query } from "@/lib/db";
import { getMarketForCountry } from "@/lib/commerce/markets";
import {
  easyPostConfigured,
  quoteEasyPost,
  type ShippingAddress,
} from "@/lib/shipping/easypost";
import {
  calculateStripeTax,
  stripeTaxConfigured,
} from "@/lib/tax/stripe-tax";
import {convertAmount,fxConfigured} from "@/lib/fx/open-exchange-rates";

export type CheckoutQuote = {
  id?: string;
  marketCode: string;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  dutyAmount: number;
  totalAmount: number;
  taxStatus: "ESTIMATED" | "FINAL" | "NOT_CONFIGURED";
  dutyStatus: "ESTIMATED" | "FINAL" | "NOT_CONFIGURED";
  shippingService: string;
  taxProvider?: string | null;
  taxProviderRef?: string | null;
  shippingProvider?: string | null;
  shippingProviderRef?: string | null;
  shippingRateId?: string | null;
  dutyProvider?: string | null;
  dutyProviderRef?: string | null;
};

type CartLineRow={
  currency:string;
  quantity:number;
  unit_price_amount:string;
  sku:string;
  product_name:string;
  weight_grams:number|null;
  hs_code:string|null;
  country_of_origin:string|null;
};

function completeAddress(address?:Partial<ShippingAddress>):address is ShippingAddress{
  return Boolean(
    address?.name &&
    address.line1 &&
    address.city &&
    address.postalCode &&
    address.country
  );
}

export async function quoteCheckout(args:{
  cartId:string;
  countryCode:string;
  shippingAddress?:Partial<ShippingAddress>;
}):Promise<CheckoutQuote>{
  const market=await getMarketForCountry(args.countryCode);

  const linesResult=await query<CartLineRow>(
    `SELECT c.currency,cl.quantity,cl.unit_price_amount,
            v.sku,p.name AS product_name,v.weight_grams,v.hs_code,v.country_of_origin
     FROM carts c
     JOIN cart_lines cl ON cl.cart_id=c.id
     JOIN variants v ON v.id=cl.variant_id
     JOIN products p ON p.id=v.product_id
     WHERE c.id=$1
     ORDER BY cl.created_at`,
    [args.cartId],
  );
  if(!linesResult.rows.length)throw new Error("Cart not found or empty.");

  const currency=linesResult.rows[0].currency;
  const subtotalAmount=linesResult.rows.reduce(
    (sum,row)=>sum+Number(row.unit_price_amount)*row.quantity,
    0,
  );
  const discountAmount=0;

  let shippingAmount:number;
  let shippingService="STANDARD";
  let shippingProvider:string|null=null;
  let shippingProviderRef:string|null=null;
  let shippingRateId:string|null=null;
  let landedCostAmount:number|null=null;

  const sameCurrency=currency===market.currency;
  const freeThreshold=sameCurrency
    ? market.freeShippingThresholdAmount
    : Number(process.env.GLOBAL_FREE_SHIPPING_USD ?? 20000);
  const standardShipping=sameCurrency
    ? market.standardShippingAmount
    : Number(process.env.GLOBAL_STANDARD_SHIPPING_USD ?? 2500);

  const qualifiesForFreeShipping=
    freeThreshold!==null && subtotalAmount>=freeThreshold;

  if(
    easyPostConfigured() &&
    completeAddress(args.shippingAddress)
  ){
    const rates=await quoteEasyPost({
      to:args.shippingAddress,
      items:linesResult.rows.map(row=>({
        description:row.product_name,
        quantity:row.quantity,
        valueAmount:Number(row.unit_price_amount),
        weightGrams:row.weight_grams??Number(process.env.DEFAULT_ITEM_WEIGHT_GRAMS??650),
        hsCode:row.hs_code,
        countryOfOrigin:row.country_of_origin,
      })),
    });

    const compatible=rates.filter(rate=>rate.currency.toUpperCase()===currency.toUpperCase());
    const selected=(compatible.length?compatible:rates)[0];
    if(!selected)throw new Error("No shipping rate is available for this address.");

    let selectedShippingAmount=selected.amount;
    let selectedLandedCost=selected.dutiesTaxesFeesAmount;
    if(selected.currency.toUpperCase()!==currency.toUpperCase()){
      if(!fxConfigured())throw new Error("Shipping rate currency requires FX configuration.");
      selectedShippingAmount=(await convertAmount({
        amount:selected.amount,
        from:selected.currency,
        to:currency,
        applyMargin:false,
      })).amount;
      if(selectedLandedCost!==null){
        selectedLandedCost=(await convertAmount({
          amount:selectedLandedCost,
          from:selected.currency,
          to:currency,
          applyMargin:false,
        })).amount;
      }
    }

    shippingAmount=qualifiesForFreeShipping?0:selectedShippingAmount;
    shippingService=`${selected.carrier} ${selected.service}`.trim();
    shippingProvider="easypost";
    shippingProviderRef=selected.shipmentId;
    shippingRateId=selected.rateId;
    landedCostAmount=selectedLandedCost;
  }else{
    shippingAmount=qualifiesForFreeShipping?0:standardShipping;
  }

  let taxAmount=0;
  let taxStatus:CheckoutQuote["taxStatus"]="NOT_CONFIGURED";
  let taxProvider:string|null=null;
  let taxProviderRef:string|null=null;

  let dutyAmount=0;
  let dutyStatus:CheckoutQuote["dutyStatus"]=
    market.dutiesMode==="UNPAID"?"FINAL":"NOT_CONFIGURED";
  let dutyProvider:string|null=null;
  let dutyProviderRef:string|null=null;

  const useLandedCost=
    process.env.USE_EASYPOST_LANDED_COST==="true" &&
    landedCostAmount!==null &&
    market.dutiesMode==="CALCULATED_AT_CHECKOUT";

  if(useLandedCost){
    dutyAmount=landedCostAmount??0;
    dutyStatus="ESTIMATED";
    dutyProvider="easypost";
    dutyProviderRef=shippingProviderRef;
  }

  if(
    stripeTaxConfigured() &&
    completeAddress(args.shippingAddress) &&
    !useLandedCost
  ){
    const calculation=await calculateStripeTax({
      currency,
      address:args.shippingAddress,
      lines:linesResult.rows.map(row=>({
        reference:row.sku,
        amount:Number(row.unit_price_amount)*row.quantity,
      })),
      shippingAmount,
    });
    taxAmount=calculation.amountTax;
    taxStatus="FINAL";
    taxProvider="stripe_tax";
    taxProviderRef=calculation.id;
  }

  const totalAmount=
    subtotalAmount-discountAmount+shippingAmount+taxAmount+dutyAmount;

  const inserted=await query<{id:string}>(
    `INSERT INTO checkout_quotes
     (cart_id,market_code,currency,subtotal_amount,discount_amount,shipping_amount,
      tax_amount,duty_amount,total_amount,tax_status,duty_status,shipping_service,
      tax_provider,tax_provider_ref,shipping_provider,shipping_provider_ref,
      shipping_rate_id,duty_provider,duty_provider_ref)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING id`,
    [
      args.cartId,
      market.code,
      currency,
      subtotalAmount,
      discountAmount,
      shippingAmount,
      taxAmount,
      dutyAmount,
      totalAmount,
      taxStatus,
      dutyStatus,
      shippingService,
      taxProvider,
      taxProviderRef,
      shippingProvider,
      shippingProviderRef,
      shippingRateId,
      dutyProvider,
      dutyProviderRef,
    ],
  );

  return {
    id:inserted.rows[0].id,
    marketCode:market.code,
    currency,
    subtotalAmount,
    discountAmount,
    shippingAmount,
    taxAmount,
    dutyAmount,
    totalAmount,
    taxStatus,
    dutyStatus,
    shippingService,
    taxProvider,
    taxProviderRef,
    shippingProvider,
    shippingProviderRef,
    shippingRateId,
    dutyProvider,
    dutyProviderRef,
  };
}
