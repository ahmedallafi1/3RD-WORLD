import {requireAdminUser} from "@/lib/auth/session";
import {getProductionReadiness} from "@/lib/ops/readiness";

export const dynamic="force-dynamic";

export default async function AdminSystemPage(){
  await requireAdminUser(["OWNER","ADMIN"]);
  const readiness=await getProductionReadiness();

  return (
    <main>
      <div className="admin-page-head">
        <div><p>PRODUCTION CONTROL</p><h1>SYSTEM</h1></div>
        <span className={"admin-pill "+(readiness.ready?"live":"")}>
          {readiness.ready?"READY":"SETUP REQUIRED"}
        </span>
      </div>

      <section className="admin-metrics commerce-readiness">
        {readiness.items.map(item=>(
          <article className="admin-metric" key={item.key}>
            <span>{item.key}{item.required?" / REQUIRED":""}</span>
            <strong className={item.ready?"ready":"not-ready"}>{item.ready?"READY":"SETUP"}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <section className="admin-card">
        <div>
          <p>REQUIRED SYSTEMS</p>
          <h2>{readiness.requiredReady} / {readiness.requiredTotal}</h2>
        </div>
        <p>LIVE LAUNCH SHOULD ONLY HAPPEN WHEN EVERY REQUIRED SYSTEM IS READY AND THE FINAL launch checklist has been executed.</p>
      </section>
    </main>
  );
}
