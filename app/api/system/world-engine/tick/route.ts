import {NextRequest,NextResponse} from "next/server";
import {runWorldEngine} from "@/lib/world-engine/lifecycle";

export const dynamic="force-dynamic";

function authorized(request:NextRequest){
  const secret=process.env.CRON_SECRET;
  if(!secret)return process.env.NODE_ENV!=="production";
  return request.headers.get("authorization")===`Bearer ${secret}`
    ||request.headers.get("x-cron-secret")===secret;
}

async function run(request:NextRequest){
  if(!authorized(request)){
    return NextResponse.json({error:"Forbidden"},{status:403});
  }
  if(!process.env.DATABASE_URL){
    return NextResponse.json({error:"Database is not configured."},{status:503});
  }

  try{
    return NextResponse.json({data:await runWorldEngine()});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"WORLD engine tick failed."},
      {status:500},
    );
  }
}

export async function GET(request:NextRequest){return run(request);}
export async function POST(request:NextRequest){return run(request);}
