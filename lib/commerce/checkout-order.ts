import { query } from "@/lib/db";
import type { CheckoutQuote } from "@/lib/commerce/checkout-quotes";

export async function applyCheckoutQuoteToOrder(orderId:string,quote:CheckoutQuote){
  await query(
    `UPDATE orders
     SET market_code=$2,
         currency=$3,
         subtotal_amount=$4,
         discount_amount=$5,
         shipping_amount=$6,
         tax_amount=$7,
         duty_amount=$8,
         grand_total_amount=$9,
         updated_at=now()
     WHERE id=$1 AND status='PENDING_PAYMENT'`,
    [
      orderId,
      quote.marketCode,
      quote.currency,
      quote.subtotalAmount,
      quote.discountAmount,
      quote.shippingAmount,
      quote.taxAmount,
      quote.dutyAmount,
      quote.totalAmount,
    ],
  );

  await query(
    `UPDATE checkout_quotes SET order_id=$2 WHERE id=$1`,
    [quote.id,orderId],
  );
}
