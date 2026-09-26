import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {createDrop,type AdminDropInput} from "@/lib/world-engine/admin";

const allowed=new Set(["OWNER","ADMIN","CONTENT"]);

export async function POST(request:NextRequest){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as AdminDropInput|null;
  if(!body)return NextResponse.json({error:"Invalid request."},{status:400});

  try{
    const data=await createDrop(body,user.id);
    return NextResponse.json({data},{status:201});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to create drop."},
      {status:400},
    );
  }
}
