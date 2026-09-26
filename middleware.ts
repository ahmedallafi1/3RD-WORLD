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

function requestId(request:NextRequest){
  const existing=request.headers.get("x-request-id");
  return existing&&existing.length<=128?existing:crypto.randomUUID();
}

function nextWithRequestId(request:NextRequest,id:string){
  const headers=new Headers(request.headers);
  headers.set("x-request-id",id);
  const response=NextResponse.next({request:{headers}});
  response.headers.set("x-request-id",id);
  response.headers.set("x-content-type-options","nosniff");
  response.headers.set("referrer-policy","strict-origin-when-cross-origin");
  return response;
}

export function middleware(request:NextRequest){
  const id=requestId(request);

  if(!isMutationApi(request)){
    return nextWithRequestId(request,id);
  }

  if(exemptPrefixes.some(prefix=>request.nextUrl.pathname.startsWith(prefix))){
    return nextWithRequestId(request,id);
  }

  if(!sameOrigin(request)){
    return NextResponse.json(
      {error:"Cross-site request blocked.",requestId:id},
      {status:403,headers:{"x-request-id":id}},
    );
  }

  const declared=Number(request.headers.get("content-length")??0);
  if(Number.isFinite(declared)&&declared>512_000){
    return NextResponse.json(
      {error:"Request body is too large.",requestId:id},
      {status:413,headers:{"x-request-id":id}},
    );
  }

  return nextWithRequestId(request,id);
}

export const config={
  matcher:["/api/:path*"],
};
