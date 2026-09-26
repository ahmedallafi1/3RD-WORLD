import Link from "next/link";
import "./admin.css";
import { requireAdminPreview } from "@/lib/commerce/admin";

export const dynamic = "force-dynamic";

const links = [
  ["/admin", "OVERVIEW"],
  ["/admin/products", "PRODUCTS"],
  ["/admin/inventory", "INVENTORY"],
  ["/admin/orders", "ORDERS"],
  ["/admin/drops", "DROPS"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  requireAdminPreview();

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-brand">3RD WORLD / ADMIN</Link>
        <span>COMMERCE CORE</span>
        <span>PREVIEW MODE</span>
      </header>
      <div className="admin-layout">
        <nav className="admin-nav">
          {links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
          <span className="admin-nav-muted">AUTH + RBAC ARRIVE LATER IN PHASE 03.</span>
        </nav>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
