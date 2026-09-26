import {PassportAuth,PassportLogout} from "@/components/passport-auth";
import {getCustomerUser} from "@/lib/auth/session";
import {getCustomerDashboard} from "@/lib/commerce/repositories/customers";

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
          <p className="muted">SIGN IN OR CREATE A PASSPORT FOR ORDERS, ACCESS AND STORE CREDIT.</p>
          <PassportAuth/>
        </section>
      </main>
    );
  }

  const dashboard=await getCustomerDashboard(customer.id);
  const greeting=customer.firstName?"WELCOME, "+customer.firstName.toUpperCase():"WELCOME BACK";

  return (
    <main className="passport-page">
      <div className="passport-card">
        <span>3RD WORLD</span>
        <h1>PASSPORT</h1>
        <p>{customer.passportNumber??"ACTIVE"}</p>
        <div className="passport-stamp">WORLD 001</div>
      </div>
      <section className="passport-content">
        <p>{greeting}</p>
        <h2>YOUR WORLD</h2>
        <div className="passport-stats">
          <div><span>ORDERS</span><strong>{dashboard.orderCount}</strong></div>
          <div><span>SPEND</span><strong>{"$"+(dashboard.lifetimeSpendAmount/100).toFixed(0)}</strong></div>
          <div><span>CREDIT</span><strong>{"$"+(dashboard.storeCreditAmount/100).toFixed(0)}</strong></div>
        </div>
        <div className="passport-links">
          <button>ORDERS</button>
          <button>SAVED PIECES</button>
          <button>WORLD ACCESS</button>
          <button>ADDRESSES</button>
        </div>
        <PassportLogout/>
      </section>
    </main>
  );
}
