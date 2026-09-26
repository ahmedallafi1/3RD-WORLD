import type { Metadata } from "next";
import "./globals.css";
import { StorefrontProvider } from "@/components/storefront-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteMenu } from "@/components/site-menu";
import { BagDrawer } from "@/components/bag-drawer";

export const metadata: Metadata = {
  title: {
    default: "3RD WORLD",
    template: "%s — 3RD WORLD",
  },
  description: "3RD WORLD — independent global streetwear.",
  metadataBase: new URL("https://3rdworld.com"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StorefrontProvider>
          <SiteHeader />
          <SiteMenu />
          <BagDrawer />
          {children}
        </StorefrontProvider>
      </body>
    </html>
  );
}
