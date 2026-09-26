import {NextRequest,NextResponse} from "next/server";
import {getCustomerUser} from "@/lib/auth/session";
import {query} from "@/lib/db";
import {joinAccessList} from "@/lib/world-engine/access";
import {assertRateLimit,normalizedIdentity,requestFingerprint} from "@/lib/security/rate-limit";

export async function POST(
  request:NextRequest,
  {params}:{params:Promise<{slug:string}>},
){
  if(!process.env.DATABASE_URL){
    return NextResponse.json({ok:true,preview:true});
  }

  const {slug}=await params;
  const body=await request.json().catch(()=>null) as {email?:string}|null;
  const customer=await getCustomerUser();
  const email=normalizedIdentity(body?.email??customer?.email);
  if(!email||email.length>320)return NextResponse.json({error:"Email is required."},{status:400});

  const product=await query<{id:string}>(
    "SELECT id FROM products WHERE slug=$1 AND status='ACTIVE' LIMIT 1",
    [slug],
  );
  if(!product.rows[0])return NextResponse.json({error:"Product not found."},{status:404});

  try{
    await assertRateLimit({
      scope:"restock-signup",
      fingerprint:requestFingerprint(request.headers),
      identity:email+"|"+slug,
      limit:10,
      windowSeconds:3600,
    });
    await joinAccessList({
      email,
      productId:product.rows[0].id,
      customerId:customer?.id,
      type:"RESTOCK",
      source:"product-"+slug,
    });
    return NextResponse.json({ok:true});
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to join restock list.";
    const rateLimited=message.startsWith("Too many attempts");
    return NextResponse.json(
      {error:message},
      {status:rateLimited?429:400,headers:rateLimited?{"Retry-After":"3600"}:undefined},
    );
  }
}
