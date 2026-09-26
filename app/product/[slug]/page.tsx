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

  if(process.env.DATABASE_URL){
    const accessTokens=Object.fromEntries(cookieStore.getAll().map(item=>[item.name,item.value]));
    const access=await evaluateProductAccess({
      slug,
      customerId:customer?.id,
      email:customer?.email,
      accessTokens,
    });
    if(!access.granted)notFound();
  }

  const saved=customer&&process.env.DATABASE_URL
    ? await isProductSaved(customer.id,slug)
    : false;

  return (
    <main className="product-page">
      <section className="product-gallery">
        {["FRONT","BACK","DETAIL","ON BODY"].map((label,index)=>(
          <div className={"product-gallery-frame tone-"+product.tone} key={label}>
            <span>{label}</span>
            <strong>{String(index+1).padStart(2,"0")}</strong>
            <i className="product-silhouette large" aria-hidden="true"/>
          </div>
        ))}
      </section>

      <aside className="product-panel">
        <div>
          <span className="eyebrow">{product.world}</span>
          <h1>{product.name}</h1>
          <p className="product-price">{formatMoney(product.price)}</p>
          <p className="product-color">{product.color}</p>
          {product.status&&<p className="pdp-status">{product.status}</p>}
        </div>

        <SavePieceButton
          slug={product.slug}
          signedIn={Boolean(customer)}
          initialSaved={Boolean(saved)}
        />

        <AddToBag product={product}/>

        {product.status==="SOLD OUT"&&(
          <RestockForm slug={product.slug} defaultEmail={customer?.email??""}/>
        )}

        <div className="details-list">
          <details open><summary>DETAILS</summary><p>{product.description}</p></details>
          <details><summary>FIT</summary><p>{product.fit}</p></details>
          <details><summary>MATERIAL</summary><p>{product.material}</p></details>
          <details><summary>SIZE GUIDE</summary><p>Final garment measurements will be connected before launch.</p></details>
          <details><summary>DELIVERY</summary><p>Delivery options are calculated at checkout.</p></details>
          <details><summary>RETURNS</summary><p>Return policy will be configured before launch.</p></details>
        </div>
      </aside>
    </main>
  );
}
