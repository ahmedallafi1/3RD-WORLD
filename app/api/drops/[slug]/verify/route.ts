import {NextRequest,NextResponse} from "next/server";
import {consumeWaitlistEmailToken} from "@/lib/world-engine/access";
import {getDropBySlug} from "@/lib/world-engine/repository";
import {dropAccessCookieName} from "@/lib/world-engine/security";

export async function GET(
  request:NextRequest,
  {params}:{params:Promise<{slug:string}>},
){
  const {slug}=await params;
  const drop=await getDropBySlug(slug);
  if(!drop)return NextResponse.redirect(new URL("/archive",request.url));

  const token=request.nextUrl.searchParams.get("token");
  if(!token)return NextResponse.redirect(new URL("/drop/"+slug+"?access=missing",request.url));

  try{
    const session=await consumeWaitlistEmailToken({drop,token});
    const response=NextResponse.redirect(new URL("/drop/"+slug,request.url));
    response.cookies.set(dropAccessCookieName(slug),session.token,{
      httpOnly:true,
      secure:process.env.NODE_ENV==="production",
      sameSite:"lax",
      path:"/",
      expires:session.expiresAt,
    });
    return response;
  }catch{
    return NextResponse.redirect(new URL("/drop/"+slug+"?access=expired",request.url));
  }
}
