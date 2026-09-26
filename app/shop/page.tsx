import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { SiteFooter } from "@/components/site-footer";
import { products } from "@/lib/catalog";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <main className="page-shell">
      <header className="shop-heading">
        <h1>SHOP</h1>
        <div className="shop-filters" aria-label="Product filters">
          <span className="is-active">ALL</span>
          <span>OUTERWEAR</span>
          <span>TOPS</span>
          <span>ACCESSORIES</span>
        </div>
      </header>

      <div className="product-grid product-grid--shop">
        {products.map((product, index) => (
          <ProductCard product={product} index={index} key={product.slug} />
        ))}
      </div>

      <SiteFooter />
    </main>
  );
}
