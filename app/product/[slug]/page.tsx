import type {Metadata} from "next";
import {cookies} from "next/headers";
import {notFound} from "next/navigation";
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
  return fallbackProducts.map(product=>({slug:displayProduct.slug}));
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
  return {title:displayProduct.name,description:displayProduct.description};
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

  return (
    <main className="product-page">
      <section className="product-gallery">
        {["FRONT","BACK","DETAIL","ON BODY"].map((label,index)=>(
          <div className={"product-gallery-frame tone-"+displayProduct.tone} key={label}>
            <span>{label}</span>
            <strong>{String(index+1).padStart(2,"0")}</strong>
            <i className="product-silhouette large" aria-hidden="true"/>
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

        <AddToBag product={product}/>

        {displayProduct.status==="SOLD OUT"&&(
          <RestockForm slug={displayProduct.slug} defaultEmail={customer?.email??""}/>
        )}

        <div className="details-list">
          <details open><summary>DETAILS</summary><p>{displayProduct.description}</p></details>
          <details><summary>FIT</summary><p>{displayProduct.fit}</p></details>
          <details><summary>MATERIAL</summary><p>{displayProduct.material}</p></details>
          <details><summary>SIZE GUIDE</summary><p>Final garment measurements will be connected before launch.</p></details>
          <details><summary>DELIVERY</summary><p>Delivery options are calculated at checkout.</p></details>
          <details><summary>RETURNS</summary><p>Return policy will be configured before launch.</p></details>
        </div>
      </aside>
    </main>
  );
}
