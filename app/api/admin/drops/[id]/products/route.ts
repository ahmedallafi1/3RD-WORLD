import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {setDropProducts} from "@/lib/world-engine/admin";

const allowed=new Set(["OWNER","ADMIN","CONTENT"]);

export async function PUT(
  request:NextRequest,
  {params}:{params:Promise<{id:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  const body=await request.json().catch(()=>null) as {productIds?:string[]}|null;
  if(!body||!Array.isArray(body.productIds)){
    return NextResponse.json({error:"productIds is required."},{status:400});
  }

  try{
    const data=await setDropProducts({
      dropId:id,
      productIds:body.productIds,
      actorId:user.id,
    });
    return NextResponse.json({data});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to assign products."},
      {status:400},
    );
  }
}
