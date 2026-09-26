import Link from "next/link";
import { getAdminOverview } from "@/lib/commerce/admin-data";
import { requireAdminUser } from "@/lib/auth/session";

export default async function AdminOverviewPage() {
  await requireAdminUser();
  const overview = await getAdminOverview();
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
        <p>LIVE COMMERCE CORE</p>
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
          <p>Create, update and archive catalog pieces without changing storefront code.</p>
          <Link className="admin-link" href="/admin/products">OPEN PRODUCTS</Link>
        </article>
        <article className="admin-card">
          <div><p>OPERATIONS</p><h2>INVENTORY LOCKS</h2></div>
          <p>Transactional reservations prevent overselling during high-demand releases.</p>
          <Link className="admin-link" href="/admin/inventory">OPEN INVENTORY</Link>
        </article>
      </section>
    </main>
  );
}
