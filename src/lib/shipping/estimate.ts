import type { Serviceability } from "./options";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function deliveryBy(eta: string, now = new Date()) {
  const text = eta.trim();
  const range = text.match(/(\d+)\s*(?:-|–|to)\s*(\d+)/i);
  const single = text.match(/(\d+)/);
  const parsed = range ? Number(range[2]) : single ? Number(single[1]) : 5;
  const days = Number.isInteger(parsed) && parsed >= 1 && parsed <= 30 ? parsed : 5;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return {
    by: `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`,
    estimate: text || "5 days",
  };
}

/** Single TAT day → short customer range (4 → "3–4 days", 1 → "1–2 days"). */
export function formatDayRange(tatDays: number) {
  const days = Number.isFinite(tatDays) ? Math.max(1, Math.round(tatDays)) : 1;
  if (days === 1) return "1–2 days";
  return `${days - 1}–${days} days`;
}

/** Keep existing ranges; turn lone "N day(s)" into a range. */
export function toDeliveryRange(eta: string) {
  const text = eta.trim();
  if (!text) return text;
  if (/(\d+)\s*(?:-|–|to)\s*(\d+)/i.test(text)) return text.replace(/\s*-\s*/g, "–").replace(/\s*to\s*/gi, "–");
  const single = text.match(/^(\d+)\s*days?$/i);
  if (!single) return text;
  return formatDayRange(Number(single[1]));
}

export function formatTransit(tatDays: number, expectedDeliveryDate: string | null, now = new Date()) {
  const days = Number.isFinite(tatDays) && tatDays >= 1 ? Math.round(tatDays) : 1;
  const estimate = formatDayRange(days);
  if (expectedDeliveryDate && /^\d{4}-\d{2}-\d{2}$/.test(expectedDeliveryDate)) {
    const [year, month, day] = expectedDeliveryDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return { by: `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`, estimate, estimateSource: "delhivery_tat" as const };
  }
  const computed = deliveryBy(estimate, now);
  return { by: computed.by, estimate, estimateSource: "delhivery_tat" as const };
}

export function unavailablePinMessage(pin: string, next: "address" | "pin" = "pin") {
  const where = /^\d{6}$/.test(pin) ? `PIN ${pin}` : "this PIN";
  const action = next === "address" ? "Choose a different address to see shipping options." : "Try another PIN.";
  return `We can't deliver to ${where}. ${action}`;
}

export function describePin(status: Serviceability["status"], pin = "") {
  if (status === "available") {
    return { available: true, label: "Serviceable", message: /^\d{6}$/.test(pin) ? `Delivery is available for PIN ${pin}.` : "Delivery is available for this PIN." };
  }
  if (status === "not_configured") {
    return { available: true, label: "Delivery", message: "Delivery is available for this PIN." };
  }
  if (status === "unavailable") return { available: false, label: "Not serviceable", message: unavailablePinMessage(pin) };
  if (status === "invalid_pin") return { available: false, label: "Unable to verify", message: "Enter a 6-digit PIN." };
  return { available: false, label: "Unable to verify", message: "Delivery availability could not be checked. Try again." };
}
