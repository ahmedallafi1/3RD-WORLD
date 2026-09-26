import {NextRequest,NextResponse} from "next/server";
import {getCustomerUser} from "@/lib/auth/session";
import {setProductSaved} from "@/lib/world-engine/saved";

export async function POST(
  request:NextRequest,
  {params}:{params:Promise<{slug:string}>},
){
  const customer=await getCustomerUser();
  if(!customer)return NextResponse.json({error:"Sign in to Passport first."},{status:401});
  const {slug}=await params;
  const body=await request.json().catch(()=>({})) as {saved?:boolean};

  try{
    await setProductSaved({
      customerId:customer.id,
      slug,
      saved:body.saved!==false,
    });
    return NextResponse.json({saved:body.saved!==false});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to save piece."},
      {status:400},
    );
  }
}
