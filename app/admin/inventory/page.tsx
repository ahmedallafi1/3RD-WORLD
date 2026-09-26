import { previewInventory } from "@/lib/commerce/admin-data";
import { availableToSell } from "@/lib/commerce/inventory";

export default function AdminInventoryPage() {
  return (
    <main>
      <div className="admin-page-head">
        <div><p>OPERATIONS</p><h1>INVENTORY</h1></div>
        <p>NYC MAIN / PREVIEW</p>
      </div>
      <table className="admin-table">
        <thead><tr><th>VARIANT</th><th>LOCATION</th><th>ON HAND</th><th>RESERVED</th><th>AVAILABLE</th></tr></thead>
        <tbody>
          {previewInventory.map(row => (
            <tr key={row.variantId}>
              <td><strong>{row.variantId.toUpperCase()}</strong></td>
              <td>{row.locationId.toUpperCase()}</td>
              <td>{row.onHand}</td>
              <td>{row.reserved}</td>
              <td>{availableToSell(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
