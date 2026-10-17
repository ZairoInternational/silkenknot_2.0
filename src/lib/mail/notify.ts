import { paymentLog } from "@/lib/payments/log";
import { sendEmail, smtpConfigured } from "@/lib/mailer";
import { orderEmail } from "@/lib/mail/templates";
import type { CartItem } from "@/lib/types";

export function queueOrderConfirmation(order: {
  id: string;
  email?: string;
  number: string;
  customerName: string;
  items: CartItem[];
  total: number;
  payment: string;
}) {
  const to = order.email?.trim();
  if (!to) return;
  if (!smtpConfigured()) {
    paymentLog("order_email_skipped", { orderId: order.id });
    return;
  }
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
}
