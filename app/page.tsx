import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { products } from "@/lib/catalog";

export default function HomePage() {
  return (
    <main>
      <section className="home-hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-globe" aria-hidden="true">◎</div>
        <h1>3RD WORLD</h1>
        <div className="home-hero__footer">
          <span>WORLD 001</span>
          <Link href="/shop">SHOP THE DROP</Link>
        </div>
      </section>

      <section className="featured-section">
        <div className="section-heading">
          <h2>WORLD 001</h2>
          <Link href="/shop">VIEW ALL</Link>
        </div>
        <div className="product-grid">
          {products.map((product, index) => (
            <ProductCard product={product} index={index} key={product.slug} />
          ))}
        </div>
      </section>

      <section className="campaign-panel">
        <div className="campaign-panel__coordinates">
          <span>40.7128° N</span>
          <span>74.0060° W</span>
        </div>
        <div>
          <p>WORLD 001 / NEW YORK</p>
          <h2>NO BORDERS.<br />NO EXCESS.</h2>
          <Link href="/world/001">ENTER WORLD 001</Link>
        </div>
      </section>

      <section className="access-signup">
        <div>
          <p>PRIVATE RELEASES / EARLY ACCESS</p>
          <h2>ENTER THE WORLD.</h2>
        </div>
        <form className="access-form" action="/access" method="get">
          <label className="sr-only" htmlFor="access-email">Email</label>
          <input id="access-email" type="email" placeholder="EMAIL ADDRESS" />
          <button type="submit">SUBMIT</button>
        </form>
      </section>

      <SiteFooter />
    </main>
  );
}
