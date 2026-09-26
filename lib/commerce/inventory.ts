import type {
  InventoryPosition,
  InventoryReservation,
  ReservationStatus,
} from "@/lib/commerce/domain";

export class InventoryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INSUFFICIENT_STOCK"
      | "INVALID_QUANTITY"
      | "RESERVATION_NOT_ACTIVE",
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

export function availableToSell(position: InventoryPosition) {
  return Math.max(0, position.onHand - position.reserved);
}

export function reserveInventory(args: {
  position: InventoryPosition;
  cartId: string;
  quantity: number;
  ttlSeconds?: number;
  now?: Date;
}): { position: InventoryPosition; reservation: InventoryReservation } {
  const { position, cartId, quantity } = args;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new InventoryError("Quantity must be a positive integer.", "INVALID_QUANTITY");
  }

  if (availableToSell(position) < quantity) {
    throw new InventoryError("Not enough inventory available.", "INSUFFICIENT_STOCK");
  }

  const now = args.now ?? new Date();
  const ttlSeconds = args.ttlSeconds ?? 8 * 60;
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  return {
    position: {
      ...position,
      reserved: position.reserved + quantity,
    },
    reservation: {
      id: crypto.randomUUID(),
      cartId,
      variantId: position.variantId,
      locationId: position.locationId,
      quantity,
      status: "ACTIVE",
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    },
  };
}

export function releaseReservation(args: {
  position: InventoryPosition;
  reservation: InventoryReservation;
  status?: Extract<ReservationStatus, "RELEASED" | "EXPIRED">;
}): { position: InventoryPosition; reservation: InventoryReservation } {
  const { position, reservation } = args;
  if (reservation.status !== "ACTIVE") {
    throw new InventoryError("Reservation is not active.", "RESERVATION_NOT_ACTIVE");
  }

  return {
    position: {
      ...position,
      reserved: Math.max(0, position.reserved - reservation.quantity),
    },
    reservation: {
      ...reservation,
      status: args.status ?? "RELEASED",
    },
  };
}

export function consumeReservation(args: {
  position: InventoryPosition;
  reservation: InventoryReservation;
}): { position: InventoryPosition; reservation: InventoryReservation } {
  const { position, reservation } = args;
  if (reservation.status !== "ACTIVE") {
    throw new InventoryError("Reservation is not active.", "RESERVATION_NOT_ACTIVE");
  }

  return {
    position: {
      ...position,
      onHand: Math.max(0, position.onHand - reservation.quantity),
      reserved: Math.max(0, position.reserved - reservation.quantity),
    },
    reservation: {
      ...reservation,
      status: "CONSUMED",
    },
  };
}
