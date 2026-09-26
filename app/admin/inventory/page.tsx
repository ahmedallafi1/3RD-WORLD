import { requireAdminUser } from "@/lib/auth/session";
import { listInventoryRows } from "@/lib/commerce/admin-data";
import { AdminInventoryAdjustForm } from "@/components/admin-inventory-adjust-form";

export default async function AdminInventoryPage() {
  await requireAdminUser(["OWNER","ADMIN","OPERATIONS"]);
  const rows=await listInventoryRows();

  return (
    <main>
      <div className="admin-page-head">
        <div><p>OPERATIONS</p><h1>INVENTORY</h1></div>
        <p>{rows.length} INVENTORY POSITIONS</p>
      </div>
      <table className="admin-table">
        <thead><tr><th>SKU</th><th>LOCATION</th><th>ON HAND</th><th>RESERVED</th><th>AVAILABLE</th><th>ACTION</th></tr></thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.sku+"-"+row.location}>
              <td><strong>{row.sku}</strong></td>
              <td>{row.location}</td>
              <td>{row.onHand}</td>
              <td>{row.reserved}</td>
              <td>{row.available}</td>
              <td><AdminInventoryAdjustForm variantId={row.variantId} locationId={row.locationId} sku={row.sku}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
