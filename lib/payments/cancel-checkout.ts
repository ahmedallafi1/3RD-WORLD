import { query } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { releaseOrderReservations, transitionOrder } from "@/lib/commerce/repositories/orders-db";

export async function cancelCheckoutOrder(orderId:string){
  const attempt=await query<{provider_payment_id:string|null}>(
    `SELECT provider_payment_id
     FROM payment_attempts
     WHERE order_id=$1 AND provider='stripe'
       AND status IN ('CREATED','REQUIRES_ACTION','PROCESSING')
     ORDER BY created_at DESC
     LIMIT 1`,
    [orderId],
  );

  const providerId=attempt.rows[0]?.provider_payment_id;
  if(providerId){
    try{
      await getPaymentProvider().cancelPayment(providerId);
    }catch{
      // Continue internal cancellation; provider webhooks are idempotent.
    }
  }

  await releaseOrderReservations(orderId,"checkout edited or cancelled");
  try{
    await transitionOrder({
      orderId,
      to:"CANCELLED",
      actorType:"SYSTEM",
      actorId:"checkout_cancel",
    });
  }catch{
    // Already cancelled or advanced beyond cancellation.
  }

  if(providerId){
    await query(
      `UPDATE payment_attempts
       SET status='CANCELLED',updated_at=now()
       WHERE provider='stripe' AND provider_payment_id=$1`,
      [providerId],
    );
  }
}
