import { products } from "@/lib/catalog";
import type { AdminOverview, InventoryPosition } from "@/lib/commerce/domain";

export const previewInventory: InventoryPosition[] = products.flatMap((product, productIndex) =>
  product.sizes.map((size, sizeIndex) => ({
    variantId: `${product.slug}-${size.toLowerCase()}`,
    locationId: "nyc-main",
    onHand: 18 + productIndex * 7 + sizeIndex * 3,
    reserved: sizeIndex % 3,
  })),
);

export function getAdminOverview(): AdminOverview {
  return {
    products: products.length,
    activeVariants: previewInventory.length,
    unitsOnHand: previewInventory.reduce((sum, row) => sum + row.onHand, 0),
    unitsReserved: previewInventory.reduce((sum, row) => sum + row.reserved, 0),
    openOrders: 0,
    scheduledDrops: 1,
  };
}
