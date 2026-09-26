import {requireAdminUser} from "@/lib/auth/session";
import {getSystemReadiness} from "@/lib/ops/readiness";

export const dynamic="force-dynamic";

export default async function AdminSystemPage(){
  await requireAdminUser(["OWNER","ADMIN","OPERATIONS"]);
  const readiness=await getSystemReadiness();

  return (
    <main>
      <div className="admin-page-head">
        <div><p>PHASE 06 / OPERATIONS</p><h1>SYSTEM</h1></div>
        <span className={"admin-pill "+(readiness.ready?"live":"")}>
          {readiness.ready?"LAUNCH READY":"SETUP REQUIRED"}
        </span>
      </div>

      <section className="admin-metrics commerce-readiness">
        {readiness.items.map(item=>(
          <article className="admin-metric" key={item.key}>
            <span>{item.key}{item.required?" / REQUIRED":""}</span>
            <strong className={item.ready?"ready":"not-ready"}>
              {item.ready?"READY":"SETUP"}
            </strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <div className="admin-card-grid">
        <article className="admin-card">
          <div><p>HEALTH</p><h2>/api/system/health</h2></div>
          <p>Public liveness endpoint for uptime monitoring. It reveals no credentials.</p>
        </article>
        <article className="admin-card">
          <div><p>WORLD ENGINE</p><h2>AUTOMATED</h2></div>
          <p>Release lifecycle, notifications and archive transitions run through the protected scheduler.</p>
        </article>
      </div>
    </main>
  );
}
