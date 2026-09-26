import Link from "next/link";
import { money, type Product } from "@/lib/catalog";
import { ProductVisual } from "@/components/product-visual";

export function ProductCard({ product, index }: { product: Product; index: number }) {
  return (
    <article className="product-card">
      <Link href={`/product/${product.slug}`} className="product-card__link">
        <ProductVisual product={product} index={index} />
        <div className="product-card__meta">
          <div><span>{product.name}</span><span>{product.color}</span></div>
          <span>{money(product.price)}</span>
        </div>
      </Link>
    </article>
  );
}
