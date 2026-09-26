import { query, withTransaction } from "@/lib/db";
import {hashCartToken,newCartToken} from "@/lib/security/cart-token";

export async function createCart(args?: {
  email?: string;
  currency?: string;
  customerId?: string;
  marketCode?: string;
}) {
  const accessToken=newCartToken();
  const result = await query<{ id: string }>(
    `INSERT INTO carts (customer_id, email, currency, market_code, access_token_hash, expires_at)
     VALUES ($1,$2,$3,$4,$5, now() + interval '24 hours')
     RETURNING id`,
    [
      args?.customerId ?? null,
      args?.email?.trim().toLowerCase() ?? null,
      args?.currency ?? "USD",
      args?.marketCode ?? null,
      hashCartToken(accessToken),
    ],
  );
  return { id: result.rows[0].id, accessToken };
}

export async function getCart(cartId: string) {
  const cart = await query<{
    id: string;
    email: string | null;
    currency: string;
    status: string;
  }>(
    `SELECT id, email, currency, status
     FROM carts WHERE id = $1`,
    [cartId],
  );
  if (!cart.rows[0]) return null;

  const lines = await query<{
    id: string;
    variant_id: string;
    quantity: number;
    unit_price_amount: string;
    currency: string;
    sku: string;
    product_name: string;
    size: string;
    color: string;
  }>(
    `SELECT cl.id, cl.variant_id, cl.quantity, cl.unit_price_amount, cl.currency,
            v.sku, p.name AS product_name, v.size, v.color
     FROM cart_lines cl
     JOIN variants v ON v.id = cl.variant_id
     JOIN products p ON p.id = v.product_id
     WHERE cl.cart_id = $1
     ORDER BY cl.created_at`,
    [cartId],
  );

  return {
    ...cart.rows[0],
    lines: lines.rows.map((row) => ({
      id: row.id,
      variantId: row.variant_id,
      quantity: row.quantity,
      unitPriceAmount: Number(row.unit_price_amount),
      currency: row.currency,
      sku: row.sku,
      productName: row.product_name,
      size: row.size,
      color: row.color,
    })),
  };
}

export async function setCartLineQuantity(args: {
  cartId: string;
  variantId: string;
  locationId: string;
  quantity: number;
  ttlSeconds?: number;
  unitPriceAmount?: number;
  currency?: string;
}) {
  if (!Number.isInteger(args.quantity) || args.quantity < 0) {
    throw new Error("Quantity must be a non-negative integer.");
  }

  return withTransaction(async (client) => {
    const cart = await client.query<{ status: string }>(
      "SELECT status FROM carts WHERE id = $1 FOR UPDATE",
      [args.cartId],
    );
    if (!cart.rows[0] || cart.rows[0].status !== "ACTIVE") {
      throw new Error("Cart is not active.");
    }

    const variant = await client.query<{
      price_amount: string;
      currency: string;
      active: boolean;
    }>(
      `SELECT price_amount, currency, active
       FROM variants WHERE id = $1`,
      [args.variantId],
    );
    if (!variant.rows[0] || !variant.rows[0].active) {
      throw new Error("Variant is unavailable.");
    }

    await client.query(
      `SELECT 1 FROM inventory_levels
       WHERE variant_id = $1 AND location_id = $2
       FOR UPDATE`,
      [args.variantId, args.locationId],
    );

    const expired = await client.query<{ id: string; quantity: number }>(
      `UPDATE inventory_reservations
       SET status='EXPIRED', updated_at=now()
       WHERE variant_id=$1 AND location_id=$2
         AND status='ACTIVE' AND expires_at <= now()
       RETURNING id, quantity`,
      [args.variantId, args.locationId],
    );
    const expiredQty = expired.rows.reduce((sum,row)=>sum+row.quantity,0);
    if (expiredQty) {
      await client.query(
        `UPDATE inventory_levels
         SET reserved=GREATEST(0,reserved-$3), updated_at=now()
         WHERE variant_id=$1 AND location_id=$2`,
        [args.variantId,args.locationId,expiredQty],
      );
    }

    const current = await client.query<{ quantity: number }>(
      `SELECT quantity FROM cart_lines
       WHERE cart_id=$1 AND variant_id=$2
       FOR UPDATE`,
      [args.cartId,args.variantId],
    );
    const currentQuantity=current.rows[0]?.quantity??0;
    const delta=args.quantity-currentQuantity;

    if(delta>0){
      const level=await client.query<{on_hand:number;reserved:number}>(
        `SELECT on_hand,reserved FROM inventory_levels
         WHERE variant_id=$1 AND location_id=$2`,
        [args.variantId,args.locationId],
      );
      if(!level.rows[0]||level.rows[0].on_hand-level.rows[0].reserved<delta){
        throw new Error("Insufficient inventory.");
      }

      const reservation=await client.query<{id:string}>(
        `INSERT INTO inventory_reservations
         (cart_id,variant_id,location_id,quantity,expires_at)
         VALUES($1,$2,$3,$4,now()+($5 || ' seconds')::interval)
         RETURNING id`,
        [args.cartId,args.variantId,args.locationId,delta,args.ttlSeconds??480],
      );
      await client.query(
        `UPDATE inventory_levels
         SET reserved=reserved+$3,updated_at=now()
         WHERE variant_id=$1 AND location_id=$2`,
        [args.variantId,args.locationId,delta],
      );
      await client.query(
        `INSERT INTO inventory_events
         (variant_id,location_id,event_type,quantity_delta,reservation_id)
         VALUES($1,$2,'RESERVATION',$3,$4)`,
        [args.variantId,args.locationId,delta,reservation.rows[0].id],
      );
    }

    if(delta<0){
      let remaining=-delta;
      const reservations=await client.query<{
        id:string;quantity:number;
      }>(
        `SELECT id,quantity FROM inventory_reservations
         WHERE cart_id=$1 AND variant_id=$2 AND location_id=$3 AND status='ACTIVE'
         ORDER BY created_at DESC
         FOR UPDATE`,
        [args.cartId,args.variantId,args.locationId],
      );

      for(const row of reservations.rows){
        if(remaining<=0)break;
        const release=Math.min(remaining,row.quantity);
        if(release===row.quantity){
          await client.query(
            "UPDATE inventory_reservations SET status='RELEASED',updated_at=now() WHERE id=$1",
            [row.id],
          );
        }else{
          await client.query(
            "UPDATE inventory_reservations SET quantity=quantity-$2,updated_at=now() WHERE id=$1",
            [row.id,release],
          );
        }
        await client.query(
          `UPDATE inventory_levels SET reserved=GREATEST(0,reserved-$3),updated_at=now()
           WHERE variant_id=$1 AND location_id=$2`,
          [args.variantId,args.locationId,release],
        );
        remaining-=release;
      }
    }

    if(args.quantity===0){
      await client.query(
        "DELETE FROM cart_lines WHERE cart_id=$1 AND variant_id=$2",
        [args.cartId,args.variantId],
      );
    }else{
      await client.query(
        `INSERT INTO cart_lines
         (cart_id,variant_id,quantity,unit_price_amount,currency)
         VALUES($1,$2,$3,$4,$5)
         ON CONFLICT(cart_id,variant_id)
         DO UPDATE SET quantity=EXCLUDED.quantity,
                       unit_price_amount=EXCLUDED.unit_price_amount,
                       currency=EXCLUDED.currency,
                       updated_at=now()`,
        [
          args.cartId,
          args.variantId,
          args.quantity,
          args.unitPriceAmount ?? Number(variant.rows[0].price_amount),
          args.currency ?? variant.rows[0].currency,
        ],
      );
    }

    await client.query(
      "UPDATE carts SET updated_at=now(),expires_at=now()+interval '24 hours' WHERE id=$1",
      [args.cartId],
    );

    return {quantity:args.quantity};
  });
}
