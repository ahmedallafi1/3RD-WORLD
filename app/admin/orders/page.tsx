import { requireAdminUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db";
import { listOrders } from "@/lib/commerce/repositories/orders-db";

export default async function AdminOrdersPage() {
  await requireAdminUser(["OWNER","ADMIN","OPERATIONS","SUPPORT"]);
  const orders=isDatabaseConfigured()?await listOrders():[];

  return (
    <main>
      <div className="admin-page-head">
        <div><p>OPERATIONS</p><h1>ORDERS</h1></div>
        <p>{orders.length} RECENT ORDERS</p>
      </div>
      {orders.length===0?(
        <section className="admin-card-grid">
          <article className="admin-card">
            <div><p>ORDER ENGINE</p><h2>READY FOR CHECKOUT</h2></div>
            <p>Persistent orders are enabled. Live payment confirmation arrives in Phase 04.</p>
          </article>
          <article className="admin-card">
            <div><p>AUDIT</p><h2>EVERY CHANGE TRACEABLE</h2></div>
            <p>Status events and inventory consumption are recorded transactionally.</p>
          </article>
        </section>
      ):(
        <table className="admin-table">
          <thead><tr><th>ORDER</th><th>EMAIL</th><th>STATUS</th><th>TOTAL</th><th>CREATED</th></tr></thead>
          <tbody>{orders.map(order=>(
            <tr key={order.id}>
              <td><strong>{order.number}</strong></td>
              <td>{order.email}</td>
              <td><span className="admin-pill">{order.status}</span></td>
              <td>{new Intl.NumberFormat("en-US",{style:"currency",currency:order.currency}).format(order.grandTotalAmount/100)}</td>
              <td>{new Date(order.createdAt).toLocaleString("en-US")}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </main>
  );
}
