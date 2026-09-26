type StripeTaxAddress={
  line1:string;
  line2?:string;
  city:string;
  state?:string;
  postalCode:string;
  country:string;
};

type StripeTaxLine={
  reference:string;
  amount:number;
};

export type StripeTaxCalculation={
  id:string;
  amountTax:number;
  amountTotal:number;
  currency:string;
};

function requireSecret(){
  const secret=process.env.STRIPE_SECRET_KEY;
  if(!secret)throw new Error("STRIPE_SECRET_KEY is not configured.");
  return secret;
}

export function stripeTaxConfigured(){
  return Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_TAX_ENABLED==="true");
}

export async function calculateStripeTax(args:{
  currency:string;
  address:StripeTaxAddress;
  lines:StripeTaxLine[];
  shippingAmount:number;
}):Promise<StripeTaxCalculation>{
  const params=new URLSearchParams();
  params.set("currency",args.currency.toLowerCase());
  params.set("customer_details[address_source]","shipping");
  params.set("customer_details[address][line1]",args.address.line1);
  if(args.address.line2)params.set("customer_details[address][line2]",args.address.line2);
  params.set("customer_details[address][city]",args.address.city);
  if(args.address.state)params.set("customer_details[address][state]",args.address.state);
  params.set("customer_details[address][postal_code]",args.address.postalCode);
  params.set("customer_details[address][country]",args.address.country.toUpperCase());

  const taxCode=process.env.STRIPE_TAX_CODE_APPAREL;
  args.lines.forEach((line,index)=>{
    params.set(`line_items[${index}][amount]`,String(line.amount));
    params.set(`line_items[${index}][reference]`,line.reference);
    params.set(`line_items[${index}][tax_behavior]`,"exclusive");
    if(taxCode)params.set(`line_items[${index}][tax_code]`,taxCode);
  });

  if(args.shippingAmount>0){
    params.set("shipping_cost[amount]",String(args.shippingAmount));
    params.set("shipping_cost[tax_behavior]","exclusive");
  }

  const response=await fetch("https://api.stripe.com/v1/tax/calculations",{
    method:"POST",
    headers:{
      authorization:`Bearer ${requireSecret()}`,
      "content-type":"application/x-www-form-urlencoded",
    },
    body:params.toString(),
    cache:"no-store",
  });

  const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
  if(!response.ok){
    const error=(payload?.error as Record<string,unknown>|undefined)?.message;
    throw new Error(typeof error==="string"?error:"Stripe Tax calculation failed.");
  }

  return {
    id:String(payload?.id??""),
    amountTax:Number(payload?.tax_amount_exclusive??0),
    amountTotal:Number(payload?.amount_total??0),
    currency:String(payload?.currency??args.currency),
  };
}

export async function createStripeTaxTransaction(args:{
  calculationId:string;
  reference:string;
}){
  const params=new URLSearchParams();
  params.set("calculation",args.calculationId);
  params.set("reference",args.reference);

  const response=await fetch("https://api.stripe.com/v1/tax/transactions/create_from_calculation",{
    method:"POST",
    headers:{
      authorization:`Bearer ${requireSecret()}`,
      "content-type":"application/x-www-form-urlencoded",
    },
    body:params.toString(),
    cache:"no-store",
  });

  const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
  if(!response.ok){
    const error=(payload?.error as Record<string,unknown>|undefined)?.message;
    throw new Error(typeof error==="string"?error:"Stripe Tax transaction failed.");
  }
  return String(payload?.id??"");
}


export async function reverseStripeTaxTransaction(args:{
  originalTransactionId:string;
  reference:string;
  amount?:number;
  full:boolean;
}){
  const params=new URLSearchParams();
  params.set("mode",args.full?"full":"partial");
  params.set("original_transaction",args.originalTransactionId);
  params.set("reference",args.reference);
  if(!args.full){
    if(!args.amount||args.amount<=0)throw new Error("Partial tax reversal requires a positive amount.");
    params.set("flat_amount",String(-args.amount));
  }

  const response=await fetch("https://api.stripe.com/v1/tax/transactions/create_reversal",{
    method:"POST",
    headers:{
      authorization:`Bearer ${requireSecret()}`,
      "content-type":"application/x-www-form-urlencoded",
    },
    body:params.toString(),
    cache:"no-store",
  });

  const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
  if(!response.ok){
    const error=(payload?.error as Record<string,unknown>|undefined)?.message;
    throw new Error(typeof error==="string"?error:"Stripe Tax reversal failed.");
  }
  return String(payload?.id??"");
}
