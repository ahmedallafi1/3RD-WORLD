import type {Metadata} from "next";
import "./globals.css";
import "./phase2.css";
import {CartProvider,SiteHeader} from "@/components/storefront";

const siteUrl=(process.env.PUBLIC_SITE_URL??"https://3rdworld.com").replace(/\/$/,"");

export const metadata:Metadata={
  metadataBase:new URL(siteUrl),
  title:{default:"3RD WORLD",template:"%s — 3RD WORLD"},
  description:"3RD WORLD — global streetwear.",
  applicationName:"3RD WORLD",
  alternates:{canonical:"/"},
  openGraph:{
    title:"3RD WORLD",
    description:"Global streetwear.",
    type:"website",
    siteName:"3RD WORLD",
    url:"/"
  },
  twitter:{
    card:"summary_large_image",
    title:"3RD WORLD",
    description:"Global streetwear."
  },
  robots:{
    index:true,
    follow:true,
  },
};

export default function RootLayout({children}:{children:React.ReactNode}){
  const organization={
    "@context":"https://schema.org",
    "@type":"Organization",
    name:"3RD WORLD",
    url:siteUrl,
  };

  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">SKIP TO CONTENT</a>
        <CartProvider>
          <SiteHeader/>
          <div id="main-content" tabIndex={-1}>{children}</div>
        </CartProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html:JSON.stringify(organization)}}
        />
      </body>
    </html>
  );
}
