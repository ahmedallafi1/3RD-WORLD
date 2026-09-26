export default function AdminOrdersPage() {
  return (
    <main>
      <div className="admin-page-head">
        <div><p>OPERATIONS</p><h1>ORDERS</h1></div>
        <p>DATABASE CONNECTION NEXT</p>
      </div>
      <section className="admin-card-grid">
        <article className="admin-card">
          <div><p>ORDER ENGINE</p><h2>STATE MACHINE READY</h2></div>
          <p>DRAFT → PAYMENT → PAID → ALLOCATED → FULFILLING → FULFILLED, with cancellation and refund branches.</p>
        </article>
        <article className="admin-card">
          <div><p>AUDIT</p><h2>EVERY CHANGE TRACEABLE</h2></div>
          <p>Order events and admin audit records are part of the Phase 03 database schema.</p>
        </article>
      </section>
    </main>
  );
}
