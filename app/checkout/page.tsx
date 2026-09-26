"use client";

import { FormEvent, useMemo, useState } from "react";
import { money } from "@/lib/catalog";
import { useStorefront } from "@/components/storefront-provider";

export default function CheckoutPage() {
  const { bagItems } = useStorefront();
  const [submitted, setSubmitted] = useState(false);
  const subtotal = useMemo(
    () => bagItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [bagItems],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="checkout-page checkout-confirmation">
        <span className="checkout-mark">◎</span>
        <p>ORDER RECEIVED</p>
        <h1>WELCOME TO THE WORLD.</h1>
        <p className="muted">This Phase 02 screen is visual only. Payment processing is connected in Phase 04.</p>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <form className="checkout-form" onSubmit={submit}>
        <section>
          <p className="checkout-section-label">01 / CONTACT</p>
          <input required type="email" placeholder="EMAIL" />
        </section>

        <section>
          <p className="checkout-section-label">02 / DELIVERY</p>
          <div className="form-grid">
            <input required placeholder="FIRST NAME" />
            <input required placeholder="LAST NAME" />
            <input required className="full" placeholder="ADDRESS" />
            <input className="full" placeholder="APARTMENT / SUITE" />
            <input required placeholder="CITY" />
            <input required placeholder="STATE / REGION" />
            <input required placeholder="POSTAL CODE" />
            <select defaultValue="US" aria-label="Country">
              <option value="US">UNITED STATES</option>
              <option value="CA">CANADA</option>
              <option value="GB">UNITED KINGDOM</option>
              <option value="EU">EUROPE</option>
            </select>
          </div>
        </section>

        <section>
          <p className="checkout-section-label">03 / PAYMENT</p>
          <div className="payment-placeholder">
            <span>PAYMENT ELEMENT</span>
            <span>CONNECTED IN PHASE 04</span>
          </div>
        </section>

        <button className="button button--dark" type="submit">CONTINUE</button>
      </form>

      <aside className="checkout-summary">
        <p>ORDER SUMMARY</p>
        {bagItems.length === 0 ? (
          <p className="muted">YOUR BAG IS EMPTY.</p>
        ) : (
          bagItems.map((item) => (
            <div className="checkout-line" key={`${item.product.slug}-${item.size}`}>
              <div><span>{item.product.name}</span><span className="muted">{item.product.color} / {item.size} × {item.quantity}</span></div>
              <span>{money(item.product.price * item.quantity)}</span>
            </div>
          ))
        )}
        <div className="checkout-total"><span>SUBTOTAL</span><strong>{money(subtotal)}</strong></div>
        <p className="muted">Shipping, tax and duties are calculated by the global commerce layer in Phase 04.</p>
      </aside>
    </main>
  );
}
