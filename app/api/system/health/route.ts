import {NextResponse} from "next/server";
import {query} from "@/lib/db";

export const dynamic="force-dynamic";

export async function GET(){
  const started=Date.now();
  let database="unconfigured";

  if(process.env.DATABASE_URL){
    try{
      await query("SELECT 1");
      database="ok";
    }catch{
      database="error";
    }
  }

  const healthy=database!=="error";
  return NextResponse.json(
    {
      status:healthy?"ok":"degraded",
      database,
      latencyMs:Date.now()-started,
      release:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)??null,
    },
    {
      status:healthy?200:503,
      headers:{"cache-control":"no-store"},
    },
  );
}
