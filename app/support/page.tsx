import { SiteFooter } from "@/components/site-footer";

export default function SupportPage() {
  return (
    <main className="page-shell info-page">
      <h1>SUPPORT</h1>
      <div className="info-grid">
        <article><span>ORDER HELP</span><p>Order support workflows connect with the commerce core in Phase 03.</p></article>
        <article><span>PRODUCT HELP</span><p>Fit, care and product information will be managed from the private 3RD WORLD admin.</p></article>
        <article><span>CONTACT</span><p>support@3rdworld.com</p></article>
      </div>
      <SiteFooter />
    </main>
  );
}
