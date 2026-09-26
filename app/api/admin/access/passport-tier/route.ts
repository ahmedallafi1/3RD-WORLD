import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {setPassportTier} from "@/lib/world-engine/grants";
import type {PassportTier} from "@/lib/world-engine/types";

const allowed=new Set(["OWNER","ADMIN"]);
const tiers=new Set<PassportTier>(["MEMBER","EARLY","VIP"]);

export async function POST(request:NextRequest){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {email?:string;tier?:PassportTier}|null;
  if(!body?.email||!body.tier||!tiers.has(body.tier)){
    return NextResponse.json({error:"Valid email and tier are required."},{status:400});
  }

  try{
    const data=await setPassportTier({
      email:body.email,
      tier:body.tier,
      actorId:user.id,
    });
    return NextResponse.json({data});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to set Passport tier."},{status:400});
  }
}
