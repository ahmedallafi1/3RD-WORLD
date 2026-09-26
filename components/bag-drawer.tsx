"use client";

import Link from "next/link";
import { money } from "@/lib/catalog";
import { useStorefront } from "@/components/storefront-provider";

export function BagDrawer() {
  const { bagOpen, setBagOpen, bagItems, changeQuantity, removeFromBag } = useStorefront();

  const subtotal = bagItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  return (
    <>
      <button
        className={`drawer-backdrop ${bagOpen ? "is-open" : ""}`}
        aria-label="Close bag"
        onClick={() => setBagOpen(false)}
      />
      <aside className={`bag-drawer ${bagOpen ? "is-open" : ""}`} aria-hidden={!bagOpen}>
        <div className="bag-drawer__header">
          <span>BAG ({bagItems.reduce((sum, item) => sum + item.quantity, 0)})</span>
          <button className="text-button" onClick={() => setBagOpen(false)}>CLOSE</button>
        </div>

        <div className="bag-drawer__items">
          {bagItems.length === 0 ? (
            <div className="bag-empty">
              <p>YOUR BAG IS EMPTY.</p>
              <Link href="/shop" onClick={() => setBagOpen(false)}>SHOP WORLD 001</Link>
            </div>
          ) : (
            bagItems.map((item) => (
              <article className="bag-line" key={`${item.product.slug}-${item.size}`}>
                <div className={`mini-visual tone-${item.product.tone}`}><span>3W</span></div>
                <div className="bag-line__copy">
                  <div>
                    <p>{item.product.name}</p>
                    <p className="muted">{item.product.color} / {item.size}</p>
                    <p>{money(item.product.price)}</p>
                  </div>
                  <div className="quantity-row">
                    <button onClick={() => changeQuantity(item.product.slug, item.size, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => changeQuantity(item.product.slug, item.size, 1)}>+</button>
                    <button className="remove-link" onClick={() => removeFromBag(item.product.slug, item.size)}>
                      REMOVE
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {bagItems.length > 0 && (
          <div className="bag-drawer__footer">
            <div className="subtotal-row"><span>SUBTOTAL</span><span>{money(subtotal)}</span></div>
            <Link href="/checkout" className="button button--dark" onClick={() => setBagOpen(false)}>
              CHECKOUT
            </Link>
            <button className="text-button centered" onClick={() => setBagOpen(false)}>
              CONTINUE SHOPPING
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
