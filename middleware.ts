import {NextRequest,NextResponse} from "next/server";

const mutationMethods=new Set(["POST","PUT","PATCH","DELETE"]);

function allowedOrigin(request:NextRequest){
  const origin=request.headers.get("origin");
  if(!origin)return true;

  try{
    const parsed=new URL(origin);
    const host=request.headers.get("x-forwarded-host")||request.headers.get("host");
    if(!host)return false;
    return parsed.host===host;
  }catch{
    return false;
  }
}

function securityHeaders(response:NextResponse,request:NextRequest){
  const requestId=request.headers.get("x-request-id")||crypto.randomUUID();
  const production=process.env.NODE_ENV==="production";
  const scriptSrc=production
    ?"script-src 'self' 'unsafe-inline' https://js.stripe.com"
    :"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com";

  const directives=[
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    scriptSrc,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "connect-src 'self' https://api.stripe.com https://r.stripe.com https://q.stripe.com https://m.stripe.network",
    "worker-src 'self' blob:",
  ];
  if(production)directives.push("upgrade-insecure-requests");

  response.headers.set("x-request-id",requestId);
  response.headers.set("x-content-type-options","nosniff");
  response.headers.set("x-frame-options","DENY");
  response.headers.set("referrer-policy","strict-origin-when-cross-origin");
  response.headers.set("permissions-policy",'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")');
  response.headers.set("content-security-policy",directives.join("; "));

  if(production){
    response.headers.set("strict-transport-security","max-age=63072000; includeSubDomains; preload");
  }
  if(request.nextUrl.pathname.startsWith("/admin")||request.nextUrl.pathname.startsWith("/api/admin")){
    response.headers.set("cache-control","private, no-store, max-age=0");
  }
  return response;
}

export function middleware(request:NextRequest){
  const path=request.nextUrl.pathname;
  const exempt=
    path.startsWith("/api/webhooks/")||
    path.startsWith("/api/system/");

  if(
    mutationMethods.has(request.method) &&
    path.startsWith("/api/") &&
    !exempt &&
    !allowedOrigin(request)
  ){
    return securityHeaders(
      NextResponse.json({error:"Invalid request origin."},{status:403}),
      request,
    );
  }

  return securityHeaders(NextResponse.next(),request);
}

export const config={
  matcher:["/((?!_next/static|_next/image|favicon.ico).*)"],
};
