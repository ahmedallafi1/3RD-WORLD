import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductBuyPanel } from "@/components/product-buy-panel";
import { ProductVisual } from "@/components/product-visual";
import { SiteFooter } from "@/components/site-footer";
import { getProduct, products } from "@/lib/catalog";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  return (
    <main className="product-page">
      <div className="product-gallery">
        <ProductVisual product={product} index={0} />
        <div className="product-detail-frame tone-bone">
          <span>DETAIL / MATERIAL</span>
          <span className="detail-mark">3RD WORLD</span>
        </div>
        <div className={`product-detail-frame tone-${product.tone}`}>
          <span>BACK / WORLD 001</span>
          <span className="detail-mark">◎</span>
        </div>
      </div>

      <aside className="product-info">
        <ProductBuyPanel product={product} />
      </aside>

      <div className="product-footer-span">
        <SiteFooter />
      </div>
    </main>
  );
}
