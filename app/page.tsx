import Link from "next/link";
import {Footer,GlobeMark,ProductCard} from "@/components/storefront";
import {products} from "@/lib/catalog";

export default function HomePage(){
 return <main>
  <section className="hero"><div className="hero-center"><GlobeMark size={108}/><p>WORLD 001</p><h1>3RD WORLD</h1><Link href="/shop" className="underlined-link">SHOP THE WORLD</Link></div><div className="hero-corners"><span>NEW YORK / 2026</span><span>GLOBAL STREETWEAR</span></div></section>
  <section className="section-shell"><div className="section-heading"><h2>WORLD 001</h2><Link href="/shop">VIEW ALL</Link></div><div className="product-grid">{products.map((product,index)=><ProductCard product={product} index={index} key={product.slug}/>)}</div></section>
  <section className="campaign-panel"><div><span>TRANSMISSION 001</span><h2>NO BORDERS.<br/>ONE WORLD.</h2></div><Link href="/world/001" className="underlined-link">VIEW WORLD</Link></section>
  <section className="access-panel"><GlobeMark size={62}/><h2>ENTER THE WORLD</h2><p>DROP ACCESS. RESTOCKS. TRANSMISSIONS.</p><form className="access-form"><input type="email" placeholder="EMAIL ADDRESS" aria-label="Email address"/><button type="submit">JOIN</button></form></section>
  <Footer/>
 </main>;
}
