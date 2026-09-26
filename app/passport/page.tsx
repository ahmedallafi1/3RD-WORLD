import { SiteFooter } from "@/components/site-footer";

export default function PassportPage() {
  return (
    <main className="page-shell">
      <section className="passport-hero">
        <p>3RD WORLD</p>
        <h1>PASSPORT</h1>
        <p className="muted">YOUR ORDERS, ACCESS AND SAVED WORLDS IN ONE PLACE.</p>
      </section>

      <section className="passport-card">
        <div className="passport-card__top">
          <span>3RD WORLD PASSPORT</span>
          <span>NO. 000001</span>
        </div>
        <div className="passport-mark">◎</div>
        <div className="passport-card__bottom">
          <span>STATUS</span>
          <strong>FOUNDING ACCESS</strong>
        </div>
      </section>

      <section className="account-grid">
        <article><span>ORDERS</span><strong>00</strong></article>
        <article><span>SAVED PIECES</span><strong>00</strong></article>
        <article><span>WORLDS ENTERED</span><strong>01</strong></article>
        <article><span>CREDIT</span><strong>$0</strong></article>
      </section>

      <SiteFooter />
    </main>
  );
}
