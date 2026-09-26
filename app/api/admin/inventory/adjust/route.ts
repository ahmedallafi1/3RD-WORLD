import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {adjustInventoryTx} from "@/lib/commerce/repositories/inventory-db";

const allowed=new Set(["OWNER","ADMIN","OPERATIONS"]);

export async function POST(request:NextRequest){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await request.json().catch(()=>null) as
    | {variantId?:string;locationId?:string;delta?:number;note?:string}
    | null;
  if(!body?.variantId||!body.locationId||!Number.isInteger(body.delta)){
    return NextResponse.json({error:"variantId, locationId and integer delta are required."},{status:400});
  }

  try{
    const data=await adjustInventoryTx({
      variantId:body.variantId,
      locationId:body.locationId,
      delta:Number(body.delta),
      actorId:user.id,
      note:body.note,
    });
    return NextResponse.json({data});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to adjust inventory."},
      {status:409},
    );
  }
}
