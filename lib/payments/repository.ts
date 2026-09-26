import { query, withTransaction } from "@/lib/db";
import type { PaymentSession } from "@/lib/payments/types";
import { markOrderPaidAndAllocate, releaseOrderReservations, transitionOrder } from "@/lib/commerce/repositories/orders-db";

export async function getOrderForPayment(orderId:string){
  const result=await query<{
    id:string;
    order_number:string;
    email:string;
    status:string;
    currency:string;
    grand_total_amount:string;
  }>(
    `SELECT id,order_number,email,status,currency,grand_total_amount
     FROM orders WHERE id=$1 LIMIT 1`,
    [orderId],
  );
  const row=result.rows[0];
  if(!row)throw new Error("Order not found.");
  if(row.status!=="PENDING_PAYMENT")throw new Error("Order is not awaiting payment.");
  return {
    id:row.id,
    orderNumber:row.order_number,
    email:row.email,
    status:row.status,
    currency:row.currency,
    grandTotalAmount:Number(row.grand_total_amount),
  };
}

export async function recordPaymentSession(orderId:string,session:PaymentSession){
  const result=await query<{id:string}>(
    `INSERT INTO payment_attempts
     (order_id,provider,provider_payment_id,status,amount,currency,metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)
     ON CONFLICT(provider,provider_payment_id)
     DO UPDATE SET status=EXCLUDED.status,updated_at=now()
     RETURNING id`,
    [
      orderId,
      session.provider,
      session.providerPaymentId,
      mapProviderStatus(session.status),
      session.amount,
      session.currency,
      JSON.stringify({client_secret_issued:true}),
    ],
  );
  return result.rows[0].id;
}

function mapProviderStatus(status:string){
  switch(status){
    case "succeeded": return "SUCCEEDED";
    case "processing": return "PROCESSING";
    case "requires_action":
    case "requires_source_action":
    case "requires_payment_method":
    case "requires_confirmation":
      return "REQUIRES_ACTION";
    case "canceled": return "CANCELLED";
    default: return "CREATED";
  }
}

export async function recordStripeEvent(args:{
  eventId:string;
  eventType:string;
  providerPaymentId?:string;
  orderId?:string;
  payload:unknown;
}){
  return withTransaction(async client=>{
    const inserted=await client.query<{id:string}>(
      `INSERT INTO payment_events
       (provider,provider_event_id,event_type,order_id,payload)
       VALUES('stripe',$1,$2,$3,$4::jsonb)
       ON CONFLICT(provider,provider_event_id) DO NOTHING
       RETURNING id`,
      [
        args.eventId,
        args.eventType,
        args.orderId??null,
        JSON.stringify(args.payload),
      ],
    );
    if(!inserted.rows[0])return {duplicate:true};

    let paymentAttemptId:string|null=null;
    if(args.providerPaymentId){
      const attempt=await client.query<{id:string;order_id:string}>(
        `SELECT id,order_id FROM payment_attempts
         WHERE provider='stripe' AND provider_payment_id=$1
         LIMIT 1`,
        [args.providerPaymentId],
      );
      if(attempt.rows[0]){
        paymentAttemptId=attempt.rows[0].id;
        await client.query(
          `UPDATE payment_events
           SET payment_attempt_id=$2,
               order_id=COALESCE(order_id,$3)
           WHERE provider_event_id=$1 AND provider='stripe'`,
          [args.eventId,paymentAttemptId,attempt.rows[0].order_id],
        );
      }
    }

    return {duplicate:false,paymentAttemptId};
  });
}

export async function updatePaymentAttemptStatus(args:{
  providerPaymentId:string;
  status:"REQUIRES_ACTION"|"PROCESSING"|"SUCCEEDED"|"FAILED"|"CANCELLED";
  paymentMethodType?:string;
  lastError?:string;
}){
  await query(
    `UPDATE payment_attempts
     SET status=$2,
         payment_method_type=COALESCE($3,payment_method_type),
         last_error=$4,
         updated_at=now()
     WHERE provider='stripe' AND provider_payment_id=$1`,
    [
      args.providerPaymentId,
      args.status,
      args.paymentMethodType??null,
      args.lastError??null,
    ],
  );
}

export async function markOrderPaidFromPayment(args:{
  orderId:string;
  providerPaymentId:string;
  paymentMethodType?:string;
}){
  await updatePaymentAttemptStatus({
    providerPaymentId:args.providerPaymentId,
    status:"SUCCEEDED",
    paymentMethodType:args.paymentMethodType,
  });
  await markOrderPaidAndAllocate({
    orderId:args.orderId,
    actorId:args.providerPaymentId,
  });
}


export async function failOrCancelPayment(args:{
  orderId:string;
  providerPaymentId:string;
  status:"FAILED"|"CANCELLED";
  lastError?:string;
}){
  await updatePaymentAttemptStatus({
    providerPaymentId:args.providerPaymentId,
    status:args.status,
    lastError:args.lastError,
  });

  await releaseOrderReservations(
    args.orderId,
    args.status==="FAILED"?"payment failed":"payment cancelled",
  );

  try{
    await transitionOrder({
      orderId:args.orderId,
      to:"CANCELLED",
      actorType:"PAYMENT",
      actorId:args.providerPaymentId,
    });
  }catch{
    // Ignore if the order already moved beyond a cancellable state.
  }
}
