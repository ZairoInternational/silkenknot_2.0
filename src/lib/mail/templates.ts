import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/lib/types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, body: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f4ef;color:#2c2926;font-family:Georgia,serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #efe6d8;border-radius:18px;padding:28px 24px;">
            <tr>
              <td>
                <p style="margin:0 0 18px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a7350;">Silken Knot</p>
                <h1 style="margin:0 0 12px;font-size:28px;font-weight:500;line-height:1.2;">${title}</h1>
                ${body}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function otpEmail(code: string, minutes: number, purpose: "login" | "verify") {
  const title = purpose === "verify" ? "Verify your email" : "Your sign-in code";
  const lead = purpose === "verify"
    ? "Use this code to add this email to your Silken Knot account."
    : "Use this code to sign in to Silken Knot.";
  const safe = escapeHtml(code);
  return {
    subject: purpose === "verify" ? "Your Silken Knot verification code" : "Your Silken Knot sign-in code",
    text: `${lead} ${code}. It expires in ${minutes} minutes. If you did not ask for this, you can ignore the message.`,
    html: layout(
      title,
      `<p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#6f675d;">${lead}</p>
       <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:28px;letter-spacing:0.28em;font-weight:600;">${safe}</p>
       <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#8a8178;">It expires in ${minutes} minutes. If you did not ask for this, you can ignore the message.</p>`,
    ),
  };
}

export function orderEmail(order: {
  number: string;
  customerName: string;
  items: CartItem[];
  total: number;
  payment: string;
  shipping?: number;
}) {
  const name = escapeHtml(order.customerName.split(" ")[0] || "there");
  const pay = order.payment === "cod" ? "Pay on delivery" : "Paid online";
  const rows = order.items
    .map((item) => `<tr>
      <td style="padding:8px 0;font-family:Arial,sans-serif;font-size:14px;border-top:1px solid #efe6d8;">${escapeHtml(item.name)} × ${item.quantity}</td>
      <td style="padding:8px 0;font-family:Arial,sans-serif;font-size:14px;text-align:right;border-top:1px solid #efe6d8;">${escapeHtml(formatPrice(item.price * item.quantity))}</td>
    </tr>`)
    .join("");
  return {
    subject: `Silken Knot order ${order.number}`,
    text: `Hello ${order.customerName.split(" ")[0] || "there"}. Order ${order.number} is confirmed. Total ${formatPrice(order.total)}. ${pay}.`,
    html: layout(
      "Your order is confirmed",
      `<p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#6f675d;">Hello ${name}. We have your order <strong>${escapeHtml(order.number)}</strong>.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
       <p style="margin:14px 0 0;font-family:Arial,sans-serif;font-size:14px;">Total ${escapeHtml(formatPrice(order.total))}</p>
       <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#8a8178;">${pay}</p>`,
    ),
  };
}

export function contactEmail(input: { name: string; email: string; message: string }) {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const message = escapeHtml(input.message).replace(/\n/g, "<br>");
  return {
    subject: `Silken Knot message from ${input.name}`,
    text: `${input.name} <${input.email}>\n\n${input.message}`,
    html: layout(
      "New studio message",
      `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:14px;">${name}</p>
       <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;color:#8a7350;">${email}</p>
       <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;">${message}</p>`,
    ),
  };
}
