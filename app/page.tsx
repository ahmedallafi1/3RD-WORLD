import Link from "next/link";
import {AccessForm} from "@/components/access-form";
import {Footer,GlobeMark,ProductCard} from "@/components/storefront";
import {getStorefrontProducts} from "@/lib/commerce/storefront-catalog";
import {getPrimaryDrop,listArchiveWorlds} from "@/lib/world-engine/repository";

export const dynamic="force-dynamic";

export default async function HomePage(){
  const [products,drop,archive]=await Promise.all([
    getStorefrontProducts(),
    getPrimaryDrop(),
    listArchiveWorlds(),
  ]);
  const featured=products.filter(product=>product.status!=="COMING SOON").slice(0,4);
  const latest=archive[0];
  const heroWorld=drop?.worldCode??latest?.code??"3RD WORLD";
  const heroHref=drop?"/drop/"+drop.slug:"/shop";
  const heroCta=drop?"ENTER THE WORLD":"SHOP THE WORLD";

  return (
    <main>
      <section className="hero">
        <div className="hero-noise" aria-hidden="true"/>
        <div className="hero-center">
          <GlobeMark size={108}/>
          <p>{heroWorld}</p>
          <h1>3RD WORLD</h1>
          <Link href={heroHref} className="underlined-link">{heroCta}</Link>
        </div>
        <div className="hero-corners">
          <span>WORLDWIDE / 2026</span>
          <span>STAY HUNGRY. NEVER THIRSTY.</span>
        </div>
      </section>

      {featured.length>0&&(
        <section className="section-shell">
          <div className="section-heading">
            <div><span className="section-kicker">AVAILABLE NOW</span><h2>{latest?.code??"3RD WORLD"}</h2></div>
            <Link href="/shop">VIEW ALL</Link>
          </div>
          <div className="product-grid">
            {featured.map((product,index)=><ProductCard product={product} index={index} key={product.slug}/>)}
          </div>
        </section>
      )}

      {latest&&(
        <section className="campaign-panel">
          <div>
            <span>{latest.code} / ARCHIVE</span>
            <h2>{latest.title}<br/>{latest.tagline??""}</h2>
          </div>
          <Link href={"/world/"+latest.slug} className="underlined-link">VIEW WORLD</Link>
        </section>
      )}

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
