import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {query} from "@/lib/db";

const allowed=new Set(["OWNER","ADMIN","OPERATIONS"]);
const dutiesModes=new Set(["PAID","UNPAID","CALCULATED_AT_CHECKOUT"]);

export async function PATCH(
  request:NextRequest,
  {params}:{params:Promise<{code:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const {code}=await params;
  const body=await request.json().catch(()=>null) as {
    standardShippingAmount?:number;
    freeShippingThresholdAmount?:number|null;
    dutiesMode?:string;
  }|null;
  if(!body)return NextResponse.json({error:"Invalid request."},{status:400});

  const standard=Number(body.standardShippingAmount);
  const free=body.freeShippingThresholdAmount===null?null:Number(body.freeShippingThresholdAmount);
  if(!Number.isInteger(standard)||standard<0){
    return NextResponse.json({error:"Invalid standard shipping amount."},{status:400});
  }
  if(free!==null&&(!Number.isInteger(free)||free<0)){
    return NextResponse.json({error:"Invalid free-shipping threshold."},{status:400});
  }
  if(!body.dutiesMode||!dutiesModes.has(body.dutiesMode)){
    return NextResponse.json({error:"Invalid duties mode."},{status:400});
  }

  const result=await query(
    `UPDATE markets
     SET standard_shipping_amount=$2,
         free_shipping_threshold_amount=$3,
         duties_mode=$4,
         updated_at=now()
     WHERE code=$1
     RETURNING code`,
    [code.toUpperCase(),standard,free,body.dutiesMode],
  );
  if(!result.rows[0])return NextResponse.json({error:"Market not found."},{status:404});

  return NextResponse.json({ok:true});
}
