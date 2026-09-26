import {NextRequest,NextResponse} from "next/server";
import {getCustomerUser} from "@/lib/auth/session";
import {joinAccessList} from "@/lib/world-engine/access";
import {assertActionRateLimit} from "@/lib/security/action-rate-limit";

export async function POST(request:NextRequest){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({ok:true,preview:true});
  }

  try{
    await assertActionRateLimit({request,action:"WORLD_ACCESS_JOIN",maxAttempts:8,windowMinutes:15});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Too many requests."},{status:429});
  }

  const body=await request.json().catch(()=>null) as {email?:string;source?:string}|null;
  if(!body?.email)return NextResponse.json({error:"Email is required."},{status:400});
  const customer=await getCustomerUser();

  try{
    const data=await joinAccessList({
      email:body.email,
      customerId:customer?.id,
      type:"WORLD",
      source:body.source??"site",
    });
    return NextResponse.json({data});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to join."},
      {status:400},
    );
  }
}
