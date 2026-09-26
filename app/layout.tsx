import type {Metadata} from "next";
import "./globals.css";
import {CartProvider,SiteHeader} from "@/components/storefront";

export const metadata:Metadata={title:{default:"3RD WORLD",template:"%s — 3RD WORLD"},description:"3RD WORLD — global streetwear."};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en"><body><CartProvider><SiteHeader/>{children}</CartProvider></body></html>;
}
