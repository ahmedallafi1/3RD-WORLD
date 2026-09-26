"use client";

import {useMemo,useState} from "react";
import {ProductCard} from "@/components/storefront";
import {categories,products as fallbackProducts,type Category,type Product} from "@/lib/catalog";

export function ShopExperience({items=fallbackProducts}:{items?:Product[]}){
  const [category,setCategory]=useState<Category>("ALL");
  const filtered=useMemo(
    ()=>category==="ALL"?items:items.filter(product=>product.category===category),
    [category,items],
  );

  return (
    <>
      <div className="shop-head">
        <div>
          <h1>SHOP</h1>
          <span className="result-count">{filtered.length} PIECES</span>
        </div>
        <div className="shop-filters" role="group" aria-label="Filter products">
          {categories.map(item=>(
            <button
              key={item}
              className={item===category?"active":""}
              onClick={()=>setCategory(item)}
              aria-pressed={item===category}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="product-grid">
        {filtered.map((product,index)=>(
          <ProductCard product={product} index={index} key={product.slug}/>
        ))}
      </div>
    </>
  );
}
