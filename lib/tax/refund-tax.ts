import {query} from "@/lib/db";
import {reverseStripeTaxTransaction} from "@/lib/tax/stripe-tax";

export async function reverseOrderTax(args:{
  orderId:string;
  refundId:string;
  refundAmount:number;
  full:boolean;
}){
  const result=await query<{
    tax_transaction_ref:string|null;
    order_number:string;
    tax_amount:string;
  }>(
    `SELECT q.tax_transaction_ref,o.order_number,o.tax_amount
     FROM checkout_quotes q
     JOIN orders o ON o.id=q.order_id
     WHERE q.order_id=$1
     ORDER BY q.created_at DESC
     LIMIT 1`,
    [args.orderId],
  );
  const row=result.rows[0];
  if(!row?.tax_transaction_ref)return null;

  return reverseStripeTaxTransaction({
    originalTransactionId:row.tax_transaction_ref,
    reference:`${row.order_number}-refund-${args.refundId}`,
    amount:args.refundAmount,
    full:args.full,
  });
}
