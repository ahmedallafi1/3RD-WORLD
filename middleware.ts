import {NextRequest,NextResponse} from "next/server";

const mutationMethods=new Set(["POST","PUT","PATCH","DELETE"]);
const exemptPrefixes=[
  "/api/webhooks/",
  "/api/system/",
];

function isMutationApi(request:NextRequest){
  return request.nextUrl.pathname.startsWith("/api/")
    &&mutationMethods.has(request.method.toUpperCase());
}

function sameOrigin(request:NextRequest){
  const origin=request.headers.get("origin");
  const secFetchSite=request.headers.get("sec-fetch-site");

  if(secFetchSite==="cross-site")return false;
  if(!origin)return true;

  try{
    const originUrl=new URL(origin);
    const forwardedHost=request.headers.get("x-forwarded-host");
    const requestHost=forwardedHost??request.headers.get("host")??request.nextUrl.host;
    return originUrl.host===requestHost;
  }catch{
    return false;
  }
}

export function middleware(request:NextRequest){
  if(!isMutationApi(request))return NextResponse.next();

  if(exemptPrefixes.some(prefix=>request.nextUrl.pathname.startsWith(prefix))){
    return NextResponse.next();
  }

  if(!sameOrigin(request)){
    return NextResponse.json({error:"Cross-site request blocked."},{status:403});
  }

  const declared=Number(request.headers.get("content-length")??0);
  if(Number.isFinite(declared)&&declared>512_000){
    return NextResponse.json({error:"Request body is too large."},{status:413});
  }

  const response=NextResponse.next();
  response.headers.set("x-content-type-options","nosniff");
  response.headers.set("referrer-policy","strict-origin-when-cross-origin");
  return response;
}

export const config={
  matcher:["/api/:path*"],
};
