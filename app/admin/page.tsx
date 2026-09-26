import Link from "next/link";
import { getAdminOverview } from "@/lib/commerce/admin-data";

export default function AdminOverviewPage() {
  const overview = getAdminOverview();
  const metrics = [
    ["PRODUCTS", overview.products],
    ["ACTIVE VARIANTS", overview.activeVariants],
    ["UNITS ON HAND", overview.unitsOnHand],
    ["RESERVED", overview.unitsReserved],
    ["OPEN ORDERS", overview.openOrders],
    ["SCHEDULED DROPS", overview.scheduledDrops],
  ] as const;

  return (
    <main>
      <div className="admin-page-head">
        <div><p>PHASE 03</p><h1>OVERVIEW</h1></div>
        <p>COMMERCE CORE / PREVIEW DATA</p>
      </div>
      <section className="admin-metrics">
        {metrics.map(([label, value]) => (
          <article className="admin-metric" key={label}>
            <span>{label}</span><strong>{value}</strong>
          </article>
        ))}
      </section>
      <section className="admin-card-grid">
        <article className="admin-card">
          <div><p>CATALOG</p><h2>PRODUCTS + VARIANTS</h2></div>
          <p>Canonical SKUs, sizes, colorways and market-ready product data.</p>
          <Link className="admin-link" href="/admin/products">OPEN PRODUCTS</Link>
        </article>
        <article className="admin-card">
          <div><p>OPERATIONS</p><h2>INVENTORY LOCKS</h2></div>
          <p>Reservation-first inventory architecture built for high-demand drops.</p>
          <Link className="admin-link" href="/admin/inventory">OPEN INVENTORY</Link>
        </article>
      </section>
    </main>
  );
}
