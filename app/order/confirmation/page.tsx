import Link from "next/link";

export const metadata={title:"Order Received"};

export default async function OrderConfirmationPage({
  searchParams,
}:{searchParams:Promise<{order?:string}>}){
  const {order}=await searchParams;

  return (
    <main className="checkout-complete">
      <span>3RD WORLD</span>
      <h1>YOU&apos;RE IN.</h1>
      <p>PAYMENT WAS SUBMITTED SECURELY. YOUR ORDER IS CONFIRMED AFTER PAYMENT VERIFICATION.</p>
      {order&&<small>ORDER REF / {order.slice(0,8).toUpperCase()}</small>}
      <div className="confirmation-links">
        <Link href="/passport" className="underlined-link">OPEN PASSPORT</Link>
        <Link href="/shop" className="underlined-link">RETURN TO SHOP</Link>
      </div>
    </main>
  );
}
