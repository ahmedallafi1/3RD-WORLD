import { requireAdminUser } from "@/lib/auth/session";
import { listDrops } from "@/lib/commerce/admin-data";

export default async function AdminDropsPage() {
  await requireAdminUser(["OWNER","ADMIN","CONTENT"]);
  const drops=await listDrops();

  return (
    <main>
      <div className="admin-page-head">
        <div><p>WORLD ENGINE</p><h1>DROPS</h1></div>
        <span className="admin-pill live">{drops.length} TOTAL</span>
      </div>
      <table className="admin-table">
        <thead><tr><th>WORLD</th><th>DROP</th><th>ACCESS</th><th>STATUS</th><th>OPENS</th></tr></thead>
        <tbody>
          {drops.map(drop=>(
            <tr key={drop.id}>
              <td><strong>{drop.world}</strong></td>
              <td>{drop.name}</td>
              <td>{drop.access}</td>
              <td><span className="admin-pill">{drop.status}</span></td>
              <td>{drop.opensAt?new Date(drop.opensAt).toLocaleString("en-US"):"—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
