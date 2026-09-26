"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStorefront } from "@/components/storefront-provider";

const primary = [
  ["/shop", "SHOP"],
  ["/world/001", "LATEST WORLD"],
  ["/archive", "ARCHIVE"],
  ["/world", "WORLD"],
] as const;

export function SiteMenu() {
  const pathname = usePathname();
  const { menuOpen, setMenuOpen } = useStorefront();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, setMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className={`site-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
      <div className="site-menu__top">
        <button className="text-button" onClick={() => setMenuOpen(false)}>
          CLOSE
        </button>
        <Link href="/" className="brand-lockup">
          3RD WORLD
        </Link>
        <span />
      </div>

      <nav className="site-menu__nav" aria-label="Primary navigation">
        {primary.map(([href, label]) => (
          <Link href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>

      <div className="site-menu__utility">
        <div>
          <Link href="/search">SEARCH</Link>
          <Link href="/passport">PASSPORT</Link>
        </div>
        <div>
          <span>INSTAGRAM</span>
          <span>TIKTOK</span>
          <span>US / USD</span>
        </div>
      </div>
    </div>
  );
}
