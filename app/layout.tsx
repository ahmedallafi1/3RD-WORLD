import type {Metadata} from "next";
import "./globals.css";
import "./phase2.css";
import {CartProvider,SiteHeader} from "@/components/storefront";

export const metadata:Metadata={
  metadataBase:new URL("https://3rdworld.com"),
  title:{default:"3RD WORLD",template:"%s — 3RD WORLD"},
  description:"3RD WORLD — global streetwear.",
  openGraph:{
    title:"3RD WORLD",
    description:"Global streetwear. WORLD 001.",
    type:"website",
    siteName:"3RD WORLD"
  },
  twitter:{
    card:"summary_large_image",
    title:"3RD WORLD",
    description:"Global streetwear. WORLD 001."
  }
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><CartProvider><SiteHeader/>{children}</CartProvider></body></html>;
}
