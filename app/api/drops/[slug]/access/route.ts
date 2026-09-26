import {NextRequest,NextResponse} from "next/server";
import {getCustomerUser} from "@/lib/auth/session";
import {getDropBySlug} from "@/lib/world-engine/repository";
import {
  assertAccessAttemptAllowed,
  recordAccessAttempt,
  redeemDropCode,
  requestWaitlistEmailAccess,
} from "@/lib/world-engine/access";
import {
  dropAccessCookieName,
  hashAccessFingerprint,
} from "@/lib/world-engine/security";

function fingerprint(request:NextRequest){
  const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ??request.headers.get("cf-connecting-ip")
    ??"unknown";
  const agent=request.headers.get("user-agent")??"unknown";
  return hashAccessFingerprint(ip+"|"+agent);
}

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
  const fp=fingerprint(request);

  try{
    await assertAccessAttemptAllowed(fp);

    if(body?.code){
      const session=await redeemDropCode({
        drop,
        code:body.code,
        customerId:customer?.id,
        email:body.email??customer?.email,
      });
      await recordAccessAttempt({
        dropId:drop.id,
        customerId:customer?.id,
        email:body.email??customer?.email,
        granted:true,
        accessLevel:"CODE",
        fingerprint:fp,
      });

      const response=NextResponse.json({ok:true});
      response.cookies.set(dropAccessCookieName(slug),session.token,{
        httpOnly:true,
        secure:process.env.NODE_ENV==="production",
        sameSite:"lax",
        path:"/",
        expires:session.expiresAt,
      });
      return response;
    }

    if(body?.email){
      const result=await requestWaitlistEmailAccess({
        drop,
        email:body.email,
        customerId:customer?.id,
      });
      await recordAccessAttempt({
        dropId:drop.id,
        customerId:customer?.id,
        email:body.email,
        granted:true,
        accessLevel:"EMAIL_LINK",
        fingerprint:fp,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({error:"Enter an access code or approved email."},{status:400});
  }catch(error){
    await recordAccessAttempt({
      dropId:drop.id,
      customerId:customer?.id,
      email:body?.email??customer?.email,
      granted:false,
      fingerprint:fp,
    }).catch(()=>undefined);

    return NextResponse.json(
      {error:error instanceof Error?error.message:"Access denied."},
      {status:403},
    );
  }
}
