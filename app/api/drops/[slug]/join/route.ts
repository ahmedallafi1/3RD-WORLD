import {NextRequest,NextResponse} from "next/server";
import {getCustomerUser} from "@/lib/auth/session";
import {joinAccessList} from "@/lib/world-engine/access";
import {getDropBySlug} from "@/lib/world-engine/repository";

export async function POST(
  request:NextRequest,
  {params}:{params:Promise<{slug:string}>},
){
  const {slug}=await params;
  const drop=await getDropBySlug(slug);
  if(!drop)return NextResponse.json({error:"Drop not found."},{status:404});

  const body=await request.json().catch(()=>null) as {email?:string}|null;
  if(!body?.email)return NextResponse.json({error:"Email is required."},{status:400});

  if(!process.env.DATABASE_URL){
    return NextResponse.json({ok:true,preview:true});
  }

  const customer=await getCustomerUser();
  try{
    const data=await joinAccessList({
      email:body.email,
      dropId:drop.id,
      customerId:customer?.id,
      type:"WAITLIST",
      source:"drop-"+slug,
    });
    return NextResponse.json({data});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to join waitlist."},
      {status:400},
    );
  }
}
