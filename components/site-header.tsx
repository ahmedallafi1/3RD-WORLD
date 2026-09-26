"use client";

import Link from "next/link";
import { useStorefront } from "@/components/storefront-provider";

export function SiteHeader() {
  const { setMenuOpen, setBagOpen, bagCount } = useStorefront();

  return (
    <header className="site-header">
      <button className="text-button" onClick={() => setMenuOpen(true)}>
        MENU
      </button>

      <Link className="brand-lockup" href="/" aria-label="3RD WORLD home">
        <span>3RD WORLD</span>
      </Link>

      <div className="header-actions">
        <Link className="desktop-only" href="/search">
          SEARCH
        </Link>
        <button className="text-button" onClick={() => setBagOpen(true)}>
          BAG ({bagCount})
        </button>
      </div>
    </header>
  );
}
