import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {AddToBag} from "@/components/storefront";
import {formatMoney,getProduct,products} from "@/lib/catalog";

export function generateStaticParams(){
  return products.map(product=>({slug:product.slug}));
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const product=getProduct(slug);
  if(!product)return {};
  return {
    title:product.name,
    description:product.description
  };
}

export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const product=getProduct(slug);
  if(!product)notFound();

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

        <AddToBag product={product}/>

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
