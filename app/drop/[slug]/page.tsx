import {cookies} from "next/headers";
import Link from "next/link";
import {notFound} from "next/navigation";
import {getCustomerUser} from "@/lib/auth/session";
import {DropCountdown} from "@/components/drop-countdown";
import {DropAccessPanel} from "@/components/drop-access-panel";
import {GlobeMark,ProductCard} from "@/components/storefront";
import {
  evaluateDropAccess,
} from "@/lib/world-engine/access";
import {
  getDropBySlug,
  getDropProducts,
} from "@/lib/world-engine/repository";
import {dropAccessCookieName} from "@/lib/world-engine/security";

export const dynamic="force-dynamic";

export default async function DropDetailPage({
  params,
}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const drop=await getDropBySlug(slug);
  if(!drop)notFound();

  const [customer,cookieStore]=await Promise.all([
    getCustomerUser(),
    cookies(),
  ]);
  const sessionToken=cookieStore.get(dropAccessCookieName(slug))?.value;
  const access=await evaluateDropAccess({
    drop,
    customerId:customer?.id,
    email:customer?.email,
    sessionToken,
  });

  if(access.phase==="CLOSED"){
    return (
      <main className="drop-screen drop-gate-screen">
        <GlobeMark size={92}/>
        <span>{drop.worldCode} / {drop.name}</span>
        <h1>WORLD CLOSED.</h1>
        <p>THIS RELEASE HAS MOVED TO THE ARCHIVE.</p>
        <Link href={"/world/"+drop.worldSlug} className="underlined-link">VIEW WORLD</Link>
      </main>
    );
  }

  if(!access.granted){
    return (
      <main className="drop-screen drop-gate-screen">
        <GlobeMark size={92}/>
        <span>{drop.worldCode} / {drop.name}</span>
        <h1>{drop.headline??drop.worldCode}</h1>
        <p>{drop.subheadline??"PRIVATE TRANSMISSION"}</p>
        <DropCountdown targetAt={
          access.phase==="UPCOMING"
            ? drop.earlyAccessAt??drop.opensAt
            : access.phase==="EARLY"
              ? drop.opensAt
              : null
        }/>
        <DropAccessPanel
          slug={drop.slug}
          mode={drop.accessMode}
          waitlistEnabled={drop.waitlistEnabled}
          phase={access.phase}
        />
        {access.phase==="EARLY"&&<p className="drop-private-note">EARLY ACCESS IS OPEN TO ELIGIBLE PASSPORTS.</p>}
      </main>
    );
  }

  const products=await getDropProducts(drop.id);

  return (
    <main>
      <section className="drop-live-hero">
        <div>
          <span>{drop.worldCode} / {drop.name}</span>
          <h1>{drop.headline??drop.worldCode}</h1>
          <p>{drop.subheadline??"WORLD OPEN."}</p>
        </div>
        <div className="drop-access-badge">
          <span>ACCESS</span>
          <strong>{access.level??"PUBLIC"}</strong>
        </div>
      </section>

      <section className="section-shell">
        <div className="section-heading">
          <div><span className="section-kicker">DROP LIVE</span><h2>{drop.name}</h2></div>
          <span>{drop.perVariantLimit} MAX / VARIANT</span>
        </div>
        {products.length?(
          <div className="product-grid">
            {products.map((product,index)=>(
              <ProductCard product={product} index={index} key={product.slug}/>
            ))}
          </div>
        ):(
          <div className="drop-empty">
            <p>PIECES ARE BEING LOADED INTO THIS WORLD.</p>
            <Link href={"/world/"+drop.worldSlug} className="underlined-link">VIEW WORLD</Link>
          </div>
        )}
      </section>
    </main>
  );
}
