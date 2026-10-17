import { devOtpSinkEnabled } from "@/lib/auth/config";
import { otpEmail } from "@/lib/mail/templates";
import { sendEmail, smtpConfigured } from "@/lib/mailer";

type Delivery = { ok: true; status: string } | { ok: false; status: string };

async function postJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  return response;
}

export async function sendEmailOtp(email: string, code: string, minutes: number, purpose: "login" | "verify" = "login"): Promise<Delivery> {
  if (smtpConfigured()) {
    const message = otpEmail(code, minutes, purpose);
    const sent = await sendEmail({ to: email, ...message }).then(() => true).catch(() => false);
    return sent ? { ok: true, status: "sent" } : { ok: false, status: "failed" };
  }
  if (devOtpSinkEnabled()) return { ok: true, status: "dev-sink" };
  return { ok: false, status: "unconfigured" };
}

export async function sendSmsOtp(phone: string, code: string, minutes: number): Promise<Delivery> {
  const key = process.env.MSG91_AUTH_KEY;
  const template = process.env.MSG91_TEMPLATE_ID;
  if (key && template) {
    const mobile = phone.replace(/^\+/, "");
    const sent = await postJson("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: { authkey: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: template,
        mobile,
        otp: code,
        otp_expiry: minutes,
      }),
    }).catch(() => null);
    return sent ? { ok: true, status: "sent" } : { ok: false, status: "failed" };
  }
  if (devOtpSinkEnabled()) return { ok: true, status: "dev-sink" };
  return { ok: false, status: "unconfigured" };
}
