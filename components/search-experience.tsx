"use client";

import {useMemo,useState} from "react";
import {ProductCard} from "@/components/storefront";
import {products} from "@/lib/catalog";

export function SearchExperience(){
  const [query,setQuery]=useState("");
  const normalized=query.trim().toLowerCase();
  const results=useMemo(()=>{
    if(!normalized)return [];
    return products.filter(product=>
      [product.name,product.color,product.category,product.world]
        .some(value=>value.toLowerCase().includes(normalized))
    );
  },[normalized]);

  return (
    <main className="search-page">
      <label className="search-field">
        <span>SEARCH 3RD WORLD</span>
        <input
          autoFocus
          value={query}
          onChange={event=>setQuery(event.target.value)}
          placeholder="TYPE TO SEARCH"
          aria-label="Search products"
        />
      </label>

      {!normalized&&<p className="search-hint">SEARCH BY PIECE, COLOR OR CATEGORY.</p>}
      {normalized&&results.length===0&&<p className="search-empty">NO RESULTS FOR “{query}”.</p>}
      {results.length>0&&(
        <section className="search-results">
          <div className="search-results-head"><span>{results.length} RESULTS</span></div>
          <div className="product-grid">
            {results.map((product,index)=><ProductCard key={product.slug} product={product} index={index}/>)}
          </div>
        </section>
      )}
    </main>
  );
}
