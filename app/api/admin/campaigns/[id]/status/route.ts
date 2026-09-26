import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {setCampaignStatus,type CampaignStatus} from "@/lib/world-engine/campaign-admin";

const allowed=new Set(["OWNER","ADMIN","CONTENT"]);
const statuses=new Set<CampaignStatus>(["DRAFT","PUBLISHED","ARCHIVED"]);

export async function POST(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  const body=await request.json().catch(()=>null) as {status?:CampaignStatus}|null;
  if(!body?.status||!statuses.has(body.status)){
    return NextResponse.json({error:"Invalid campaign status."},{status:400});
  }

  try{
    await setCampaignStatus({campaignId:id,status:body.status,actorId:user.id});
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to update campaign."},{status:400});
  }
}
