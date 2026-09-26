import { query } from "@/lib/db";
import { getMarketForCountry } from "@/lib/commerce/markets";

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
};

export async function quoteCheckout(args:{
  cartId:string;
  countryCode:string;
}):Promise<CheckoutQuote>{
  const market=await getMarketForCountry(args.countryCode);

  const cart=await query<{currency:string;subtotal:string}>(
    `SELECT c.currency,
            COALESCE(sum(cl.unit_price_amount * cl.quantity),0)::text AS subtotal
     FROM carts c
     LEFT JOIN cart_lines cl ON cl.cart_id=c.id
     WHERE c.id=$1
     GROUP BY c.id`,
    [args.cartId],
  );
  if(!cart.rows[0])throw new Error("Cart not found.");

  const subtotalAmount=Number(cart.rows[0].subtotal);
  const shippingAmount=
    market.freeShippingThresholdAmount!==null &&
    subtotalAmount>=market.freeShippingThresholdAmount
      ? 0
      : market.standardShippingAmount;

  // Tax and duties are deliberately zero until a real tax/duties provider is configured.
  // The response explicitly marks those components as NOT_CONFIGURED instead of guessing.
  const taxAmount=0;
  const dutyAmount=0;
  const discountAmount=0;
  const totalAmount=subtotalAmount-discountAmount+shippingAmount+taxAmount+dutyAmount;

  const inserted=await query<{id:string}>(
    `INSERT INTO checkout_quotes
     (cart_id,market_code,currency,subtotal_amount,discount_amount,shipping_amount,
      tax_amount,duty_amount,total_amount,tax_status,duty_status,shipping_service)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'NOT_CONFIGURED','NOT_CONFIGURED','STANDARD')
     RETURNING id`,
    [
      args.cartId,
      market.code,
      market.currency,
      subtotalAmount,
      discountAmount,
      shippingAmount,
      taxAmount,
      dutyAmount,
      totalAmount,
    ],
  );

  return {
    id:inserted.rows[0].id,
    marketCode:market.code,
    currency:market.currency,
    subtotalAmount,
    discountAmount,
    shippingAmount,
    taxAmount,
    dutyAmount,
    totalAmount,
    taxStatus:"NOT_CONFIGURED",
    dutyStatus:"NOT_CONFIGURED",
    shippingService:"STANDARD",
  };
}
