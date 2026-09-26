import Link from "next/link";
import {notFound} from "next/navigation";
import {ProductCard} from "@/components/storefront";
import {
  getWorld,
  getWorldProducts,
  listWorldCampaigns,
} from "@/lib/world-engine/repository";

export const dynamic="force-dynamic";

export default async function WorldDetailPage({
  params,
}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const world=await getWorld(slug);
  if(!world)notFound();

  const [products,campaigns]=await Promise.all([
    getWorldProducts(world.id),
    listWorldCampaigns(world.id),
  ]);

  return (
    <main>
      <section className="world-detail-hero">
        <span>ARCHIVE / {world.year??"3RD WORLD"}</span>
        <h1>{world.code}</h1>
        <p>{world.tagline??world.title}</p>
      </section>

      {world.description&&(
        <section className="world-statement">
          <span>{world.title}</span>
          <p>{world.description}</p>
        </section>
      )}

      {campaigns.length>0&&(
        <section className="world-campaigns">
          {campaigns.map((campaign,index)=>(
            <article className="world-campaign" key={campaign.id}>
              <span>{campaign.eyebrow??campaign.type}</span>
              <strong>{String(index+1).padStart(2,"0")}</strong>
              <h2>{campaign.title}</h2>
              {campaign.body&&<p>{campaign.body}</p>}
            </article>
          ))}
        </section>
      )}

      <section className="section-shell">
        {products.length>0&&(
          <>
            <div className="section-heading">
              <div><span className="section-kicker">PIECES</span><h2>{world.code}</h2></div>
            </div>
            <div className="product-grid">
              {products.map((product,index)=>(
                <ProductCard product={product} index={index} key={product.slug}/>
              ))}
            </div>
          </>
        )}
        <div className="world-exit"><Link href="/archive" className="underlined-link">BACK TO ARCHIVE</Link></div>
      </section>
    </main>
  );
}
