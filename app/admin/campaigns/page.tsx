import {requireAdminUser} from "@/lib/auth/session";
import {listAdminWorldOptions} from "@/lib/world-engine/admin";
import {listCampaigns} from "@/lib/world-engine/campaign-admin";
import {AdminCampaignCreateForm,AdminCampaignStatusButton} from "@/components/admin-campaign-manager";

export default async function AdminCampaignsPage(){
  await requireAdminUser(["OWNER","ADMIN","CONTENT"]);
  const [worlds,campaigns]=await Promise.all([
    listAdminWorldOptions(),
    listCampaigns(),
  ]);

  return (
    <main>
      <div className="admin-page-head">
        <div><p>WORLD / CULTURE</p><h1>CAMPAIGNS</h1></div>
        <p>{campaigns.length} RECORDS</p>
      </div>

      <AdminCampaignCreateForm worlds={worlds}/>

      <table className="admin-table">
        <thead><tr><th>WORLD</th><th>TYPE</th><th>TITLE</th><th>STATUS</th><th>POSITION</th><th>ACTION</th></tr></thead>
        <tbody>{campaigns.map(campaign=>(
          <tr key={campaign.id}>
            <td>{campaign.worldCode}</td>
            <td>{campaign.type}</td>
            <td><strong>{campaign.title}</strong><br/><small>{campaign.slug}</small></td>
            <td><span className="admin-pill">{campaign.status}</span></td>
            <td>{campaign.position}</td>
            <td><AdminCampaignStatusButton id={campaign.id} status={campaign.status}/></td>
          </tr>
        ))}</tbody>
      </table>
    </main>
  );
}
