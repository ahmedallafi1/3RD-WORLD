import {NextRequest,NextResponse} from "next/server";
import {ADMIN_COOKIE,createAdminSession} from "@/lib/auth/session";
import {verifyAdminMfaChallenge} from "@/lib/security/admin-mfa";
import {assertRateLimit,requestFingerprint} from "@/lib/security/rate-limit";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }

  const body=await request.json().catch(()=>null) as {challengeToken?:string;code?:string}|null;
  if(!body?.challengeToken||!body.code){
    return NextResponse.json({error:"Authentication code is required."},{status:400});
  }

  try{
    await assertRateLimit({
      scope:"admin-mfa",
      fingerprint:requestFingerprint(request.headers),
      identity:body.challengeToken.slice(0,32),
      limit:8,
      windowSeconds:600,
    });
    const verified=await verifyAdminMfaChallenge({
      token:body.challengeToken,
      code:body.code,
    });
    const session=await createAdminSession(verified.adminUserId);
    const response=NextResponse.json({ok:true});
    response.cookies.set(ADMIN_COOKIE,session.token,{
      httpOnly:true,
      secure:process.env.NODE_ENV==="production",
      sameSite:"strict",
      priority:"high",
      path:"/",
      expires:session.expiresAt,
    });
    return response;
  }catch(error){
    const message=error instanceof Error?error.message:"Authentication failed.";
    const rateLimited=message.startsWith("Too many attempts");
    return NextResponse.json(
      {error:message},
      {status:rateLimited?429:401,headers:rateLimited?{"Retry-After":"600"}:undefined},
    );
  }
}
