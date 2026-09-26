import {requireAdminUser} from "@/lib/auth/session";
import {AdminSecurityPanel} from "@/components/admin-security-panel";

export default async function AdminSecurityPage(){
  const user=await requireAdminUser();

  return (
    <main>
      <div className="admin-page-head">
        <div><p>ACCOUNT PROTECTION</p><h1>SECURITY</h1></div>
        <span className={"admin-pill "+(user.mfaEnabled?"live":"")}>
          {user.mfaEnabled?"2FA ACTIVE":"2FA NOT SET"}
        </span>
      </div>

      <AdminSecurityPanel enabled={user.mfaEnabled}/>

      <section className="admin-security-notes">
        <article><span>SESSION</span><strong>12 HOURS</strong><p>Admin sessions expire automatically and use HTTP-only secure cookies in production.</p></article>
        <article><span>ACCESS</span><strong>{user.role}</strong><p>Permissions remain role-scoped across commerce, content and operations.</p></article>
      </section>
    </main>
  );
}
