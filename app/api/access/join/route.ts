import {NextRequest,NextResponse} from "next/server";
import {getCustomerUser} from "@/lib/auth/session";
import {joinAccessList} from "@/lib/world-engine/access";
import {assertRateLimit,normalizedIdentity,requestFingerprint} from "@/lib/security/rate-limit";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({ok:true,preview:true});
  }

  const body=await request.json().catch(()=>null) as {email?:string;source?:string}|null;
  const email=normalizedIdentity(body?.email);
  if(!email||email.length>320)return NextResponse.json({error:"Email is required."},{status:400});
  const customer=await getCustomerUser();

  try{
    await assertRateLimit({
      scope:"world-access-signup",
      fingerprint:requestFingerprint(request.headers),
      identity:email,
      limit:10,
      windowSeconds:3600,
    });
    const data=await joinAccessList({
      email,
      customerId:customer?.id,
      type:"WORLD",
      source:body.source??"site",
    });
    return NextResponse.json({data});
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to join.";
    const rateLimited=message.startsWith("Too many attempts");
    return NextResponse.json(
      {error:message},
      {status:rateLimited?429:400,headers:rateLimited?{"Retry-After":"3600"}:undefined},
    );
  }
}
