type RatesResponse={
  base:string;
  timestamp:number;
  rates:Record<string,number>;
};

let cached:{expiresAt:number;data:RatesResponse}|null=null;

export function fxConfigured(){
  return Boolean(process.env.OPEN_EXCHANGE_RATES_APP_ID);
}

async function latestRates(){
  const now=Date.now();
  if(cached&&cached.expiresAt>now)return cached.data;

  const appId=process.env.OPEN_EXCHANGE_RATES_APP_ID;
  if(!appId)throw new Error("OPEN_EXCHANGE_RATES_APP_ID is not configured.");

  const response=await fetch(
    "https://openexchangerates.org/api/latest.json?app_id="+encodeURIComponent(appId),
    {cache:"no-store"},
  );
  const payload=await response.json().catch(()=>null) as RatesResponse|null;
  if(!response.ok||!payload?.rates){
    throw new Error("FX rate provider request failed.");
  }

  cached={expiresAt:now+15*60*1000,data:payload};
  return payload;
}

export async function convertAmount(args:{
  amount:number;
  from:string;
  to:string;
  applyMargin?:boolean;
}){
  const from=args.from.toUpperCase();
  const to=args.to.toUpperCase();
  if(from===to)return {amount:args.amount,rate:1};

  const data=await latestRates();
  const base=data.base.toUpperCase();
  const fromRate=from===base?1:data.rates[from];
  const toRate=to===base?1:data.rates[to];
  if(!fromRate||!toRate)throw new Error("FX rate is unavailable for this currency.");

  const rate=(toRate/fromRate)*
    (args.applyMargin===false?1:1+Number(process.env.FX_MARGIN_BPS??0)/10000);

  return {
    amount:Math.max(0,Math.round(args.amount*rate)),
    rate,
  };
}
