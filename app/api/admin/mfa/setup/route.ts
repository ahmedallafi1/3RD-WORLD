import {NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {beginAdminMfaSetup} from "@/lib/security/admin-mfa";

export async function POST(){
  const user=await getAdminUser();
  if(!user)return NextResponse.json({error:"Forbidden"},{status:403});
  if(user.mfaEnabled){
    return NextResponse.json({error:"MFA is already enabled."},{status:409});
  }

  try{
    const data=await beginAdminMfaSetup({
      adminUserId:user.id,
      email:user.email,
    });
    return NextResponse.json({data});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to start MFA setup."},
      {status:400},
    );
  }
}
