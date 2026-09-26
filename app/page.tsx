import Link from "next/link";
import {AccessForm} from "@/components/access-form";
import {Footer,GlobeMark,ProductCard} from "@/components/storefront";
import {getStorefrontProducts} from "@/lib/commerce/storefront-catalog";

export default async function HomePage(){
  const products=await getStorefrontProducts();
  const featured=products.filter(product=>product.status!=="COMING SOON").slice(0,4);

  return (
    <main>
      <section className="hero">
        <div className="hero-noise" aria-hidden="true"/>
        <div className="hero-center">
          <GlobeMark size={108}/>
          <p>WORLD 001</p>
          <h1>3RD WORLD</h1>
          <Link href="/shop" className="underlined-link">SHOP THE WORLD</Link>
        </div>
        <div className="hero-corners">
          <span>WORLDWIDE / 2026</span>
          <span>STAY HUNGRY. NEVER THIRSTY.</span>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-heading">
          <div><span className="section-kicker">CURRENT WORLD</span><h2>WORLD 001</h2></div>
          <Link href="/shop">VIEW ALL</Link>
        </div>
        <div className="product-grid">
          {featured.map((product,index)=><ProductCard product={product} index={index} key={product.slug}/>)}
        </div>
      </section>

      <section className="campaign-panel">
        <div>
          <span>TRANSMISSION 001</span>
          <h2>NO BORDERS.<br/>ONE WORLD.</h2>
        </div>
        <Link href="/world/001" className="underlined-link">VIEW WORLD</Link>
      </section>

      <section className="access-panel">
        <GlobeMark size={62}/>
        <h2>ENTER THE WORLD</h2>
        <p>DROP ACCESS. RESTOCKS. TRANSMISSIONS.</p>
        <AccessForm compact/>
      </section>

      <Footer/>
    </main>
  );
}
