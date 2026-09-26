import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {
  createCampaign,
  type CampaignStatus,
  type CampaignType,
} from "@/lib/world-engine/campaign-admin";

const allowed=new Set(["OWNER","ADMIN","CONTENT"]);
const types=new Set<CampaignType>(["FILM","EDITORIAL","LOOKBOOK","STORY","SOUND"]);
const statuses=new Set<CampaignStatus>(["DRAFT","PUBLISHED","ARCHIVED"]);

export async function POST(request:NextRequest){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as {
    worldId?:string;type?:CampaignType;title?:string;slug?:string;eyebrow?:string;
    body?:string;position?:number;status?:CampaignStatus;
  }|null;
  if(!body?.worldId||!body.type||!types.has(body.type)||!body.title||!body.slug){
    return NextResponse.json({error:"World, type, title and slug are required."},{status:400});
  }
  if(body.status&&!statuses.has(body.status)){
    return NextResponse.json({error:"Invalid campaign status."},{status:400});
  }

  try{
    const data=await createCampaign({
      worldId:body.worldId,
      type:body.type,
      title:body.title,
      slug:body.slug,
      eyebrow:body.eyebrow,
      body:body.body,
      position:body.position,
      status:body.status,
      actorId:user.id,
    });
    return NextResponse.json({data},{status:201});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Unable to create campaign."},{status:400});
  }
}
