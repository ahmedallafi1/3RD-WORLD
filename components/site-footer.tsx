import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div><strong>3RD WORLD</strong><span>© 2026</span></div>
      <div>
        <Link href="/support">SUPPORT</Link>
        <Link href="/shipping">SHIPPING</Link>
        <Link href="/returns">RETURNS</Link>
      </div>
      <div><span>INSTAGRAM</span><span>TIKTOK</span><span>US / USD</span></div>
    </footer>
  );
}
