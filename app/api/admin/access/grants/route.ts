import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {createAccessGrant} from "@/lib/world-engine/grants";

const allowed=new Set(["OWNER","ADMIN"]);

export async function POST(request:NextRequest){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {
    dropId?:string;
    email?:string;
    grantType?:"EARLY"|"VIP"|"PRIVATE";
    startsAt?:string|null;
    endsAt?:string|null;
  }|null;
  if(!body?.dropId||!body.email||!body.grantType){
    return NextResponse.json({error:"Drop, email and grant type are required."},{status:400});
  }

  try{
    const data=await createAccessGrant({
      dropId:body.dropId,
      email:body.email,
      grantType:body.grantType,
      startsAt:body.startsAt,
      endsAt:body.endsAt,
      actorId:user.id,
    });
    return NextResponse.json({data},{status:201});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to create grant."},{status:400});
  }
}
