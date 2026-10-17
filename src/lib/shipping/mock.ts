import type { ShipmentState } from "@/lib/types";

export const MOCK_STEPS: { state: ShipmentState; providerStatus: string }[] = [
  { state: "booked", providerStatus: "Test · Shipment created" },
  { state: "pickup_scheduled", providerStatus: "Test · Pickup confirmed" },
  { state: "in_transit", providerStatus: "Test · In transit" },
  { state: "out_for_delivery", providerStatus: "Test · Out for delivery" },
  { state: "delivered", providerStatus: "Test · Delivered" },
];

export function nextMockStep(current: ShipmentState) {
  const index = MOCK_STEPS.findIndex((step) => step.state === current);
  if (index < 0) return MOCK_STEPS[0];
  return MOCK_STEPS[index + 1] || null;
}
