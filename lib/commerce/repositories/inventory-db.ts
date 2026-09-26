import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db";

export class InventoryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryConflictError";
  }
}

async function expireLockedReservations(
  client: PoolClient,
  variantId: string,
  locationId: string,
) {
  const expired = await client.query<{ id: string; quantity: number }>(
    `UPDATE inventory_reservations
     SET status = 'EXPIRED', updated_at = now()
     WHERE variant_id = $1
       AND location_id = $2
       AND status = 'ACTIVE'
       AND expires_at <= now()
     RETURNING id, quantity`,
    [variantId, locationId],
  );

  const totalExpired = expired.rows.reduce((sum, row) => sum + row.quantity, 0);
  if (totalExpired > 0) {
    await client.query(
      `UPDATE inventory_levels
       SET reserved = GREATEST(0, reserved - $3), updated_at = now()
       WHERE variant_id = $1 AND location_id = $2`,
      [variantId, locationId, totalExpired],
    );

    for (const row of expired.rows) {
      await client.query(
        `INSERT INTO inventory_events
         (variant_id, location_id, event_type, quantity_delta, reservation_id, note)
         VALUES ($1,$2,'RELEASE',$3,$4,'reservation expired')`,
        [variantId, locationId, -row.quantity, row.id],
      );
    }
  }
}

export async function reserveInventoryTx(args: {
  cartId: string;
  variantId: string;
  locationId: string;
  quantity: number;
  ttlSeconds?: number;
}) {
  if (!Number.isInteger(args.quantity) || args.quantity <= 0) {
    throw new InventoryConflictError("Quantity must be a positive integer.");
  }

  return withTransaction(async (client) => {
    const level = await client.query<{ on_hand: number; reserved: number }>(
      `SELECT on_hand, reserved
       FROM inventory_levels
       WHERE variant_id = $1 AND location_id = $2
       FOR UPDATE`,
      [args.variantId, args.locationId],
    );

    if (!level.rows[0]) throw new InventoryConflictError("Inventory level not found.");

    await expireLockedReservations(client, args.variantId, args.locationId);

    const refreshed = await client.query<{ on_hand: number; reserved: number }>(
      `SELECT on_hand, reserved
       FROM inventory_levels
       WHERE variant_id = $1 AND location_id = $2`,
      [args.variantId, args.locationId],
    );

    const available = refreshed.rows[0].on_hand - refreshed.rows[0].reserved;
    if (available < args.quantity) {
      throw new InventoryConflictError("Insufficient inventory.");
    }

    const reservation = await client.query<{ id: string; expires_at: Date }>(
      `INSERT INTO inventory_reservations
       (cart_id, variant_id, location_id, quantity, expires_at)
       VALUES ($1,$2,$3,$4, now() + ($5 || ' seconds')::interval)
       RETURNING id, expires_at`,
      [
        args.cartId,
        args.variantId,
        args.locationId,
        args.quantity,
        args.ttlSeconds ?? 480,
      ],
    );

    await client.query(
      `UPDATE inventory_levels
       SET reserved = reserved + $3, updated_at = now()
       WHERE variant_id = $1 AND location_id = $2`,
      [args.variantId, args.locationId, args.quantity],
    );

    await client.query(
      `INSERT INTO inventory_events
       (variant_id, location_id, event_type, quantity_delta, reservation_id)
       VALUES ($1,$2,'RESERVATION',$3,$4)`,
      [args.variantId, args.locationId, args.quantity, reservation.rows[0].id],
    );

    return {
      id: reservation.rows[0].id,
      expiresAt: reservation.rows[0].expires_at.toISOString(),
      quantity: args.quantity,
    };
  });
}

export async function releaseReservationTx(reservationId: string) {
  return withTransaction(async (client) => {
    const reservation = await client.query<{
      id: string;
      variant_id: string;
      location_id: string;
      quantity: number;
      status: string;
    }>(
      `SELECT * FROM inventory_reservations
       WHERE id = $1
       FOR UPDATE`,
      [reservationId],
    );
    const row = reservation.rows[0];
    if (!row || row.status !== "ACTIVE") return false;

    await client.query(
      `SELECT 1 FROM inventory_levels
       WHERE variant_id = $1 AND location_id = $2
       FOR UPDATE`,
      [row.variant_id, row.location_id],
    );

    await client.query(
      `UPDATE inventory_reservations
       SET status = 'RELEASED', updated_at = now()
       WHERE id = $1`,
      [reservationId],
    );
    await client.query(
      `UPDATE inventory_levels
       SET reserved = GREATEST(0, reserved - $3), updated_at = now()
       WHERE variant_id = $1 AND location_id = $2`,
      [row.variant_id, row.location_id, row.quantity],
    );
    await client.query(
      `INSERT INTO inventory_events
       (variant_id, location_id, event_type, quantity_delta, reservation_id)
       VALUES ($1,$2,'RELEASE',$3,$4)`,
      [row.variant_id, row.location_id, -row.quantity, row.id],
    );
    return true;
  });
}


export async function adjustInventoryTx(args:{
  variantId:string;
  locationId:string;
  delta:number;
  actorId:string;
  note?:string;
}){
  if(!Number.isInteger(args.delta)||args.delta===0){
    throw new InventoryConflictError("Adjustment must be a non-zero integer.");
  }

  return withTransaction(async client=>{
    const level=await client.query<{on_hand:number;reserved:number}>(
      `SELECT on_hand,reserved FROM inventory_levels
       WHERE variant_id=$1 AND location_id=$2
       FOR UPDATE`,
      [args.variantId,args.locationId],
    );
    if(!level.rows[0])throw new InventoryConflictError("Inventory level not found.");

    const beforeAvailable=level.rows[0].on_hand-level.rows[0].reserved;
    const next=level.rows[0].on_hand+args.delta;
    if(next<level.rows[0].reserved||next<0){
      throw new InventoryConflictError("Adjustment would reduce stock below reserved inventory.");
    }

    await client.query(
      `UPDATE inventory_levels
       SET on_hand=$3,updated_at=now()
       WHERE variant_id=$1 AND location_id=$2`,
      [args.variantId,args.locationId,next],
    );
    await client.query(
      `INSERT INTO inventory_events
       (variant_id,location_id,event_type,quantity_delta,actor_type,actor_id,note)
       VALUES($1,$2,'ADJUSTMENT',$3,'ADMIN',$4,$5)`,
      [args.variantId,args.locationId,args.delta,args.actorId,args.note??null],
    );

    const afterAvailable=next-level.rows[0].reserved;
    if(beforeAvailable<=0&&afterAvailable>0){
      const product=await client.query<{id:string;slug:string;name:string}>(
        `SELECT p.id,p.slug,p.name
         FROM variants v
         JOIN products p ON p.id=v.product_id
         WHERE v.id=$1
         LIMIT 1`,
        [args.variantId],
      );
      const row=product.rows[0];
      if(row){
        const subscribers=await client.query<{id:string;email:string}>(
          `SELECT id,lower(email) AS email
           FROM access_signups
           WHERE product_id=$1
             AND signup_type='RESTOCK'
             AND status='SUBSCRIBED'`,
          [row.id],
        );
        const base=(process.env.PUBLIC_SITE_URL??"http://localhost:3000").replace(/\/$/,"");
        for(const subscriber of subscribers.rows){
          const html=`<!doctype html><html><body style="margin:0;background:#090909;color:#f4f3ef;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;padding:48px 24px"><div style="font-weight:800">3RD WORLD</div><h1 style="font-size:48px;line-height:.9;margin:48px 0 20px">${row.name} IS BACK.</h1><p>THE PIECE YOU SAVED FOR RESTOCK IS AVAILABLE AGAIN.</p><a href="${base}/product/${row.slug}" style="color:#f4f3ef">VIEW PIECE</a></div></body></html>`;
          await client.query(
            `INSERT INTO notification_outbox
             (channel,notification_type,recipient,subject,body_html,dedupe_key,status)
             VALUES('EMAIL','RESTOCK',$1,$2,$3,$4,'PENDING')
             ON CONFLICT(dedupe_key) DO NOTHING`,
            [
              subscriber.email,
              row.name+" / RESTOCK",
              html,
              "restock:"+row.id+":"+subscriber.email+":"+Date.now(),
            ],
          );
          await client.query(
            "UPDATE access_signups SET status='NOTIFIED',updated_at=now() WHERE id=$1",
            [subscriber.id],
          );
        }
      }
    }

    return {onHand:next,reserved:level.rows[0].reserved,available:afterAvailable};
  });
}
