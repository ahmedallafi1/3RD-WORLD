import { isDatabaseConfigured, query } from "@/lib/db";

export type Market = {
  code: string;
  name: string;
  currency: string;
  countries: string[];
  freeShippingThresholdAmount: number | null;
  standardShippingAmount: number;
  dutiesMode: "PAID" | "UNPAID" | "CALCULATED_AT_CHECKOUT";
};

const euCountries=[
  "AT","BE","BG","HR","CY","CZ","DE","DK","EE","ES","FI","FR","GR","HU",
  "IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK",
];

const fallbackMarkets: Market[] = [
  {code:"US",name:"United States",currency:"USD",countries:["US"],freeShippingThresholdAmount:15000,standardShippingAmount:1200,dutiesMode:"UNPAID"},
  {code:"CA",name:"Canada",currency:"CAD",countries:["CA"],freeShippingThresholdAmount:20000,standardShippingAmount:1800,dutiesMode:"CALCULATED_AT_CHECKOUT"},
  {code:"UK",name:"United Kingdom",currency:"GBP",countries:["GB"],freeShippingThresholdAmount:15000,standardShippingAmount:1500,dutiesMode:"CALCULATED_AT_CHECKOUT"},
  {code:"EU",name:"European Union",currency:"EUR",countries:euCountries,freeShippingThresholdAmount:15000,standardShippingAmount:1600,dutiesMode:"CALCULATED_AT_CHECKOUT"},
  {code:"AE",name:"United Arab Emirates",currency:"AED",countries:["AE"],freeShippingThresholdAmount:55000,standardShippingAmount:6000,dutiesMode:"CALCULATED_AT_CHECKOUT"},
  {code:"AU",name:"Australia",currency:"AUD",countries:["AU"],freeShippingThresholdAmount:22000,standardShippingAmount:2200,dutiesMode:"CALCULATED_AT_CHECKOUT"},
  {code:"JP",name:"Japan",currency:"JPY",countries:["JP"],freeShippingThresholdAmount:25000,standardShippingAmount:2500,dutiesMode:"CALCULATED_AT_CHECKOUT"},
  {code:"SG",name:"Singapore",currency:"SGD",countries:["SG"],freeShippingThresholdAmount:22000,standardShippingAmount:2200,dutiesMode:"CALCULATED_AT_CHECKOUT"},
  {code:"ROW",name:"Rest of World",currency:"USD",countries:[],freeShippingThresholdAmount:20000,standardShippingAmount:2500,dutiesMode:"CALCULATED_AT_CHECKOUT"},
];

export async function listMarkets(): Promise<Market[]> {
  if(!isDatabaseConfigured()) return fallbackMarkets;
  const result=await query<{
    code:string;name:string;currency:string;countries:string[];
    free_shipping_threshold_amount:string|null;
    standard_shipping_amount:string;
    duties_mode:Market["dutiesMode"];
  }>(
    `SELECT code,name,currency,countries,free_shipping_threshold_amount,
            standard_shipping_amount,duties_mode
     FROM markets
     WHERE active=true
     ORDER BY CASE WHEN code='ROW' THEN 1 ELSE 0 END,code`
  );

  return result.rows.map(row=>({
    code:row.code,
    name:row.name,
    currency:row.currency,
    countries:row.countries,
    freeShippingThresholdAmount:row.free_shipping_threshold_amount===null?null:Number(row.free_shipping_threshold_amount),
    standardShippingAmount:Number(row.standard_shipping_amount),
    dutiesMode:row.duties_mode,
  }));
}

export async function getMarketForCountry(countryCode:string){
  const normalized=countryCode.trim().toUpperCase();
  const markets=await listMarkets();
  return markets.find(market=>market.countries.includes(normalized))
    ??markets.find(market=>market.code==="ROW")
    ??markets.find(market=>market.code==="US")
    ??markets[0];
}
