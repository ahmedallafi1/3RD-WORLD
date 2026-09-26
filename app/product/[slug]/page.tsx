import type {Metadata} from "next";
import {cookies} from "next/headers";
import {notFound} from "next/navigation";
import Link from "next/link";
import {AddToBag} from "@/components/storefront";
import {SavePieceButton} from "@/components/save-piece-button";
import {RestockForm} from "@/components/restock-form";
import {formatMoney,products as fallbackProducts} from "@/lib/catalog";
import {getStorefrontProductRaw} from "@/lib/commerce/storefront-catalog";
import {getCustomerUser} from "@/lib/auth/session";
import {evaluateProductAccess,isProductPubliclyVisible} from "@/lib/world-engine/product-access";
import {isProductSaved} from "@/lib/world-engine/saved";

export const dynamic="force-dynamic";

export function generateStaticParams(){
  return fallbackProducts.map(product=>({slug:product.slug}));
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const visible=process.env.DATABASE_URL?await isProductPubliclyVisible(slug):true;
  if(!visible){
    return {
      title:"Private World",
      robots:{index:false,follow:false},
    };
  }

  const product=await getStorefrontProductRaw(slug);
  if(!product)return {};
  return {title:product.name,description:product.description};
}

export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const [product,customer,cookieStore]=await Promise.all([
    getStorefrontProductRaw(slug),
    getCustomerUser(),
    cookies(),
  ]);
  if(!product)notFound();

  let releaseClosed=false;
  if(process.env.DATABASE_URL){
    const accessTokens=Object.fromEntries(cookieStore.getAll().map(item=>[item.name,item.value]));
    const access=await evaluateProductAccess({
      slug,
      customerId:customer?.id,
      email:customer?.email,
      accessTokens,
    });
    releaseClosed=access.decision?.phase==="CLOSED";
    if(!access.granted&&!releaseClosed)notFound();
  }

  const displayProduct=releaseClosed?{...product,status:"SOLD OUT" as const}:product;
  const saved=customer&&process.env.DATABASE_URL
    ? await isProductSaved(customer.id,slug)
    : false;
  const media=displayProduct.media??[];
  const siteUrl=(process.env.PUBLIC_SITE_URL??"https://3rdworld.com").replace(/\/$/,"");
  const cover=media.find(item=>item.kind==="IMAGE"&&item.role==="COVER")
    ??media.find(item=>item.kind==="IMAGE");
  const productSchema={
    "@context":"https://schema.org",
    "@type":"Product",
    name:displayProduct.name,
    description:displayProduct.description,
    sku:displayProduct.slug,
    brand:{"@type":"Brand",name:"3RD WORLD"},
    ...(cover?{image:[cover.src]}:{}),
    offers:{
      "@type":"Offer",
      url:siteUrl+"/product/"+encodeURIComponent(displayProduct.slug),
      priceCurrency:"USD",
      price:displayProduct.price.toFixed(2),
      availability:displayProduct.status==="SOLD OUT"
        ?"https://schema.org/OutOfStock"
        :"https://schema.org/InStock",
    },
  };
  const productSchemaJson=JSON.stringify(productSchema).replace(/</g,"\\u003c");

  return (
    <main className="product-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:productSchemaJson}}/>
      <section className="product-gallery" aria-label={displayProduct.name+" product media"}>
        {media.length?media.map((item,index)=>(
          <figure className={"product-gallery-frame product-media-frame tone-"+displayProduct.tone} key={item.src+"-"+index}>
            {item.kind==="VIDEO"?(
              <video
                src={item.src}
                muted
                loop
                playsInline
                autoPlay
                aria-label={item.alt||displayProduct.name+" video"}
              />
            ):(
              <img
                src={item.src}
                alt={item.alt||displayProduct.name+" product view "+(index+1)}
                loading={index<2?"eager":"lazy"}
                decoding="async"
              />
            )}
            <figcaption><span>{item.role}</span><strong>{String(index+1).padStart(2,"0")}</strong></figcaption>
          </figure>
        )):["FRONT","BACK","DETAIL","ON BODY"].map((label,index)=>(
          <div className={"product-gallery-frame product-gallery-fallback tone-"+displayProduct.tone} key={label}>
            <span>{label}</span>
            <strong>{String(index+1).padStart(2,"0")}</strong>
            <div className="product-fallback-globe"><span aria-hidden="true">3RD WORLD</span></div>
          </div>
        ))}
      </section>

      <aside className="product-panel">
        <div>
          <span className="eyebrow">{displayProduct.world}</span>
          <h1>{displayProduct.name}</h1>
          <p className="product-price">{formatMoney(displayProduct.price)}</p>
          <p className="product-color">{displayProduct.color}</p>
          {displayProduct.status&&<p className="pdp-status">{displayProduct.status}</p>}
        </div>

        <SavePieceButton
          slug={displayProduct.slug}
          signedIn={Boolean(customer)}
          initialSaved={Boolean(saved)}
        />

        <AddToBag product={displayProduct}/>

        {displayProduct.status==="SOLD OUT"&&!releaseClosed&&(
          <RestockForm slug={displayProduct.slug} defaultEmail={customer?.email??""}/>
        )}

        <div className="details-list">
          <details open><summary>DETAILS</summary><p>{displayProduct.description}</p></details>
          <details><summary>FIT</summary><p>{displayProduct.fit}</p></details>
          <details><summary>MATERIAL</summary><p>{displayProduct.material}</p></details>
          <details><summary>SIZE GUIDE</summary><p><Link className="underlined-link" href="/size-guide">VIEW SIZE GUIDE</Link></p></details>
          <details><summary>DELIVERY</summary><p>Delivery options are calculated at checkout. <Link className="underlined-link" href="/shipping">SHIPPING DETAILS</Link></p></details>
          <details><summary>RETURNS</summary><p><Link className="underlined-link" href="/returns">VIEW RETURN POLICY</Link></p></details>
        </div>
      </aside>
    </main>
  );
}
