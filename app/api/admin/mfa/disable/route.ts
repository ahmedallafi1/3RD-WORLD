import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {disableAdminMfa} from "@/lib/security/admin-mfa";

export async function POST(request:NextRequest){
  const user=await getAdminUser();
  if(!user)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {code?:string}|null;
  if(!body?.code)return NextResponse.json({error:"Authentication code is required."},{status:400});

  try{
    await disableAdminMfa({adminUserId:user.id,code:body.code});
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to disable MFA."},
      {status:400},
    );
  }
}
