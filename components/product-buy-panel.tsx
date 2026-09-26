"use client";

import { useMemo, useState } from "react";
import { money, type Product } from "@/lib/catalog";
import { useStorefront } from "@/components/storefront-provider";

export function ProductBuyPanel({ product }: { product: Product }) {
  const defaultSize = useMemo(() => (product.sizes.length === 1 ? product.sizes[0] : ""), [product.sizes]);
  const [size, setSize] = useState(defaultSize);
  const [message, setMessage] = useState("");
  const { addToBag } = useStorefront();

  function handleAdd() {
    if (!size) {
      setMessage("SELECT A SIZE");
      return;
    }
    setMessage("");
    addToBag(product, size);
  }

  return (
    <div className="buy-panel">
      <p className="eyebrow">{product.world}</p>
      <h1>{product.name}</h1>
      <p>{money(product.price)}</p>
      <p className="product-color">{product.color}</p>

      <div className="size-grid" aria-label="Select size">
        {product.sizes.map((item) => (
          <button
            key={item}
            className={size === item ? "is-selected" : ""}
            onClick={() => setSize(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {message && <p className="form-message">{message}</p>}

      <button className="button button--dark" onClick={handleAdd}>ADD TO BAG</button>

      <div className="product-accordions">
        <details>
          <summary>DETAILS</summary>
          <p>{product.description}</p>
          <ul>{product.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
        </details>
        <details><summary>FIT</summary><p>Designed with a relaxed streetwear silhouette. Final garment measurements will be added before launch.</p></details>
        <details><summary>SIZE GUIDE</summary><p>Complete garment measurements will be connected to the production specification in a later phase.</p></details>
        <details><summary>DELIVERY</summary><p>Market-aware delivery estimates arrive with the global commerce layer.</p></details>
        <details><summary>RETURNS</summary><p>Return rules will be configured before commerce launch.</p></details>
      </div>
    </div>
  );
}
