import type { NextConfig } from "next";

const securityHeaders=[
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"X-Frame-Options",value:"DENY"},
  {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
  {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"},
  {key:"Cross-Origin-Opener-Policy",value:"same-origin-allow-popups"},
  {key:"Cross-Origin-Resource-Policy",value:"same-site"},
  {
    key:"Content-Security-Policy",
    value:[
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.stripe.network https://openexchangerates.org https://api.easypost.com https://api.resend.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://*.stripe.com https://*.stripe.network",
      "worker-src 'self' blob:"
    ].join("; ")
  }
];

if(process.env.NODE_ENV==="production"){
  securityHeaders.push({
    key:"Strict-Transport-Security",
    value:"max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  poweredByHeader:false,
  reactStrictMode:true,
  compress:true,
  productionBrowserSourceMaps:false,
  headers:async()=>[
    {
      source:"/:path*",
      headers:securityHeaders,
    },
  ],
};

export default nextConfig;
