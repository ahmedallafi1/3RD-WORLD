import {query,withTransaction} from "@/lib/db";
import {cancelCheckoutOrder} from "@/lib/payments/cancel-checkout";
import {pruneRateLimits} from "@/lib/security/rate-limit";

export async function expireAbandonedCartReservations(limit=500){
  return withTransaction(async client=>{
    const expired=await client.query<{
      id:string;
      cart_id:string;
      variant_id:string;
      location_id:string;
      quantity:number;
    }>(
      `SELECT id,cart_id,variant_id,location_id,quantity
       FROM inventory_reservations
       WHERE status='ACTIVE'
         AND order_id IS NULL
         AND expires_at<=now()
       ORDER BY expires_at,id
       FOR UPDATE SKIP LOCKED
       LIMIT $1`,
      [Math.max(1,Math.min(limit,2000))],
    );

    if(!expired.rows.length)return {expired:0,carts:0};

    const lockPairs=[...new Set(expired.rows.map(row=>row.variant_id+"|"+row.location_id))]
      .sort()
      .map(value=>value.split("|"));

    for(const [variantId,locationId] of lockPairs){
      await client.query(
        `SELECT 1 FROM inventory_levels
         WHERE variant_id=$1 AND location_id=$2
         FOR UPDATE`,
        [variantId,locationId],
      );
    }

    for(const row of expired.rows){
      await client.query(
        `UPDATE inventory_reservations
         SET status='EXPIRED',updated_at=now()
         WHERE id=$1`,
        [row.id],
      );
      await client.query(
        `UPDATE inventory_levels
         SET reserved=GREATEST(0,reserved-$3),updated_at=now()
         WHERE variant_id=$1 AND location_id=$2`,
        [row.variant_id,row.location_id,row.quantity],
      );
      await client.query(
        `INSERT INTO inventory_events
         (variant_id,location_id,event_type,quantity_delta,reservation_id,note)
         VALUES($1,$2,'RELEASE',$3,$4,'housekeeping: reservation expired')`,
        [row.variant_id,row.location_id,-row.quantity,row.id],
      );
    }

    const cartIds=[...new Set(expired.rows.map(row=>row.cart_id))];
    await client.query(
      `UPDATE carts c
       SET status='EXPIRED',updated_at=now()
       WHERE c.id=ANY($1::uuid[])
         AND c.status='ACTIVE'
         AND NOT EXISTS (
           SELECT 1 FROM inventory_reservations r
           WHERE r.cart_id=c.id AND r.status='ACTIVE'
         )`,
      [cartIds],
    );

    return {expired:expired.rows.length,carts:cartIds.length};
  });
}

export async function cancelStaleCheckoutOrders(limit=40){
  const ageMinutes=Math.max(30,Number(process.env.STALE_CHECKOUT_MINUTES??120));
  const result=await query<{id:string}>(
    `SELECT o.id
     FROM orders o
     WHERE o.status='PENDING_PAYMENT'
       AND o.created_at<=now()-make_interval(mins=>$1)
       AND NOT EXISTS (
         SELECT 1
         FROM payment_attempts pa
         WHERE pa.order_id=o.id
           AND pa.status IN ('PROCESSING','SUCCEEDED')
       )
     ORDER BY o.created_at
     LIMIT $2`,
    [ageMinutes,Math.max(1,Math.min(limit,200))],
  );

  let cancelled=0;
  let failed=0;
  for(const row of result.rows){
    try{
      await cancelCheckoutOrder(row.id);
      cancelled++;
    }catch{
      failed++;
    }
  }
  return {cancelled,failed};
}

export async function pruneExpiredSecurityState(){
  const [admin,customer,drop,mfaSetup,mfaChallenges]=await Promise.all([
    query("DELETE FROM admin_sessions WHERE expires_at<=now()"),
    query("DELETE FROM customer_sessions WHERE expires_at<=now()"),
    query("DELETE FROM drop_access_sessions WHERE expires_at<=now()"),
    query("DELETE FROM admin_mfa_setup WHERE expires_at<=now()"),
    query("DELETE FROM admin_mfa_challenges WHERE expires_at<=now()"),
  ]);
  await pruneRateLimits();

  return {
    adminSessions:admin.rowCount??0,
    customerSessions:customer.rowCount??0,
    dropSessions:drop.rowCount??0,
    mfaSetup:mfaSetup.rowCount??0,
    mfaChallenges:mfaChallenges.rowCount??0,
  };
}

export async function runHousekeeping(){
  const [reservations,checkouts,security]=await Promise.all([
    expireAbandonedCartReservations(),
    cancelStaleCheckoutOrders(),
    pruneExpiredSecurityState(),
  ]);
  return {reservations,checkouts,security};
}
