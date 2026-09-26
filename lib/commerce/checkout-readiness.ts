import { query } from "@/lib/db";

export type CheckoutMode="off"|"test"|"live";

export function checkoutMode():CheckoutMode{
  const value=(process.env.CHECKOUT_MODE??"off").toLowerCase();
  return value==="live"||value==="test"?value:"off";
}

export async function assertOrderCheckoutReady(orderId:string){
  const mode=checkoutMode();
  if(mode==="off")throw new Error("Checkout is not enabled.");

  const result=await query<{
    tax_status:string;
    duty_status:string;
    duties_mode:string;
  }>(
    `SELECT q.tax_status,q.duty_status,m.duties_mode
     FROM checkout_quotes q
     JOIN orders o ON o.id=q.order_id
     LEFT JOIN markets m ON m.code=q.market_code
     WHERE o.id=$1
     ORDER BY q.created_at DESC
     LIMIT 1`,
    [orderId],
  );
  const row=result.rows[0];
  if(!row)throw new Error("Checkout quote not found.");

  if(mode==="test")return;

  if(row.tax_status!=="FINAL"){
    throw new Error("Live checkout requires a finalized tax calculation.");
  }
  if(row.duties_mode==="CALCULATED_AT_CHECKOUT" && !["FINAL","ESTIMATED"].includes(row.duty_status)){
    throw new Error("Live checkout requires duties to be calculated for this market.");
  }
}
