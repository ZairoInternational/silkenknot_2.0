import type { FulfillmentState, InventoryState, OrderLifecycle, PaymentState } from "../types";

const paymentEdges: Record<PaymentState, PaymentState[]> = {
  pending: ["authorized", "captured", "failed", "cancelled"],
  authorized: ["captured", "failed", "cancelled"],
  failed: ["captured"],
  cancelled: ["captured", "refund_pending"],
  captured: ["refund_pending", "partially_refunded", "refunded"],
  refund_pending: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
};

export function paymentTransition(from: PaymentState, to: PaymentState) {
  if (from === to) return true;
  return paymentEdges[from].includes(to);
}

export function canRelease(inventory: InventoryState, payment: PaymentState) {
  return inventory === "reserved" && (payment === "pending" || payment === "authorized" || payment === "failed" || payment === "cancelled");
}

export function fulfillmentTransition(from: FulfillmentState, to: FulfillmentState) {
  if (from === to) return true;
  const allowed: Record<FulfillmentState, FulfillmentState[]> = {
    unfulfilled: ["packed"],
    packed: ["shipped"],
    shipped: ["delivered", "delivery_failed", "return_to_origin"],
    delivered: [],
    delivery_failed: ["return_to_origin"],
    return_to_origin: [],
  };
  return allowed[from].includes(to);
}

export function orderIsPayable(orderState: OrderLifecycle, payment: PaymentState) {
  return orderState === "pending_payment" && (payment === "pending" || payment === "authorized");
}
