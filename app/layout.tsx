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
  category:"fashion",
  openGraph:{
    title:"3RD WORLD",
    description:"Global streetwear.",
    type:"website",
    siteName:"3RD WORLD",
    url:siteUrl
  },
  twitter:{
    card:"summary_large_image",
    title:"3RD WORLD",
    description:"Global streetwear."
  },
  robots:{index:true,follow:true},
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">SKIP TO CONTENT</a>
        <CartProvider>
          <SiteHeader/>
          <div id="main-content">{children}</div>
        </CartProvider>
      </body>
    </html>
  );
}
