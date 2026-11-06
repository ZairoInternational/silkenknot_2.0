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

function whatsAppDestination(phone: string | undefined) {
  const destination = normalizePhone(phone || "", "IN");
  return destination;
}

export function confirmationVariables(order: { customerName: string; number: string; total: number }) {
  return [firstName(order.customerName), order.number, formatPrice(order.total).replace(/\u00a0/g, " ")];
}

export function deliveredVariables(order: { customerName: string; number: string }) {
  return [firstName(order.customerName), order.number];
}

export function orderLinkSuffix(id: string) {
  return encodeURIComponent(id);
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
}) {
  const template = process.env.MSG91_WHATSAPP_DELIVERED_TEMPLATE_NAME?.trim();
  const destination = whatsAppDestination(order.phone);
  if (!order.id || !template || !destination || !whatsAppTemplateReady(template)) return;
  const claim = await db.collection("orders").updateOne(
    { id: order.id, "notices.whatsappDeliveredAt": { $exists: false } },
    { $set: { "notices.whatsappDeliveredAt": new Date().toISOString() } },
  );
  if (claim.modifiedCount !== 1) return;
  const [name, number] = deliveredVariables(order);
  const sent = await sendWhatsAppTemplate(destination, template, {
    body_1: { type: "text", value: name },
    body_2: { type: "text", value: number },
  });
  if (!sent.ok) {
    await db.collection("orders").updateOne({ id: order.id }, { $unset: { "notices.whatsappDeliveredAt": "" } });
    paymentLog("order_whatsapp_failed", { orderId: order.id, kind: "delivered", status: sent.status });
  }
}
