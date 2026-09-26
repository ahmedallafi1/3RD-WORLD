import Link from "next/link";
import {ProductCard} from "@/components/storefront";
import {products} from "@/lib/catalog";
export default async function WorldDetailPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <main><section className="world-detail-hero"><span>ARCHIVE / 2026</span><h1>WORLD {slug.toUpperCase()}</h1><p>NO BORDERS.</p></section><section className="section-shell"><div className="product-grid">{products.map((product,index)=><ProductCard product={product} index={index} key={product.slug}/>)}</div><div className="world-exit"><Link href="/archive" className="underlined-link">BACK TO ARCHIVE</Link></div></section></main>}
