import {NextRequest,NextResponse} from "next/server";
import {getCustomerUser} from "@/lib/auth/session";
import {prepareCheckout,type CheckoutLineInput} from "@/lib/commerce/prepare-checkout";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }

  const body=await request.json().catch(()=>null) as
    | {
        email?:string;
        countryCode?:string;
        lines?:CheckoutLineInput[];
        shippingAddress?:Record<string,unknown>;
      }
    | null;
  const customer=await getCustomerUser();
  const email=body?.email??customer?.email;

  if(!email||!body?.countryCode||!Array.isArray(body.lines)||!body.lines.length){
    return NextResponse.json(
      {error:"email, countryCode and lines are required."},
      {status:400},
    );
  }

  try{
    const data=await prepareCheckout({
      email,
      countryCode:body.countryCode,
      lines:body.lines,
      customerId:customer?.id,
      shippingAddress:body.shippingAddress,
    });
    return NextResponse.json({data},{status:201});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to prepare checkout."},
      {status:409},
    );
  }
}
