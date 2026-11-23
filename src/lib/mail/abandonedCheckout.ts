import type { Db } from "mongodb";
import { normalizePhone } from "@/lib/auth/contact";
import { sendWhatsAppTemplate, whatsAppTemplateReady } from "@/lib/auth/deliver";
import { paymentLog } from "@/lib/payments/log";

const DEFAULT_REMINDER_MINUTES = 30;
const BATCH_LIMIT = 25;

export type AbandonedCandidate = {
  id: string;
  customerName?: string;
  phone?: string;
  paymentState?: string;
  createdAt?: string;
  whatsappMarketingConsent?: { optedIn?: boolean };
  notices?: { whatsappAbandonedAt?: string };
};

function firstName(name: string) {
  const clean = name.replace(/[\r\n\t]+/g, " ").trim().split(" ")[0];
  return clean || "there";
}

export function abandonedReminderEnabled() {
  const flag = process.env.ABANDONED_CHECKOUT_REMINDER_ENABLED?.trim();
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  // Enabled when template name is set and MSG91 is ready.
  return Boolean(process.env.MSG91_WHATSAPP_ABANDONED_TEMPLATE_NAME?.trim());
}

export function abandonedReminderDelayMs() {
  const raw = Number(process.env.ABANDONED_CHECKOUT_REMINDER_MINUTES);
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_REMINDER_MINUTES;
  return Math.round(minutes * 60 * 1000);
}

export function abandonedTemplateName() {
  return process.env.MSG91_WHATSAPP_ABANDONED_TEMPLATE_NAME?.trim() || "";
}

export function abandonedVariables(customerName: string) {
  return [firstName(customerName)];
}

/** Pure eligibility check used by the worker and unit tests. */
export function isAbandonedReminderDue(order: AbandonedCandidate, nowMs = Date.now(), delayMs = abandonedReminderDelayMs()) {
  if (order.whatsappMarketingConsent?.optedIn !== true) return false;
  if (order.notices?.whatsappAbandonedAt) return false;
  if (order.paymentState === "captured" || order.paymentState === "authorized") return false;
  if (!order.phone?.trim()) return false;
  if (!order.createdAt) return false;
  const created = Date.parse(order.createdAt);
  if (!Number.isFinite(created)) return false;
  return created <= nowMs - delayMs;
}

function whatsAppDestination(phone: string | undefined) {
  return normalizePhone(phone || "", "IN");
}

/**
 * Sends at most one abandoned-checkout WhatsApp per order.
 * Claim is kept on send failure so MSG91 flaps cannot spam the customer.
 */
export async function processAbandonedCheckoutReminders(db: Db) {
  if (!abandonedReminderEnabled()) return { scanned: 0, sent: 0, skipped: 0 };
  const template = abandonedTemplateName();
  if (!template || !whatsAppTemplateReady(template)) {
    paymentLog("abandoned_whatsapp_skipped", { reason: "unconfigured" });
    return { scanned: 0, sent: 0, skipped: 0 };
  }

  const delayMs = abandonedReminderDelayMs();
  const cutoff = new Date(Date.now() - delayMs).toISOString();
  const candidates = await db
    .collection<AbandonedCandidate>("orders")
    .find({
      "whatsappMarketingConsent.optedIn": true,
      "notices.whatsappAbandonedAt": { $exists: false },
      paymentState: { $nin: ["captured", "authorized"] },
      createdAt: { $lte: cutoff },
      phone: { $exists: true, $ne: "" },
    })
    .project({
      id: 1,
      customerName: 1,
      phone: 1,
      paymentState: 1,
      createdAt: 1,
      whatsappMarketingConsent: 1,
      notices: 1,
    })
    .limit(BATCH_LIMIT)
    .toArray() as AbandonedCandidate[];

  let sent = 0;
  let skipped = 0;
  for (const order of candidates) {
    if (!isAbandonedReminderDue(order, Date.now(), delayMs)) {
      skipped += 1;
      continue;
    }
    const destination = whatsAppDestination(order.phone);
    if (!destination) {
      skipped += 1;
      continue;
    }

    const claim = await db.collection("orders").updateOne(
      {
        id: order.id,
        "notices.whatsappAbandonedAt": { $exists: false },
        paymentState: { $nin: ["captured", "authorized"] },
        "whatsappMarketingConsent.optedIn": true,
      },
      { $set: { "notices.whatsappAbandonedAt": new Date().toISOString() } },
    );
    if (claim.modifiedCount !== 1) {
      skipped += 1;
      continue;
    }

    const [greetingName] = abandonedVariables(order.customerName || "");
    const result = await sendWhatsAppTemplate(destination, template, {
      body_1: { type: "text", value: greetingName },
    });
    if (!result.ok) {
      paymentLog("abandoned_whatsapp_failed", { orderId: order.id, status: result.status });
      skipped += 1;
      continue;
    }
    sent += 1;
    paymentLog("abandoned_whatsapp_sent", { orderId: order.id, status: result.status });
  }

  return { scanned: candidates.length, sent, skipped };
}
