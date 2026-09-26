import { query, withTransaction } from "@/lib/db";
import type { OrderStatus } from "@/lib/commerce/domain";
import { assertOrderTransition } from "@/lib/commerce/orders";

function makeOrderNumber() {
  const stamp=Date.now().toString(36).toUpperCase();
  const random=Math.random().toString(36).slice(2,6).toUpperCase();
  return `TW-${stamp}-${random}`;
}

export async function createPendingOrderFromCart(args:{
  cartId:string;
  email:string;
  customerId?:string;
  marketCode?:string;
  shippingAddress?:Record<string,unknown>;
}){
  return withTransaction(async client=>{
    const cart=await client.query<{id:string;currency:string;status:string}>(
      "SELECT id,currency,status FROM carts WHERE id=$1 FOR UPDATE",
      [args.cartId],
    );
    if(!cart.rows[0]||cart.rows[0].status!=="ACTIVE")throw new Error("Cart is not active.");

    const lines=await client.query<{
      variant_id:string;
      product_id:string;
      quantity:number;
      unit_price_amount:string;
      currency:string;
      sku:string;
      title:string;
    }>(
      `SELECT cl.variant_id,p.id AS product_id,cl.quantity,cl.unit_price_amount,cl.currency,
              v.sku,p.name || ' / ' || v.size AS title
       FROM cart_lines cl
       JOIN variants v ON v.id=cl.variant_id
       JOIN products p ON p.id=v.product_id
       WHERE cl.cart_id=$1
       FOR UPDATE OF cl`,
      [args.cartId],
    );
    if(!lines.rows.length)throw new Error("Cart is empty.");

    const reservations=await client.query<{
      id:string;variant_id:string;location_id:string;quantity:number;expires_at:Date;
    }>(
      `SELECT id,variant_id,location_id,quantity,expires_at
       FROM inventory_reservations
       WHERE cart_id=$1 AND status='ACTIVE'
       FOR UPDATE`,
      [args.cartId],
    );

    if(reservations.rows.some(row=>row.expires_at.getTime()<=Date.now())){
      throw new Error("Cart reservation expired.");
    }

    for(const line of lines.rows){
      const reserved=reservations.rows
        .filter(row=>row.variant_id===line.variant_id)
        .reduce((sum,row)=>sum+row.quantity,0);
      if(reserved<line.quantity)throw new Error("Cart is not fully reserved.");
    }

    const dropByVariant=new Map<string,string>();
    const normalizedEmail=args.email.trim().toLowerCase();

    for(const line of lines.rows){
      const activeDrop=await client.query<{
        drop_id:string;
        limit_value:number;
      }>(
        `SELECT d.id AS drop_id,
                COALESCE(dp.max_per_customer,d.per_variant_limit) AS limit_value
         FROM drop_products dp
         JOIN drops d ON d.id=dp.drop_id
         WHERE dp.product_id=$1
           AND d.status IN ('SCHEDULED','LIVE')
           AND (d.closes_at IS NULL OR d.closes_at>now())
         ORDER BY CASE d.status WHEN 'LIVE' THEN 0 ELSE 1 END,
                  COALESCE(d.opens_at,d.created_at) DESC
         LIMIT 1`,
        [line.product_id],
      );

      const gate=activeDrop.rows[0];
      if(!gate)continue;

      const lockKey=(args.customerId??"guest")+":"+normalizedEmail+":"+gate.drop_id+":"+line.variant_id;
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[lockKey]);

      const prior=await client.query<{quantity:string}>(
        `SELECT COALESCE(sum(ol.quantity),0)::text AS quantity
         FROM order_lines ol
         JOIN orders o ON o.id=ol.order_id
         WHERE ol.drop_id=$1
           AND ol.variant_id=$2
           AND o.status NOT IN ('CANCELLED','REFUNDED')
           AND (
             ($3::uuid IS NOT NULL AND o.customer_id=$3::uuid)
             OR lower(o.email)=lower($4)
           )`,
        [gate.drop_id,line.variant_id,args.customerId??null,normalizedEmail],
      );
      const already=Number(prior.rows[0]?.quantity??0);
      if(already+line.quantity>gate.limit_value){
        throw new Error(`Release limit exceeded for ${line.title}. Maximum ${gate.limit_value} per customer.`);
      }

      dropByVariant.set(line.variant_id,gate.drop_id);
    }

    const subtotal=lines.rows.reduce(
      (sum,line)=>sum+Number(line.unit_price_amount)*line.quantity,0
    );
    const orderNumber=makeOrderNumber();

    const order=await client.query<{id:string}>(
      `INSERT INTO orders
       (order_number,customer_id,cart_id,email,status,currency,
        subtotal_amount,grand_total_amount,shipping_address,market_code)
       VALUES($1,$2,$3,$4,'PENDING_PAYMENT',$5,$6,$6,$7::jsonb,$8)
       RETURNING id`,
      [
        orderNumber,
        args.customerId??null,
        args.cartId,
        args.email.trim().toLowerCase(),
        cart.rows[0].currency,
        subtotal,
        JSON.stringify(args.shippingAddress??null),
        args.marketCode??null,
      ],
    );
    const orderId=order.rows[0].id;

    for(const line of lines.rows){
      await client.query(
        `INSERT INTO order_lines
         (order_id,variant_id,drop_id,sku,title,quantity,unit_price_amount,total_amount,currency)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          orderId,
          line.variant_id,
          dropByVariant.get(line.variant_id)??null,
          line.sku,
          line.title,
          line.quantity,
          Number(line.unit_price_amount),
          Number(line.unit_price_amount)*line.quantity,
          line.currency,
        ],
      );
    }

    await client.query(
      `UPDATE inventory_reservations
       SET order_id=$2,
           expires_at=GREATEST(expires_at,now()+interval '15 minutes'),
           updated_at=now()
       WHERE cart_id=$1 AND status='ACTIVE'`,
      [args.cartId,orderId],
    );

    await client.query(
      "UPDATE carts SET status='CONVERTED',updated_at=now() WHERE id=$1",
      [args.cartId],
    );
    await client.query(
      `INSERT INTO order_events
       (order_id,event_type,from_status,to_status,actor_type)
       VALUES($1,'ORDER_CREATED','DRAFT','PENDING_PAYMENT','SYSTEM')`,
      [orderId],
    );

    return {id:orderId,number:orderNumber,status:"PENDING_PAYMENT" as const,subtotal};
  });
}

export async function transitionOrder(args:{
  orderId:string;
  to:OrderStatus;
  actorType?:"SYSTEM"|"ADMIN"|"PAYMENT";
  actorId?:string;
}){
  return withTransaction(async client=>{
    const current=await client.query<{status:OrderStatus}>(
      "SELECT status FROM orders WHERE id=$1 FOR UPDATE",
      [args.orderId],
    );
    if(!current.rows[0])throw new Error("Order not found.");
    const from=current.rows[0].status;
    if(from===args.to)return {from,to:args.to};
    assertOrderTransition(from,args.to);

    await client.query(
      `UPDATE orders
       SET status=$2,
           placed_at=CASE WHEN $2='PAID' AND placed_at IS NULL THEN now() ELSE placed_at END,
           updated_at=now()
       WHERE id=$1`,
      [args.orderId,args.to],
    );
    await client.query(
      `INSERT INTO order_events
       (order_id,event_type,from_status,to_status,actor_type,actor_id)
       VALUES($1,'STATUS_CHANGED',$2,$3,$4,$5)`,
      [args.orderId,from,args.to,args.actorType??"SYSTEM",args.actorId??null],
    );
    return {from,to:args.to};
  });
}

export async function markOrderPaidAndAllocate(args:{
  orderId:string;
  actorId:string;
}){
  return withTransaction(async client=>{
    const order=await client.query<{status:OrderStatus;customer_id:string|null}>(
      "SELECT status,customer_id FROM orders WHERE id=$1 FOR UPDATE",
      [args.orderId],
    );
    if(!order.rows[0])throw new Error("Order not found.");
    if(order.rows[0].status==="ALLOCATED"||order.rows[0].status==="FULFILLING"||order.rows[0].status==="FULFILLED"){
      return {status:order.rows[0].status};
    }
    if(order.rows[0].status!=="PENDING_PAYMENT"&&order.rows[0].status!=="PAID"){
      throw new Error("Order cannot be allocated from its current status.");
    }

    const reservations=await client.query<{
      id:string;variant_id:string;location_id:string;quantity:number;expires_at:Date;
    }>(
      `SELECT id,variant_id,location_id,quantity,expires_at
       FROM inventory_reservations
       WHERE order_id=$1 AND status='ACTIVE'
       FOR UPDATE`,
      [args.orderId],
    );
    if(!reservations.rows.length)throw new Error("No active reservations found for order.");

    for(const reservation of reservations.rows){
      await client.query(
        `SELECT 1 FROM inventory_levels
         WHERE variant_id=$1 AND location_id=$2
         FOR UPDATE`,
        [reservation.variant_id,reservation.location_id],
      );
    }

    for(const reservation of reservations.rows){
      await client.query(
        `UPDATE inventory_levels
         SET on_hand=on_hand-$3,
             reserved=GREATEST(0,reserved-$3),
             updated_at=now()
         WHERE variant_id=$1 AND location_id=$2`,
        [reservation.variant_id,reservation.location_id,reservation.quantity],
      );
      await client.query(
        `UPDATE inventory_reservations
         SET status='CONSUMED',updated_at=now()
         WHERE id=$1`,
        [reservation.id],
      );
      await client.query(
        `INSERT INTO inventory_events
         (variant_id,location_id,event_type,quantity_delta,reservation_id,order_id,actor_type,actor_id)
         VALUES($1,$2,'CONSUME',$3,$4,$5,'PAYMENT',$6)`,
        [
          reservation.variant_id,
          reservation.location_id,
          -reservation.quantity,
          reservation.id,
          args.orderId,
          args.actorId,
        ],
      );
    }

    const from=order.rows[0].status;
    if(from==="PENDING_PAYMENT"){
      await client.query(
        "UPDATE orders SET status='PAID',placed_at=COALESCE(placed_at,now()),updated_at=now() WHERE id=$1",
        [args.orderId],
      );
      await client.query(
        `INSERT INTO order_events
         (order_id,event_type,from_status,to_status,actor_type,actor_id)
         VALUES($1,'STATUS_CHANGED','PENDING_PAYMENT','PAID','PAYMENT',$2)`,
        [args.orderId,args.actorId],
      );
    }

    await client.query(
      "UPDATE orders SET status='ALLOCATED',updated_at=now() WHERE id=$1",
      [args.orderId],
    );
    await client.query(
      `INSERT INTO order_events
       (order_id,event_type,from_status,to_status,actor_type,actor_id)
       VALUES($1,'INVENTORY_ALLOCATED','PAID','ALLOCATED','PAYMENT',$2)`,
      [args.orderId,args.actorId],
    );

    if(order.rows[0].customer_id){
      await client.query(
        `INSERT INTO passport_profiles(customer_id,tier)
         VALUES($1,'MEMBER')
         ON CONFLICT(customer_id) DO NOTHING`,
        [order.rows[0].customer_id],
      );
      await client.query(
        `INSERT INTO passport_world_stamps(customer_id,world_id,source)
         SELECT DISTINCT $2,p.world_id,'ORDER'
         FROM order_lines ol
         JOIN variants v ON v.id=ol.variant_id
         JOIN products p ON p.id=v.product_id
         WHERE ol.order_id=$1 AND p.world_id IS NOT NULL
         ON CONFLICT(customer_id,world_id) DO NOTHING`,
        [args.orderId,order.rows[0].customer_id],
      );
    }

    return {status:"ALLOCATED" as const};
  });
}

export async function releaseOrderReservations(orderId:string,reason:string){
  return withTransaction(async client=>{
    const reservations=await client.query<{
      id:string;variant_id:string;location_id:string;quantity:number;
    }>(
      `SELECT id,variant_id,location_id,quantity
       FROM inventory_reservations
       WHERE order_id=$1 AND status='ACTIVE'
       FOR UPDATE`,
      [orderId],
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
      await client.query(
        `INSERT INTO inventory_events
         (variant_id,location_id,event_type,quantity_delta,reservation_id,order_id,note)
         VALUES($1,$2,'RELEASE',$3,$4,$5,$6)`,
        [
          reservation.variant_id,
          reservation.location_id,
          -reservation.quantity,
          reservation.id,
          orderId,
          reason,
        ],
      );
    }
    return {released:reservations.rows.length};
  });
}

export async function listOrders(limit=100){
  const result=await query<{
    id:string;order_number:string;email:string;status:OrderStatus;
    currency:string;grand_total_amount:string;created_at:Date;
  }>(
    `SELECT id,order_number,email,status,currency,grand_total_amount,created_at
     FROM orders ORDER BY created_at DESC LIMIT $1`,
    [Math.min(Math.max(limit,1),250)],
  );
  return result.rows.map(row=>({
    id:row.id,
    number:row.order_number,
    email:row.email,
    status:row.status,
    currency:row.currency,
    grandTotalAmount:Number(row.grand_total_amount),
    createdAt:row.created_at.toISOString(),
  }));
}
