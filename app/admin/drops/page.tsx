import { requireAdminUser } from "@/lib/auth/session";
import { listDrops } from "@/lib/commerce/admin-data";
import {isDatabaseConfigured} from "@/lib/db";
import {listAdminWorldOptions} from "@/lib/world-engine/admin";
import {AdminDropCreateForm} from "@/components/admin-drop-create-form";
import {AdminDropCodeForm} from "@/components/admin-drop-code-form";

export default async function AdminDropsPage() {
  await requireAdminUser(["OWNER","ADMIN","CONTENT"]);
  const connected=isDatabaseConfigured();
  const [drops,worlds]=await Promise.all([
    listDrops(),
    connected?listAdminWorldOptions():Promise.resolve([]),
  ]);

  return (
    <main>
      <div className="admin-page-head">
        <div><p>WORLD ENGINE</p><h1>DROPS</h1></div>
        <span className="admin-pill live">{drops.length} TOTAL</span>
      </div>

      {connected&&worlds.length>0&&<AdminDropCreateForm worlds={worlds}/>}

      <table className="admin-table">
        <thead><tr><th>WORLD</th><th>DROP</th><th>ACCESS</th><th>STATUS</th><th>OPENS</th><th>CONTROL</th></tr></thead>
        <tbody>
          {drops.map(drop=>(
            <tr key={drop.id}>
              <td><strong>{drop.world}</strong></td>
              <td>{drop.name}</td>
              <td>{drop.access}</td>
              <td><span className="admin-pill">{drop.status}</span></td>
              <td>{drop.opensAt?new Date(drop.opensAt).toLocaleString("en-US"):"—"}</td>
              <td>{connected?<AdminDropCodeForm dropId={drop.id}/>:"PREVIEW"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
