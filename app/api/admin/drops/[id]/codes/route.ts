import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {createDropAccessCode} from "@/lib/world-engine/admin";

const allowed=new Set(["OWNER","ADMIN","CONTENT"]);

export async function POST(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  const body=await request.json().catch(()=>({})) as {
    code?:string;label?:string;maxUses?:number|null;startsAt?:string|null;endsAt?:string|null;
  };

  try{
    const data=await createDropAccessCode({
      dropId:id,
      actorId:user.id,
      code:body.code,
      label:body.label,
      maxUses:body.maxUses,
      startsAt:body.startsAt,
      endsAt:body.endsAt,
    });
    return NextResponse.json({data},{status:201});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to create access code."},
      {status:400},
    );
  }
}
