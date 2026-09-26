import type { Product } from "@/lib/catalog";

export function ProductVisual({
  product,
  index,
  compact = false,
}: {
  product: Product;
  index?: number;
  compact?: boolean;
}) {
  return (
    <div className={`product-visual tone-${product.tone} ${compact ? "is-compact" : ""}`}>
      <div className="product-visual__index">{String((index ?? 0) + 1).padStart(2, "0")}</div>
      <div className="product-visual__mark" aria-hidden="true">
        <span>3RD</span>
        <span className="visual-globe">◎</span>
        <span>WORLD</span>
      </div>
      <div className="product-visual__meta">
        <span>{product.world}</span>
        <span>{product.color}</span>
      </div>
    </div>
  );
}
