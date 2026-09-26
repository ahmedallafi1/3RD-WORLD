export type ShippingAddress={
  name:string;
  line1:string;
  line2?:string;
  city:string;
  state?:string;
  postalCode:string;
  country:string;
  phone?:string;
  email?:string;
};

export type ShippingItem={
  description:string;
  quantity:number;
  valueAmount:number;
  weightGrams:number;
  hsCode?:string|null;
  countryOfOrigin?:string|null;
};

export type ShippingQuote={
  provider:"easypost";
  shipmentId:string;
  rateId:string;
  carrier:string;
  service:string;
  amount:number;
  currency:string;
  deliveryDays:number|null;
  dutiesTaxesFeesAmount:number|null;
};

function configuredOrigin():ShippingAddress{
  const line1=process.env.SHIP_FROM_LINE1;
  const city=process.env.SHIP_FROM_CITY;
  const postalCode=process.env.SHIP_FROM_POSTAL_CODE;
  const country=process.env.SHIP_FROM_COUNTRY??"US";
  if(!line1||!city||!postalCode)throw new Error("Shipping origin is not configured.");

  return {
    name:process.env.SHIP_FROM_NAME??"3RD WORLD",
    line1,
    line2:process.env.SHIP_FROM_LINE2||undefined,
    city,
    state:process.env.SHIP_FROM_STATE||undefined,
    postalCode,
    country,
    phone:process.env.SHIP_FROM_PHONE||undefined,
    email:process.env.SHIP_FROM_EMAIL||undefined,
  };
}

export function easyPostConfigured(){
  return Boolean(process.env.EASYPOST_API_KEY&&process.env.SHIP_FROM_LINE1&&process.env.SHIP_FROM_CITY&&process.env.SHIP_FROM_POSTAL_CODE);
}

function epAddress(address:ShippingAddress){
  return {
    name:address.name,
    street1:address.line1,
    street2:address.line2,
    city:address.city,
    state:address.state,
    zip:address.postalCode,
    country:address.country,
    phone:address.phone,
    email:address.email,
  };
}

function gramsToOunces(grams:number){
  return Math.max(1,Math.round((grams/28.349523125)*10)/10);
}

function dollars(amount:number){
  return (amount/100).toFixed(2);
}

function parseLandedCost(value:unknown){
  if(!value||typeof value!=="object")return null;
  const row=value as Record<string,unknown>;
  const candidates=[
    row.total,
    row.amount,
    row.total_amount,
    row.duties_taxes_fees,
  ];
  for(const candidate of candidates){
    const n=Number(candidate);
    if(Number.isFinite(n))return Math.round(n*100);
  }
  return null;
}

export async function quoteEasyPost(args:{
  to:ShippingAddress;
  items:ShippingItem[];
}):Promise<ShippingQuote[]>{
  const apiKey=process.env.EASYPOST_API_KEY;
  if(!apiKey)throw new Error("EASYPOST_API_KEY is not configured.");

  const from=configuredOrigin();
  const totalWeight=args.items.reduce((sum,item)=>sum+Math.max(1,item.weightGrams)*item.quantity,0);
  const isInternational=from.country.toUpperCase()!==args.to.country.toUpperCase();

  const shipment:Record<string,unknown>={
    to_address:epAddress(args.to),
    from_address:epAddress(from),
    parcel:{
      length:Number(process.env.DEFAULT_PARCEL_LENGTH_IN??14),
      width:Number(process.env.DEFAULT_PARCEL_WIDTH_IN??10),
      height:Number(process.env.DEFAULT_PARCEL_HEIGHT_IN??4),
      weight:gramsToOunces(totalWeight),
    },
  };

  if(isInternational){
    shipment.customs_info={
      customs_certify:true,
      customs_signer:process.env.SHIP_FROM_NAME??"3RD WORLD",
      contents_type:"merchandise",
      eel_pfc:"NOEEI 30.37(a)",
      customs_items:args.items.map(item=>({
        description:item.description,
        quantity:item.quantity,
        value:dollars(item.valueAmount),
        weight:gramsToOunces(item.weightGrams),
        origin_country:item.countryOfOrigin??from.country,
        hs_tariff_number:item.hsCode??undefined,
      })),
    };
  }

  const response=await fetch("https://api.easypost.com/v2/shipments",{
    method:"POST",
    headers:{
      authorization:"Basic "+Buffer.from(apiKey+":").toString("base64"),
      "content-type":"application/json",
    },
    body:JSON.stringify({shipment}),
    cache:"no-store",
  });

  const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
  if(!response.ok){
    const error=(payload?.error as Record<string,unknown>|undefined)?.message;
    throw new Error(typeof error==="string"?error:"Shipping rate request failed.");
  }

  const shipmentId=String(payload?.id??"");
  const rates=Array.isArray(payload?.rates)?payload?.rates:[];
  return rates
    .map(rate=>{
      const row=rate as Record<string,unknown>;
      const amount=Math.round(Number(row.rate)*100);
      if(!Number.isFinite(amount))return null;
      return {
        provider:"easypost" as const,
        shipmentId,
        rateId:String(row.id??""),
        carrier:String(row.carrier??""),
        service:String(row.service??""),
        amount,
        currency:String(row.currency??"USD"),
        deliveryDays:Number.isFinite(Number(row.delivery_days))?Number(row.delivery_days):null,
        dutiesTaxesFeesAmount:parseLandedCost(row.landed_cost),
      };
    })
    .filter((rate):rate is ShippingQuote=>Boolean(rate?.rateId))
    .sort((a,b)=>a.amount-b.amount);
}
