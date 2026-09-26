import Link from "next/link";
import {PassportAuth,PassportLogout} from "@/components/passport-auth";
import {ProductCard} from "@/components/storefront";
import {getCustomerUser} from "@/lib/auth/session";
import {
  getCustomerDashboard,
  listCustomerWorldStamps,
} from "@/lib/commerce/repositories/customers";
import {listSavedProducts} from "@/lib/world-engine/saved";

export const metadata={title:"Passport"};
export const dynamic="force-dynamic";

export default async function PassportPage(){
  const customer=await getCustomerUser();

  if(!customer){
    return (
      <main className="passport-page">
        <div className="passport-card">
          <span>3RD WORLD</span>
          <h1>PASSPORT</h1>
          <p>PRIVATE ACCESS</p>
          <div className="passport-stamp">ENTER</div>
        </div>
        <section className="passport-content">
          <h2>YOUR WORLD</h2>
          <p className="muted">SIGN IN OR CREATE A PASSPORT FOR ORDERS, DROP ACCESS, WORLD STAMPS AND STORE CREDIT.</p>
          <PassportAuth/>
        </section>
      </main>
    );
  }

  const [dashboard,stamps,saved]=await Promise.all([
    getCustomerDashboard(customer.id),
    listCustomerWorldStamps(customer.id),
    listSavedProducts(customer.id),
  ]);
  const greeting=customer.firstName?"WELCOME, "+customer.firstName.toUpperCase():"WELCOME BACK";

  return (
    <main className="passport-page passport-page-upgraded">
      <div className="passport-card">
        <span>3RD WORLD</span>
        <h1>PASSPORT</h1>
        <p>{customer.passportNumber??"ACTIVE"}</p>
        <div className="passport-stamp">{dashboard.passportTier}</div>
      </div>

      <section className="passport-content">
        <p>{greeting}</p>
        <h2>YOUR WORLD</h2>
        <div className="passport-tier-line">
          <span>ACCESS TIER</span>
          <strong>{dashboard.passportTier}</strong>
        </div>

        <div className="passport-stats">
          <div><span>ORDERS</span><strong>{dashboard.orderCount}</strong></div>
          <div><span>WORLDS</span><strong>{dashboard.worldStampCount}</strong></div>
          <div><span>CREDIT</span><strong>{"$"+(dashboard.storeCreditAmount/100).toFixed(0)}</strong></div>
        </div>

        <div className="passport-worlds">
          <div className="passport-worlds-head">
            <span>WORLD STAMPS</span>
            <strong>{stamps.length}</strong>
          </div>
          {stamps.length?stamps.map(stamp=>(
            <Link href={"/world/"+stamp.slug} className="passport-world-row" key={stamp.slug}>
              <div><span>{stamp.code}</span><strong>{stamp.title}</strong></div>
              <span>{stamp.year??new Date(stamp.stampedAt).getFullYear()}</span>
            </Link>
          )):<p className="muted">YOUR FIRST WORLD STAMP APPEARS AFTER A COMPLETED PURCHASE.</p>}
        </div>

        <div className="passport-saved">
          <div className="passport-worlds-head">
            <span>SAVED PIECES</span>
            <strong>{saved.length}</strong>
          </div>
          {saved.length
            ? <div className="passport-saved-grid">{saved.map((product,index)=><ProductCard product={product} index={index} key={product.slug}/>)}</div>
            : <p className="muted">SAVE PIECES FROM A PRODUCT PAGE TO KEEP THEM IN YOUR PASSPORT.</p>}
        </div>

        <div className="passport-links">
          <Link href="/drop">WORLD ACCESS</Link>
          <Link href="/archive">ARCHIVE</Link>
          <Link href="/shop">SHOP</Link>
          <button>ADDRESSES</button>
        </div>
        <PassportLogout/>
      </section>
    </main>
  );
}
