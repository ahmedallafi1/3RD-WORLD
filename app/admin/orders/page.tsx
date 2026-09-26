import { requireAdminUser } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db";
import { listOrders } from "@/lib/commerce/repositories/orders-db";
import {AdminRefundButton} from "@/components/admin-refund-button";

export default async function AdminOrdersPage() {
  const user=await requireAdminUser(["OWNER","ADMIN","OPERATIONS","SUPPORT"]);
  const orders=isDatabaseConfigured()?await listOrders():[];
  const canRefund=["OWNER","ADMIN","OPERATIONS"].includes(user.role);

  return (
    <main>
      <div className="admin-page-head">
        <div><p>OPERATIONS</p><h1>ORDERS</h1></div>
        <p>{orders.length} RECENT ORDERS</p>
      </div>
      {orders.length===0?(
        <section className="admin-card-grid">
          <article className="admin-card">
            <div><p>ORDER ENGINE</p><h2>PAYMENT READY</h2></div>
            <p>Orders, payment events, allocations and refund records are connected.</p>
          </article>
          <article className="admin-card">
            <div><p>AUDIT</p><h2>EVERY CHANGE TRACEABLE</h2></div>
            <p>Status events and inventory consumption are recorded transactionally.</p>
          </article>
        </section>
      ):(
        <table className="admin-table">
          <thead><tr><th>ORDER</th><th>EMAIL</th><th>STATUS</th><th>TOTAL</th><th>CREATED</th><th>ACTION</th></tr></thead>
          <tbody>{orders.map(order=>(
            <tr key={order.id}>
              <td><strong>{order.number}</strong></td>
              <td>{order.email}</td>
              <td><span className="admin-pill">{order.status}</span></td>
              <td>{new Intl.NumberFormat("en-US",{style:"currency",currency:order.currency}).format(order.grandTotalAmount/100)}</td>
              <td>{new Date(order.createdAt).toLocaleString("en-US")}</td>
              <td>{canRefund&&!["DRAFT","PENDING_PAYMENT","CANCELLED","REFUNDED"].includes(order.status)
                ? <AdminRefundButton orderId={order.id} totalAmount={order.grandTotalAmount} currency={order.currency}/>
                : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </main>
  );
}
