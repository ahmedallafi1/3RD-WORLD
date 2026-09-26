import { products } from "@/lib/catalog";

export default function AdminProductsPage() {
  return (
    <main>
      <div className="admin-page-head">
        <div><p>CATALOG</p><h1>PRODUCTS</h1></div>
        <p>{products.length} PRODUCTS</p>
      </div>
      <table className="admin-table">
        <thead><tr><th>PRODUCT</th><th>WORLD</th><th>CATEGORY</th><th>COLOR</th><th>PRICE</th><th>SIZES</th></tr></thead>
        <tbody>
          {products.map(product => (
            <tr key={product.slug}>
              <td><strong>{product.name}</strong><br/><small>{product.slug}</small></td>
              <td>{product.world}</td>
              <td>{product.category}</td>
              <td>{product.color}</td>
              <td>{"$"}{product.price}</td>
              <td>{product.sizes.join(" / ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
