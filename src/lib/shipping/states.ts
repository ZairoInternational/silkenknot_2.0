import type { ShipmentState, TrackingEvent } from "@/lib/types";

const rank: Record<ShipmentState, number> = {
  not_created: 0,
  pending: 1,
  unknown: 1,
  exception: 1,
  booked: 2,
  pickup_scheduled: 3,
  picked_up: 4,
  in_transit: 5,
  delivery_failed: 6,
  out_for_delivery: 6,
  rto_initiated: 7,
  return_initiated: 7,
  rto_in_transit: 8,
  cancelled: 9,
  delivered: 10,
  rto_delivered: 10,
  returned: 10,
};

const terminal: ShipmentState[] = ["delivered", "cancelled", "rto_delivered", "returned"];

export function normalizeDelhiveryStatus(status: string): ShipmentState | null {
  const value = status.trim().toLowerCase().replace(/[_]+/g, " ");
  if (!value) return null;
  if (value === "manifested" || value === "scheduled") return "booked";
  if (value === "not picked" || value === "pickup scheduled") return "pickup_scheduled";
  if (value === "picked up") return "picked_up";
  if (value === "in transit" || value === "pending") return "in_transit";
  if (value === "dispatched" || value === "out for delivery") return "out_for_delivery";
  if (value === "delivered") return "delivered";
  if (value === "dto" || value === "rto") return "rto_initiated";
  if (value.includes("rto") && value.includes("transit")) return "rto_in_transit";
  if (value.includes("rto") && value.includes("deliver")) return "rto_delivered";
  if (value === "canceled" || value === "cancelled") return "cancelled";
  if (value === "lost" || value === "undelivered") return value === "lost" ? "exception" : "delivery_failed";
  return null;
}

export function shipmentTransition(from: ShipmentState, to: ShipmentState, at: string, lastAt?: string) {
  if (from === to) return true;
  if (lastAt && at < lastAt && terminal.includes(from)) return false;
  if (lastAt && at < lastAt && rank[to] < rank[from]) return false;
  if (terminal.includes(from) && from !== to) return false;
  if (to === "cancelled" && rank[from] >= rank.picked_up && from !== "exception" && from !== "unknown") return false;
  return rank[to] >= rank[from] || to === "delivery_failed" || to === "exception" || to === "rto_initiated" || to === "cancelled";
}

export function applyTracking(events: TrackingEvent[], state: ShipmentState, incoming: TrackingEvent) {
  const duplicate = events.some((event) => event.at === incoming.at && event.providerStatus === incoming.providerStatus && event.location === incoming.location);
  if (duplicate) return { state, events, accepted: false as const };
  const next = incoming.state === "unknown" ? state : shipmentTransition(state, incoming.state, incoming.at, events.at(-1)?.at) ? incoming.state : state;
  return { state: next, events: [...events, { ...incoming, state: next }], accepted: true as const };
}

export function canCancelShipment(state: ShipmentState) {
  return ["not_created", "pending", "booked", "pickup_scheduled", "unknown", "exception"].includes(state);
}

export function canRequestReturn(state: ShipmentState, deliveredAt: string | undefined, now: string, windowDays: number) {
  if (state !== "delivered" || !deliveredAt) return false;
  const end = new Date(deliveredAt).getTime() + windowDays * 24 * 60 * 60 * 1000;
  return new Date(now).getTime() <= end;
}

export function waybillProgress(state?: ShipmentState): { index: number; badge: string; alert: boolean } {
  if (state === "delivered") return { index: 3, badge: "Delivered", alert: false };
  if (state === "out_for_delivery") return { index: 2, badge: "On the way", alert: false };
  if (state === "delivery_failed") return { index: 2, badge: "Delivery attempted", alert: true };
  if (state === "picked_up" || state === "in_transit") return { index: 2, badge: "Shipped", alert: false };
  if (state === "rto_initiated" || state === "rto_in_transit" || state === "rto_delivered" || state === "return_initiated" || state === "returned") {
    return { index: 2, badge: "Returning", alert: true };
  }
  if (state === "cancelled") return { index: -1, badge: "Cancelled", alert: true };
  if (state === "exception" || state === "unknown") return { index: 1, badge: "Needs attention", alert: true };
  if (state === "booked" || state === "pickup_scheduled" || state === "pending") return { index: 1, badge: "Processing", alert: false };
  return { index: 0, badge: "Confirmed", alert: false };
}

export function waybillListLabel(state?: ShipmentState) {
  if (state === "exception" || state === "unknown") return "Shipment needs attention";
  if (state === "out_for_delivery") return "Out for delivery";
  if (state === "delivery_failed") return "Delivery attempted";
  if (state === "in_transit" || state === "picked_up") return "In transit";
  if (state === "delivered") return "Delivered";
  if (state === "pickup_scheduled") return "Pickup scheduled";
  if (state === "booked" || state === "pending") return "Processing";
  if (state === "cancelled") return "Cancelled";
  if (state === "rto_initiated" || state === "rto_in_transit" || state === "rto_delivered" || state === "return_initiated" || state === "returned") return "Returning";
  return "Confirmed";
}

export function customerOrderVisible(order: { paymentState?: string; payment?: string; orderState?: string }) {
  if (!order.paymentState) return true;
  if (["captured", "refund_pending", "partially_refunded", "refunded"].includes(order.paymentState)) return true;
  return order.payment === "cod" && order.orderState === "confirmed";
}
