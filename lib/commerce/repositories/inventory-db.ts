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

    return {onHand:next,reserved:level.rows[0].reserved,available:next-level.rows[0].reserved};
  });
}
