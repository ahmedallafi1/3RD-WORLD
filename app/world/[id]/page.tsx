import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { products } from "@/lib/catalog";

export default async function WorldDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const worldLabel = `WORLD ${id.padStart(3, "0")}`;

  return (
    <main>
      <section className="world-release-hero">
        <div className="release-number">{worldLabel}</div>
        <div className="hero-globe" aria-hidden="true">◎</div>
        <div className="world-release-hero__copy">
          <span>NEW YORK / 2026</span>
          <h1>NO BORDERS.<br />NO EXCESS.</h1>
          <Link href="/shop">SHOP THE WORLD</Link>
        </div>
      </section>

      <section className="release-story">
        <p>WORLD 001 IS THE FIRST TRANSMISSION FROM 3RD WORLD.</p>
        <p>BUILT AROUND HEAVY FABRIC, QUIET GRAPHICS AND A GLOBAL POINT OF VIEW.</p>
      </section>

      <section className="featured-section">
        <div className="section-heading">
          <h2>{worldLabel}</h2>
          <span>04 PIECES</span>
        </div>
        <div className="product-grid">
          {products.map((product, index) => (
            <ProductCard product={product} index={index} key={product.slug} />
          ))}
        </div>
      </section>

      <section className="campaign-panel campaign-panel--light">
        <div className="campaign-panel__coordinates">
          <span>TRANSMISSION 001</span>
          <span>NYC</span>
        </div>
        <div>
          <p>ARCHIVE THE MOMENT</p>
          <h2>WORLD 001<br />DOCUMENTED.</h2>
          <Link href="/archive">VIEW ARCHIVE</Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
