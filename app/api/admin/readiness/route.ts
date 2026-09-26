import {NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {getSystemReadiness} from "@/lib/ops/readiness";

export async function GET(){
  const user=await getAdminUser();
  if(!user||!["OWNER","ADMIN","OPERATIONS"].includes(user.role)){
    return NextResponse.json({error:"Forbidden"},{status:403});
  }
  return NextResponse.json({data:await getSystemReadiness()});
}
