import { products } from "@/lib/catalog";
import { isDatabaseConfigured, query } from "@/lib/db";
import type { AdminOverview, InventoryPosition } from "@/lib/commerce/domain";

export const previewInventory: InventoryPosition[] = products.flatMap((product, productIndex) =>
  product.sizes.map((size, sizeIndex) => ({
    variantId: `${product.slug}-${size.toLowerCase()}`,
    locationId: "nyc-main",
    onHand: 18 + productIndex * 7 + sizeIndex * 3,
    reserved: sizeIndex % 3,
  })),
);

export async function getAdminOverview(): Promise<AdminOverview> {
  if (!isDatabaseConfigured()) {
    return {
      products: products.length,
      activeVariants: previewInventory.length,
      unitsOnHand: previewInventory.reduce((sum, row) => sum + row.onHand, 0),
      unitsReserved: previewInventory.reduce((sum, row) => sum + row.reserved, 0),
      openOrders: 0,
      scheduledDrops: 1,
    };
  }

  const result = await query<{
    products: string;
    variants: string;
    on_hand: string;
    reserved: string;
    open_orders: string;
    scheduled_drops: string;
  }>(
    `SELECT
       (SELECT count(*) FROM products WHERE status <> 'ARCHIVED')::text AS products,
       (SELECT count(*) FROM variants WHERE active = true)::text AS variants,
       (SELECT COALESCE(sum(on_hand),0) FROM inventory_levels)::text AS on_hand,
       (SELECT COALESCE(sum(reserved),0) FROM inventory_levels)::text AS reserved,
       (SELECT count(*) FROM orders WHERE status NOT IN ('FULFILLED','CANCELLED','REFUNDED'))::text AS open_orders,
       (SELECT count(*) FROM drops WHERE status = 'SCHEDULED')::text AS scheduled_drops`,
  );
  const row = result.rows[0];

  return {
    products: Number(row.products),
    activeVariants: Number(row.variants),
    unitsOnHand: Number(row.on_hand),
    unitsReserved: Number(row.reserved),
    openOrders: Number(row.open_orders),
    scheduledDrops: Number(row.scheduled_drops),
  };
}

export async function listInventoryRows() {
  if (!isDatabaseConfigured()) {
    return previewInventory.map((row) => ({
      sku: row.variantId.toUpperCase(),
      location: row.locationId.toUpperCase(),
      onHand: row.onHand,
      reserved: row.reserved,
      available: row.onHand - row.reserved,
    }));
  }

  const result = await query<{
    sku: string;
    location: string;
    on_hand: number;
    reserved: number;
  }>(
    `SELECT v.sku, l.code AS location, i.on_hand, i.reserved
     FROM inventory_levels i
     JOIN variants v ON v.id = i.variant_id
     JOIN locations l ON l.id = i.location_id
     ORDER BY v.sku, l.code`,
  );

  return result.rows.map((row) => ({
    sku: row.sku,
    location: row.location,
    onHand: row.on_hand,
    reserved: row.reserved,
    available: row.on_hand - row.reserved,
  }));
}

export async function listDrops() {
  if (!isDatabaseConfigured()) {
    return [{
      id: "preview",
      world: "WORLD 002",
      name: "DROP 002",
      access: "EMAIL / CODE",
      status: "SCHEDULED",
      opensAt: process.env.NEXT_PUBLIC_DROP_OPENS_AT ?? null,
    }];
  }

  const result = await query<{
    id:string;world:string;name:string;access_mode:string;status:string;opens_at:Date|null;
  }>(
    `SELECT d.id,w.code AS world,d.name,d.access_mode,d.status,d.opens_at
     FROM drops d
     JOIN worlds w ON w.id=d.world_id
     ORDER BY COALESCE(d.opens_at,d.created_at) DESC`,
  );

  return result.rows.map(row=>({
    id:row.id,
    world:row.world,
    name:row.name,
    access:row.access_mode,
    status:row.status,
    opensAt:row.opens_at?.toISOString()??null,
  }));
}
