import {requireAdminUser} from "@/lib/auth/session";
import {listContentPages} from "@/lib/content/pages";
import {AdminContentEditor} from "@/components/admin-content-editor";

export default async function AdminContentPage(){
  await requireAdminUser(["OWNER","ADMIN","CONTENT"]);
  const pages=await listContentPages();

  return (
    <main>
      <div className="admin-page-head">
        <div><p>STORE INFORMATION</p><h1>CONTENT</h1></div>
        <p>{pages.filter(page=>page.status==="PUBLISHED").length} / {pages.length} PUBLISHED</p>
      </div>

      <table className="admin-table">
        <thead><tr><th>PAGE</th><th>SLUG</th><th>STATUS</th><th>UPDATED</th><th>ACTION</th></tr></thead>
        <tbody>{pages.map(page=>(
          <tr key={page.slug}>
            <td><strong>{page.title}</strong></td>
            <td>/{page.slug}</td>
            <td><span className={"admin-pill "+(page.status==="PUBLISHED"?"live":"")}>{page.status}</span></td>
            <td>{page.updatedAt?new Date(page.updatedAt).toLocaleString("en-US"):"—"}</td>
            <td><AdminContentEditor {...page}/></td>
          </tr>
        ))}</tbody>
      </table>
    </main>
  );
}
