import {NextResponse} from "next/server";
import {isDatabaseConfigured,query} from "@/lib/db";

export const dynamic="force-dynamic";

export async function GET(){
  const started=Date.now();
  let database="unconfigured";
  let ok=true;

  if(isDatabaseConfigured()){
    try{
      await query("SELECT 1");
      database="ok";
    }catch{
      database="error";
      ok=false;
    }
  }else if(process.env.NODE_ENV==="production"){
    ok=false;
  }

  return NextResponse.json(
    {
      ok,
      database,
      version:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??"local",
      latencyMs:Date.now()-started,
    },
    {
      status:ok?200:503,
      headers:{
        "cache-control":"no-store",
      },
    },
  );
}
