import {requireAdminUser} from "@/lib/auth/session";
import {listDrops} from "@/lib/commerce/admin-data";
import {listAccessGrants,listPassportTiers} from "@/lib/world-engine/grants";
import {AdminAccessGrantForm,AdminPassportTierForm} from "@/components/admin-access-manager";

export default async function AdminAccessPage(){
  await requireAdminUser(["OWNER","ADMIN"]);
  const [drops,grants,tiers]=await Promise.all([
    listDrops(),
    listAccessGrants(),
    listPassportTiers(),
  ]);

  return (
    <main>
      <div className="admin-page-head">
        <div><p>PASSPORT / PRIVATE ACCESS</p><h1>ACCESS</h1></div>
        <p>{grants.length} RECENT GRANTS</p>
      </div>

      <div className="admin-two-col">
        <AdminAccessGrantForm drops={drops.map(drop=>({id:drop.id,world:drop.world,name:drop.name}))}/>
        <AdminPassportTierForm/>
      </div>

      <div className="admin-section-head"><h2>RECENT GRANTS</h2><span>{grants.length}</span></div>
      <table className="admin-table">
        <thead><tr><th>WORLD</th><th>DROP</th><th>EMAIL</th><th>LEVEL</th><th>START</th><th>END</th></tr></thead>
        <tbody>{grants.map(grant=>(
          <tr key={grant.id}>
            <td>{grant.worldCode}</td><td>{grant.dropName}</td><td>{grant.email??"ACCOUNT"}</td>
            <td><span className="admin-pill">{grant.grantType}</span></td>
            <td>{grant.startsAt?new Date(grant.startsAt).toLocaleString("en-US"):"NOW"}</td>
            <td>{grant.endsAt?new Date(grant.endsAt).toLocaleString("en-US"):"—"}</td>
          </tr>
        ))}</tbody>
      </table>

      <div className="admin-section-head"><h2>PASSPORT TIERS</h2><span>{tiers.length}</span></div>
      <table className="admin-table">
        <thead><tr><th>EMAIL</th><th>PASSPORT</th><th>TIER</th><th>UPDATED</th></tr></thead>
        <tbody>{tiers.map(item=>(
          <tr key={item.email}>
            <td>{item.email}</td><td>{item.passportNumber??"—"}</td>
            <td><span className="admin-pill">{item.tier}</span></td>
            <td>{new Date(item.updatedAt).toLocaleString("en-US")}</td>
          </tr>
        ))}</tbody>
      </table>
    </main>
  );
}
