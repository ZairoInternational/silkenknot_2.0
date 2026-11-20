import type { Db } from "mongodb";
import { normalizePhone } from "@/lib/auth/contact";
import { sendWhatsAppTemplate, whatsAppTemplateReady } from "@/lib/auth/deliver";
import { formatPrice } from "@/lib/format";
import { paymentLog } from "@/lib/payments/log";
import { sendEmail, smtpConfigured } from "@/lib/mailer";
import { orderEmail } from "@/lib/mail/templates";
import type { CartItem } from "@/lib/types";

function firstName(name: string) {
  const clean = name.replace(/[\r\n\t]+/g, " ").trim().split(" ")[0];
  return clean || "there";
}

function waText(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").trim();
}

function whatsAppDestination(phone: string | undefined) {
  const destination = normalizePhone(phone || "", "IN");
  return destination;
}

function itemSummary(items: { name: string; quantity: number }[] | undefined) {
  const summary = (items || [])
    .map((item) => waText(`${item.name} x${item.quantity}`))
    .filter(Boolean)
    .join(", ");
  return summary || "your items";
}

function addressLine(address: { line1?: string; line2?: string; city?: string; postal?: string } | undefined) {
  const line = [address?.line1, address?.line2, address?.city, address?.postal]
    .map((part) => (part ? waText(String(part)) : ""))
    .filter(Boolean)
    .join(", ");
  return line || "your address";
}

export function formatDeliveredAt(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const when = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(when);
}

export function confirmationVariables(order: { customerName: string; number: string; total: number }) {
  return [firstName(order.customerName), order.number, formatPrice(order.total).replace(/\u00a0/g, " ")];
}

export function deliveredVariables(order: {
  customerName: string;
  number: string;
  items?: { name: string; quantity: number }[];
  address?: { line1?: string; line2?: string; city?: string; postal?: string };
  deliveredAt?: string | Date;
}) {
  return [
    firstName(order.customerName),
    waText(order.number),
    itemSummary(order.items),
    addressLine(order.address),
    formatDeliveredAt(order.deliveredAt),
  ];
}

export function orderLinkSuffix(id: string) {
  return encodeURIComponent(id);
}

export function welcomeVariables(name: string) {
  return [firstName(name)];
}

/** Once per account: WhatsApp welcome after first name + verified phone. */
export async function notifyWelcomeSignup(db: Db, user: { id: string; name?: string; phone?: string }) {
  const template = process.env.MSG91_WHATSAPP_WELCOME_TEMPLATE_NAME?.trim();
  const destination = whatsAppDestination(user.phone);
  const fullName = (user.name || "").trim();
  if (!user.id || !fullName || !template || !destination || !whatsAppTemplateReady(template)) return;
  const claim = await db.collection("users").updateOne(
    { id: user.id, "notices.whatsappWelcomeAt": { $exists: false } },
    { $set: { "notices.whatsappWelcomeAt": new Date().toISOString() } },
  );
  if (claim.modifiedCount !== 1) return;
  // Body: Hi {{1}}, welcome to Silken Knot! … CTA "Explore Silken Knot" is a static
  // Meta URL button → https://www.silkenknot.com (no button var in the API payload).
  const [greetingName] = welcomeVariables(fullName);
  const sent = await sendWhatsAppTemplate(destination, template, {
    body_1: { type: "text", value: greetingName },
  });
  if (!sent.ok) {
    await db.collection("users").updateOne({ id: user.id }, { $unset: { "notices.whatsappWelcomeAt": "" } });
    console.info(JSON.stringify({ scope: "auth", event: "welcome_whatsapp_failed", userId: user.id, status: sent.status }));
  }
}

export function queueOrderConfirmation(order: {
  id: string;
  email?: string;
  phone?: string;
  number: string;
  customerName: string;
  items: CartItem[];
  total: number;
  payment: string;
}) {
  const to = order.email?.trim();
  if (to && smtpConfigured()) {
    const message = orderEmail({
      number: order.number,
      customerName: order.customerName,
      items: order.items,
      total: order.total,
      payment: order.payment,
    });
    void sendEmail({ to, ...message }).catch((error) => {
      paymentLog("order_email_failed", { orderId: order.id, code: error instanceof Error ? error.name : "error" });
    });
  } else if (to) {
    paymentLog("order_email_skipped", { orderId: order.id });
  }

  const template = process.env.MSG91_WHATSAPP_ORDER_TEMPLATE_NAME?.trim();
  const destination = whatsAppDestination(order.phone);
  if (!template || !destination || !whatsAppTemplateReady(template)) return;
  const [name, number, total] = confirmationVariables(order);
  void sendWhatsAppTemplate(destination, template, {
    body_1: { type: "text", value: name },
    body_2: { type: "text", value: number },
    body_3: { type: "text", value: total },
    button_1: { subtype: "url", type: "text", value: orderLinkSuffix(order.id) },
  }).then((result) => {
    if (!result.ok) paymentLog("order_whatsapp_failed", { orderId: order.id, kind: "confirmed", status: result.status });
  });
}

export async function notifyOrderDelivered(db: Db, order: {
  id: string;
  phone?: string;
  number: string;
  customerName: string;
  items?: { name: string; quantity: number }[];
  address?: { line1?: string; line2?: string; city?: string; postal?: string };
  deliveredAt?: string | Date;
}) {
  const template = process.env.MSG91_WHATSAPP_DELIVERED_TEMPLATE_NAME?.trim();
  const destination = whatsAppDestination(order.phone);
  if (!order.id || !template || !destination || !whatsAppTemplateReady(template)) return;
  const claim = await db.collection("orders").updateOne(
    { id: order.id, "notices.whatsappDeliveredAt": { $exists: false } },
    { $set: { "notices.whatsappDeliveredAt": new Date().toISOString() } },
  );
  if (claim.modifiedCount !== 1) return;
  const [name, number, items, address, deliveredAt] = deliveredVariables(order);
  const sent = await sendWhatsAppTemplate(destination, template, {
    body_1: { type: "text", value: name },
    body_2: { type: "text", value: number },
    body_3: { type: "text", value: items },
    body_4: { type: "text", value: address },
    body_5: { type: "text", value: deliveredAt },
  });
  if (!sent.ok) {
    await db.collection("orders").updateOne({ id: order.id }, { $unset: { "notices.whatsappDeliveredAt": "" } });
    paymentLog("order_whatsapp_failed", { orderId: order.id, kind: "delivered", status: sent.status });
  }
}
