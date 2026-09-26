export type CurrencyCode = "USD" | "CAD" | "GBP" | "EUR" | "AED" | "AUD" | "JPY" | "SGD";

export type Money = {
  amount: number; // integer minor units, e.g. 14500 = $145.00
  currency: CurrencyCode;
};

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type DropStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "CLOSED" | "ARCHIVED";
export type ReservationStatus = "ACTIVE" | "RELEASED" | "CONSUMED" | "EXPIRED";
export type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "ALLOCATED"
  | "FULFILLING"
  | "FULFILLED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type Address = {
  id: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
};

export type Variant = {
  id: string;
  productId: string;
  sku: string;
  title: string;
  size: string;
  color: string;
  price: Money;
  compareAt?: Money;
  weightGrams?: number;
  hsCode?: string;
  countryOfOrigin?: string;
  active: boolean;
};

export type CommerceProduct = {
  id: string;
  slug: string;
  name: string;
  worldId: string;
  category: string;
  description: string;
  status: ProductStatus;
  variants: Variant[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryPosition = {
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
};

export type InventoryReservation = {
  id: string;
  cartId: string;
  variantId: string;
  locationId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
};

export type OrderLine = {
  id: string;
  orderId: string;
  variantId: string;
  sku: string;
  title: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
};

export type Order = {
  id: string;
  number: string;
  customerId?: string;
  email: string;
  status: OrderStatus;
  currency: CurrencyCode;
  subtotal: Money;
  discountTotal: Money;
  shippingTotal: Money;
  taxTotal: Money;
  dutyTotal: Money;
  grandTotal: Money;
  lines: OrderLine[];
  shippingAddress?: Address;
  createdAt: string;
  updatedAt: string;
};

export type AdminOverview = {
  products: number;
  activeVariants: number;
  unitsOnHand: number;
  unitsReserved: number;
  openOrders: number;
  scheduledDrops: number;
};
