import Link from "next/link";
import "./admin.css";
import { getAdminUser } from "@/lib/auth/session";
import { AdminLogoutButton } from "@/components/admin-logout-button";

export const dynamic = "force-dynamic";

const links = [
  ["/admin", "OVERVIEW"],
  ["/admin/products", "PRODUCTS"],
  ["/admin/inventory", "INVENTORY"],
  ["/admin/orders", "ORDERS"],
  ["/admin/drops", "DROPS"],
  ["/admin/commerce", "COMMERCE"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user=await getAdminUser();

  if(!user){
    return <div className="admin-shell admin-login-shell">{children}</div>;
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Link href="/admin" className="admin-brand">3RD WORLD / ADMIN</Link>
        <span>{user.role}</span>
        <div className="admin-user"><span>{user.name}</span><AdminLogoutButton/></div>
      </header>
      <div className="admin-layout">
        <nav className="admin-nav">
          {links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
          <span className="admin-nav-muted">SIGNED IN / {user.email}</span>
        </nav>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
