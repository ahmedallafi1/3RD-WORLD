"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/catalog";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return [];
    return products.filter((product) =>
      [product.name, product.color, product.world].join(" ").toLowerCase().includes(value),
    );
  }, [query]);

  return (
    <main className="page-shell search-page">
      <label htmlFor="site-search">SEARCH</label>
      <input
        autoFocus
        id="site-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="TYPE TO SEARCH"
      />
      <div className="search-meta">
        <span>{query ? `${filtered.length} RESULTS` : "SEARCH 3RD WORLD"}</span>
      </div>
      <div className="product-grid product-grid--shop">
        {filtered.map((product, index) => (
          <ProductCard product={product} index={index} key={product.slug} />
        ))}
      </div>
    </main>
  );
}
