import { query, withTransaction } from "@/lib/db";
import { createCart, setCartLineQuantity } from "@/lib/commerce/repositories/carts";
import { createPendingOrderFromCart } from "@/lib/commerce/repositories/orders-db";
import { quoteCheckout } from "@/lib/commerce/checkout-quotes";
import { applyCheckoutQuoteToOrder } from "@/lib/commerce/checkout-order";

export type CheckoutLineInput={
  slug:string;
  size:string;
  quantity:number;
};

export async function prepareCheckout(args:{
  email:string;
  countryCode:string;
  lines:CheckoutLineInput[];
  customerId?:string;
  shippingAddress?:Record<string,unknown>;
}){
  if(!args.lines.length)throw new Error("Checkout requires at least one item.");

  const location=await query<{id:string}>(
    "SELECT id FROM locations WHERE code='nyc-main' AND active=true LIMIT 1",
  );
  if(!location.rows[0])throw new Error("Fulfillment location is not configured.");
  const locationId=location.rows[0].id;

  const resolved:Array<{variantId:string;quantity:number}>=[];
  for(const line of args.lines){
    if(!Number.isInteger(line.quantity)||line.quantity<=0)throw new Error("Invalid quantity.");
    const variant=await query<{id:string}>(
      `SELECT v.id
       FROM variants v
       JOIN products p ON p.id=v.product_id
       WHERE p.slug=$1
         AND upper(v.size)=upper($2)
         AND p.status='ACTIVE'
         AND v.active=true
       LIMIT 1`,
      [line.slug,line.size],
    );
    if(!variant.rows[0])throw new Error(`Unavailable item: ${line.slug} / ${line.size}`);
    resolved.push({variantId:variant.rows[0].id,quantity:line.quantity});
  }

  const cart=await createCart({
    email:args.email,
    customerId:args.customerId,
    currency:"USD",
  });

  try{
    for(const line of resolved){
      await setCartLineQuantity({
        cartId:cart.id,
        variantId:line.variantId,
        locationId,
        quantity:line.quantity,
        ttlSeconds:15*60,
      });
    }

    const quote=await quoteCheckout({
      cartId:cart.id,
      countryCode:args.countryCode,
    });

    const order=await createPendingOrderFromCart({
      cartId:cart.id,
      email:args.email,
      customerId:args.customerId,
      marketCode:quote.marketCode,
      shippingAddress:args.shippingAddress,
    });

    await applyCheckoutQuoteToOrder(order.id,quote);

    return {cartId:cart.id,order,quote};
  }catch(error){
    await withTransaction(async client=>{
      const reservations=await client.query<{id:string;variant_id:string;location_id:string;quantity:number}>(
        `SELECT id,variant_id,location_id,quantity
         FROM inventory_reservations
         WHERE cart_id=$1 AND status='ACTIVE'
         FOR UPDATE`,
        [cart.id],
      );
      for(const reservation of reservations.rows){
        await client.query(
          `SELECT 1 FROM inventory_levels
           WHERE variant_id=$1 AND location_id=$2
           FOR UPDATE`,
          [reservation.variant_id,reservation.location_id],
        );
        await client.query(
          `UPDATE inventory_levels
           SET reserved=GREATEST(0,reserved-$3),updated_at=now()
           WHERE variant_id=$1 AND location_id=$2`,
          [reservation.variant_id,reservation.location_id,reservation.quantity],
        );
        await client.query(
          "UPDATE inventory_reservations SET status='RELEASED',updated_at=now() WHERE id=$1",
          [reservation.id],
        );
      }
      await client.query(
        "UPDATE carts SET status='ABANDONED',updated_at=now() WHERE id=$1",
        [cart.id],
      );
    });
    throw error;
  }
}
