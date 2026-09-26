import {NextRequest,NextResponse} from "next/server";
import {getCustomerUser} from "@/lib/auth/session";
import {getDropBySlug} from "@/lib/world-engine/repository";
import {
  redeemDropCode,
  redeemWaitlistEmail,
} from "@/lib/world-engine/access";
import {dropAccessCookieName} from "@/lib/world-engine/security";

export async function POST(
  request:NextRequest,
  {params}:{params:Promise<{slug:string}>},
){
  const {slug}=await params;
  const drop=await getDropBySlug(slug);
  if(!drop)return NextResponse.json({error:"Drop not found."},{status:404});
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Access engine is not configured."},{status:503});
  }

  const body=await request.json().catch(()=>null) as {code?:string;email?:string}|null;
  const customer=await getCustomerUser();

  try{
    const session=body?.code
      ? await redeemDropCode({
          drop,
          code:body.code,
          customerId:customer?.id,
          email:body.email??customer?.email,
        })
      : body?.email
        ? await redeemWaitlistEmail({
            drop,
            email:body.email,
            customerId:customer?.id,
          })
        : null;

    if(!session){
      return NextResponse.json({error:"Enter an access code or approved email."},{status:400});
    }

    const response=NextResponse.json({ok:true});
    response.cookies.set(dropAccessCookieName(slug),session.token,{
      httpOnly:true,
      secure:process.env.NODE_ENV==="production",
      sameSite:"lax",
      path:"/",
      expires:session.expiresAt,
    });
    return response;
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Access denied."},
      {status:403},
    );
  }
}
