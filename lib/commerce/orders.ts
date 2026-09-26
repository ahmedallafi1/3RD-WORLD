import type { OrderStatus } from "@/lib/commerce/domain";

const allowedTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["ALLOCATED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
  ALLOCATED: ["FULFILLING", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
  FULFILLING: ["FULFILLED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"],
  FULFILLED: ["REFUNDED", "PARTIALLY_REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED"],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return allowedTransitions[from].includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`Invalid order transition: ${from} → ${to}`);
  }
}

export function orderStatusLabel(status: OrderStatus) {
  return status.replaceAll("_", " ");
}
