import {NextRequest,NextResponse} from "next/server";
import {getCustomerUser} from "@/lib/auth/session";
import {prepareCheckout,type CheckoutLineInput} from "@/lib/commerce/prepare-checkout";
import type {ShippingAddress} from "@/lib/shipping/easypost";
import {assertRateLimit,requestFingerprint} from "@/lib/security/rate-limit";
import {normalizeEmail,validateShippingAddress} from "@/lib/security/validation";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }

  const body=await request.json().catch(()=>null) as
    | {
        email?:string;
        countryCode?:string;
        lines?:CheckoutLineInput[];
        shippingAddress?:ShippingAddress;
      }
    | null;
  const customer=await getCustomerUser();
  const email=normalizeEmail(body?.email??customer?.email);
  let address:ShippingAddress|undefined;
  try{
    address=body?.shippingAddress?validateShippingAddress(body.shippingAddress):undefined;
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Invalid delivery address."},
      {status:400},
    );
  }

  if(
    !email ||
    !body?.countryCode ||
    !Array.isArray(body.lines) ||
    !body.lines.length ||
    body.lines.length>30 ||
    !address
  ){
    return NextResponse.json(
      {error:"Email, items and a complete delivery address are required."},
      {status:400},
    );
  }

  try{
    await assertRateLimit({
      scope:"checkout-prepare",
      fingerprint:requestFingerprint(request.headers),
      identity:email,
      limit:30,
      windowSeconds:600,
    });

    const data=await prepareCheckout({
      email,
      countryCode:body.countryCode.trim().toUpperCase(),
      lines:body.lines,
      customerId:customer?.id,
      shippingAddress:address,
      accessTokens:Object.fromEntries(request.cookies.getAll().map(cookie=>[cookie.name,cookie.value])),
    });
    return NextResponse.json({data},{status:201});
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to prepare checkout.";
    const rateLimited=message.startsWith("Too many attempts");
    return NextResponse.json(
      {error:message},
      {
        status:rateLimited?429:409,
        headers:rateLimited?{"Retry-After":"600"}:undefined,
      },
    );
  }
}
