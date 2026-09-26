import {requireAdminUser} from "@/lib/auth/session";
import {getCommerceReadiness} from "@/lib/commerce/readiness";
import {listMarkets} from "@/lib/commerce/markets";
import {AdminMarketEditor} from "@/components/admin-market-editor";

function money(amount:number|null,currency:string){
  if(amount===null)return "—";
  return new Intl.NumberFormat("en-US",{style:"currency",currency}).format(amount/100);
}

export default async function AdminCommercePage(){
  await requireAdminUser(["OWNER","ADMIN","OPERATIONS"]);
  const readiness=getCommerceReadiness();
  const markets=await listMarkets();

  return (
    <main>
      <div className="admin-page-head">
        <div><p>PHASE 04</p><h1>COMMERCE</h1></div>
        <p>PAYMENTS / SHIPPING / TAX / MARKETS</p>
      </div>

      <section className="admin-metrics commerce-readiness">
        {readiness.map(item=>(
          <article className="admin-metric" key={item.key}>
            <span>{item.key}</span>
            <strong className={item.ready?"ready":"not-ready"}>{item.ready?"READY":"SETUP"}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <div className="admin-section-head"><h2>MARKETS</h2><span>{markets.length} ACTIVE</span></div>
      <table className="admin-table">
        <thead><tr><th>MARKET</th><th>CURRENCY</th><th>COUNTRIES</th><th>FREE SHIPPING</th><th>STANDARD SHIPPING</th><th>DUTIES</th><th>ACTION</th></tr></thead>
        <tbody>{markets.map(market=>(
          <tr key={market.code}>
            <td><strong>{market.code}</strong><br/><small>{market.name}</small></td>
            <td>{market.currency}</td>
            <td>{market.countries.join(" / ")}</td>
            <td>{money(market.freeShippingThresholdAmount,market.currency)}</td>
            <td>{money(market.standardShippingAmount,market.currency)}</td>
            <td>{market.dutiesMode}</td>
            <td><AdminMarketEditor market={market}/></td>
          </tr>
        ))}</tbody>
      </table>
    </main>
  );
}
