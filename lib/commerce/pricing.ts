import {query} from "@/lib/db";
import {convertAmount,fxConfigured} from "@/lib/fx/open-exchange-rates";

export type ResolvedPrice={
  amount:number;
  currency:string;
  source:"market_price"|"fx"|"base";
  fxRate?:number;
};

export async function resolveVariantPrice(args:{
  variantId:string;
  marketCode:string;
  marketCurrency:string;
}):Promise<ResolvedPrice>{
  const explicit=await query<{price_amount:string;currency:string}>(
    `SELECT price_amount,currency
     FROM variant_prices
     WHERE variant_id=$1 AND market_code=$2
     LIMIT 1`,
    [args.variantId,args.marketCode],
  );
  if(explicit.rows[0]){
    return {
      amount:Number(explicit.rows[0].price_amount),
      currency:explicit.rows[0].currency,
      source:"market_price",
    };
  }

  const base=await query<{price_amount:string;currency:string}>(
    "SELECT price_amount,currency FROM variants WHERE id=$1 LIMIT 1",
    [args.variantId],
  );
  if(!base.rows[0])throw new Error("Variant price not found.");

  const baseAmount=Number(base.rows[0].price_amount);
  const baseCurrency=base.rows[0].currency;

  if(
    fxConfigured() &&
    args.marketCurrency &&
    args.marketCurrency!==baseCurrency
  ){
    const converted=await convertAmount({
      amount:baseAmount,
      from:baseCurrency,
      to:args.marketCurrency,
    });
    return {
      amount:converted.amount,
      currency:args.marketCurrency,
      source:"fx",
      fxRate:converted.rate,
    };
  }

  return {
    amount:baseAmount,
    currency:baseCurrency,
    source:"base",
  };
}
