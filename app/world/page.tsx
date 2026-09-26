import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export default function WorldPage() {
  return (
    <main className="page-shell">
      <section className="world-intro">
        <p>3RD WORLD / CULTURE</p>
        <h1>THE WORLD IS<br />BIGGER THAN THE PRODUCT.</h1>
      </section>

      <section className="editorial-grid">
        <article className="editorial-card editorial-card--wide">
          <span>FILM 001</span>
          <h2>NEW YORK / AFTER DARK</h2>
        </article>
        <article className="editorial-card">
          <span>PEOPLE</span>
          <h2>VOICES OF WORLD 001</h2>
        </article>
        <article className="editorial-card tone-burgundy">
          <span>SOUND</span>
          <h2>TRANSMISSION 001</h2>
        </article>
      </section>

      <section className="world-link-panel">
        <span>CURRENT RELEASE</span>
        <Link href="/world/001">ENTER WORLD 001 →</Link>
      </section>

      <SiteFooter />
    </main>
  );
}
