import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {
  attachProductMedia,
  detachProductMedia,
  type ProductMediaKind,
  type ProductMediaRole,
} from "@/lib/commerce/repositories/media";

const allowed=new Set(["OWNER","ADMIN","CONTENT"]);
const kinds=new Set<ProductMediaKind>(["IMAGE","VIDEO"]);
const roles=new Set<ProductMediaRole>(["COVER","GALLERY","DETAIL","CAMPAIGN"]);

export async function POST(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  const body=await request.json().catch(()=>null) as {
    kind?:ProductMediaKind;storageKey?:string;altText?:string;
    role?:ProductMediaRole;position?:number;
  }|null;
  if(!body?.kind||!kinds.has(body.kind)||!body.storageKey||!body.role||!roles.has(body.role)){
    return NextResponse.json({error:"Kind, media location and role are required."},{status:400});
  }

  try{
    const data=await attachProductMedia({
      productId:id,
      kind:body.kind,
      storageKey:body.storageKey,
      altText:body.altText,
      role:body.role,
      position:body.position,
      actorId:user.id,
    });
    return NextResponse.json({data},{status:201});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to attach media."},
      {status:400},
    );
  }
}

export async function DELETE(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  const body=await request.json().catch(()=>null) as {mediaId?:string}|null;
  if(!body?.mediaId)return NextResponse.json({error:"mediaId is required."},{status:400});

  try{
    await detachProductMedia({productId:id,mediaId:body.mediaId,actorId:user.id});
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to detach media."},
      {status:400},
    );
  }
}
