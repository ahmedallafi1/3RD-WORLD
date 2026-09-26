import { requireAdminUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db";
import { listAdminProducts } from "@/lib/commerce/repositories/products";
import { products as previewProducts } from "@/lib/catalog";
import { AdminProductCreateForm } from "@/components/admin-product-create-form";

export default async function AdminProductsPage() {
  await requireAdminUser(["OWNER","ADMIN","CONTENT"]);
  const connected=isDatabaseConfigured();
  const products=connected?await listAdminProducts():previewProducts.map(product=>({
    id:product.slug,
    slug:product.slug,
    name:product.name,
    category:product.category,
    description:product.description,
    status:"ACTIVE" as const,
    worldCode:product.world,
    variants:product.sizes.map(size=>({
      id:product.slug+"-"+size,
      sku:(product.slug+"-"+size).toUpperCase(),
      title:size,
      size,
      color:product.color,
      priceAmount:product.price*100,
      currency:"USD" as const,
      active:true,
    })),
  }));

  return (
    <main>
      <div className="admin-page-head">
        <div><p>CATALOG</p><h1>PRODUCTS</h1></div>
        <p>{products.length} PRODUCTS / {connected?"DATABASE":"PREVIEW"}</p>
      </div>
      {connected&&<AdminProductCreateForm/>}
      <table className="admin-table">
        <thead><tr><th>PRODUCT</th><th>WORLD</th><th>CATEGORY</th><th>STATUS</th><th>VARIANTS</th><th>FROM</th></tr></thead>
        <tbody>
          {products.map(product => {
            const first=product.variants[0];
            return <tr key={product.id}>
              <td><strong>{product.name}</strong><br/><small>{product.slug}</small></td>
              <td>{product.worldCode??"—"}</td>
              <td>{product.category}</td>
              <td><span className="admin-pill">{product.status}</span></td>
              <td>{product.variants.map(v=>v.size).join(" / ")}</td>
              <td>{first?new Intl.NumberFormat("en-US",{style:"currency",currency:first.currency}).format(first.priceAmount/100):"—"}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </main>
  );
}
