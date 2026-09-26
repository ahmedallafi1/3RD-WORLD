import { query } from "@/lib/db";
import { createStripeTaxTransaction } from "@/lib/tax/stripe-tax";

export async function finalizeOrderTax(orderId:string){
  const result=await query<{
    quote_id:string;
    tax_provider:string|null;
    tax_provider_ref:string|null;
    tax_transaction_ref:string|null;
    order_number:string;
  }>(
    `SELECT q.id AS quote_id,q.tax_provider,q.tax_provider_ref,q.tax_transaction_ref,
            o.order_number
     FROM checkout_quotes q
     JOIN orders o ON o.id=q.order_id
     WHERE q.order_id=$1
     ORDER BY q.created_at DESC
     LIMIT 1`,
    [orderId],
  );
  const row=result.rows[0];
  if(!row||row.tax_transaction_ref)return row?.tax_transaction_ref??null;
  if(row.tax_provider!=="stripe_tax"||!row.tax_provider_ref)return null;

  const transactionId=await createStripeTaxTransaction({
    calculationId:row.tax_provider_ref,
    reference:row.order_number,
  });

  await query(
    `UPDATE checkout_quotes
     SET tax_transaction_ref=$2
     WHERE id=$1 AND tax_transaction_ref IS NULL`,
    [row.quote_id,transactionId],
  );

  return transactionId;
}
