import {requireAdminUser} from "@/lib/auth/session";
import {listAdminAudit,listSecurityEvents} from "@/lib/ops/audit";

export const dynamic="force-dynamic";

export default async function AdminAuditPage(){
  await requireAdminUser(["OWNER","ADMIN"]);
  const [audit,security]=await Promise.all([
    listAdminAudit(),
    listSecurityEvents(),
  ]);

  return (
    <main>
      <div className="admin-page-head">
        <div><p>TRACE / SECURITY</p><h1>AUDIT</h1></div>
        <p>{audit.length} ADMIN / {security.length} SECURITY EVENTS</p>
      </div>

      <div className="admin-section-head"><h2>ADMIN ACTIONS</h2><span>LATEST {audit.length}</span></div>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead><tr><th>TIME</th><th>ACTION</th><th>RESOURCE</th><th>ACTOR</th></tr></thead>
          <tbody>{audit.map(item=>(
            <tr key={item.id}>
              <td>{new Date(item.createdAt).toLocaleString("en-US")}</td>
              <td><strong>{item.action}</strong></td>
              <td>{item.resourceType}{item.resourceId?" / "+item.resourceId.slice(0,12):""}</td>
              <td>{item.actorId.slice(0,18)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="admin-section-head"><h2>SECURITY EVENTS</h2><span>LATEST {security.length}</span></div>
      <div className="admin-table-scroll">
        <table className="admin-table">
          <thead><tr><th>TIME</th><th>EVENT</th><th>ROUTE</th><th>DETAIL</th></tr></thead>
          <tbody>{security.map(item=>(
            <tr key={item.id}>
              <td>{new Date(item.createdAt).toLocaleString("en-US")}</td>
              <td><span className="admin-pill">{item.eventType}</span></td>
              <td>{item.route??"—"}</td>
              <td><code className="admin-audit-json">{JSON.stringify(item.payload)}</code></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </main>
  );
}
