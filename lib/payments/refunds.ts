import { query, withTransaction } from "@/lib/db";
import { createStripeRefund } from "@/lib/payments/stripe";
import { transitionOrder } from "@/lib/commerce/repositories/orders-db";
import { reverseOrderTax } from "@/lib/tax/refund-tax";

export async function refundOrder(args:{
  orderId:string;
  amount?:number;
  actorId:string;
  reason?:string;
}){
  const prepared=await withTransaction(async client=>{
    const order=await client.query<{
      id:string;
      status:string;
      currency:string;
      grand_total_amount:string;
    }>(
      `SELECT id,status,currency,grand_total_amount
       FROM orders WHERE id=$1 FOR UPDATE`,
      [args.orderId],
    );
    if(!order.rows[0])throw new Error("Order not found.");
    if(["DRAFT","PENDING_PAYMENT","CANCELLED"].includes(order.rows[0].status)){
      throw new Error("This order is not refundable.");
    }

    const payment=await client.query<{provider_payment_id:string}>(
      `SELECT provider_payment_id
       FROM payment_attempts
       WHERE order_id=$1
         AND provider='stripe'
         AND status='SUCCEEDED'
         AND provider_payment_id IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [args.orderId],
    );
    if(!payment.rows[0])throw new Error("Successful payment not found.");

    const prior=await client.query<{total:string}>(
      `SELECT COALESCE(sum(amount),0)::text AS total
       FROM refunds
       WHERE order_id=$1 AND status IN ('PENDING','SUCCEEDED')`,
      [args.orderId],
    );
    const grandTotal=Number(order.rows[0].grand_total_amount);
    const reservedRefunds=Number(prior.rows[0]?.total??0);
    const remaining=grandTotal-reservedRefunds;
    const amount=args.amount??remaining;
    if(!Number.isInteger(amount)||amount<=0||amount>remaining){
      throw new Error("Refund amount exceeds the remaining refundable total.");
    }

    const refund=await client.query<{id:string}>(
      `INSERT INTO refunds
       (order_id,amount,currency,status,payment_provider,provider_ref,actor_id,reason)
       VALUES($1,$2,$3,'PENDING','stripe',NULL,$4,$5)
       RETURNING id`,
      [args.orderId,amount,order.rows[0].currency,args.actorId,args.reason??null],
    );

    return {
      refundId:refund.rows[0].id,
      paymentIntentId:payment.rows[0].provider_payment_id,
      amount,
      grandTotal,
      remainingBefore:remaining,
    };
  });

  try{
    const providerRefund=await createStripeRefund({
      paymentIntentId:prepared.paymentIntentId,
      amount:prepared.amount,
      orderId:args.orderId,
      reason:args.reason,
    });

    const succeeded=providerRefund.status==="succeeded";
    await query(
      `UPDATE refunds
       SET status=$2,provider_ref=$3
       WHERE id=$1`,
      [
        prepared.refundId,
        succeeded?"SUCCEEDED":"PENDING",
        providerRefund.id||null,
      ],
    );

    if(succeeded){
      const total=await query<{total:string}>(
        `SELECT COALESCE(sum(amount),0)::text AS total
         FROM refunds WHERE order_id=$1 AND status='SUCCEEDED'`,
        [args.orderId],
      );
      const refunded=Number(total.rows[0]?.total??0);
      const full=refunded>=prepared.grandTotal;
      await transitionOrder({
        orderId:args.orderId,
        to:full?"REFUNDED":"PARTIALLY_REFUNDED",
        actorType:"ADMIN",
        actorId:args.actorId,
      });
      await reverseOrderTax({
        orderId:args.orderId,
        refundId:prepared.refundId,
        refundAmount:prepared.amount,
        full,
      });
    }

    return {
      id:prepared.refundId,
      providerRefundId:providerRefund.id,
      status:providerRefund.status,
      amount:prepared.amount,
    };
  }catch(error){
    await query(
      `UPDATE refunds SET status='FAILED' WHERE id=$1`,
      [prepared.refundId],
    );
    throw error;
  }
}


export async function syncStripeRefundFromWebhook(args:{
  providerRefundId:string;
  orderId:string;
  status:string;
}){
  const mapped=args.status==="succeeded"?"SUCCEEDED":args.status==="failed"?"FAILED":"PENDING";
  await query(
    `UPDATE refunds
     SET status=$2,provider_ref=COALESCE(provider_ref,$1)
     WHERE id=(
       SELECT id FROM refunds
       WHERE payment_provider='stripe'
         AND (provider_ref=$1 OR (order_id=$3 AND provider_ref IS NULL AND status='PENDING'))
       ORDER BY created_at DESC
       LIMIT 1
     )`,
    [args.providerRefundId,mapped,args.orderId],
  );

  if(mapped!=="SUCCEEDED")return;

  const totals=await query<{grand_total:string;refunded:string}>(
    `SELECT o.grand_total_amount::text AS grand_total,
            COALESCE(sum(r.amount) FILTER (WHERE r.status='SUCCEEDED'),0)::text AS refunded
     FROM orders o
     LEFT JOIN refunds r ON r.order_id=o.id
     WHERE o.id=$1
     GROUP BY o.id`,
    [args.orderId],
  );
  const row=totals.rows[0];
  if(!row)return;

  await transitionOrder({
    orderId:args.orderId,
    to:Number(row.refunded)>=Number(row.grand_total)?"REFUNDED":"PARTIALLY_REFUNDED",
    actorType:"PAYMENT",
    actorId:args.providerRefundId,
  });
}
