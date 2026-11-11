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

type TemplateComponent = { type: "text"; value: string; subtype?: "url" };

export function whatsAppTemplateReady(templateName: string | undefined) {
  return Boolean(
    templateName?.trim()
    && process.env.MSG91_AUTH_KEY?.trim()
    && process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER?.trim()
    && process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE?.trim()
    && process.env.MSG91_WHATSAPP_TEMPLATE_LANGUAGE?.trim(),
  );
}

export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  components: Record<string, TemplateComponent>,
): Promise<Delivery> {
  const key = process.env.MSG91_AUTH_KEY?.trim();
  const integratedNumber = process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER?.trim();
  const namespace = process.env.MSG91_WHATSAPP_TEMPLATE_NAMESPACE?.trim();
  const language = process.env.MSG91_WHATSAPP_TEMPLATE_LANGUAGE?.trim();
  if (key && integratedNumber && templateName.trim() && namespace && language) {
    const mobile = phone.replace(/^\+/, "");
    const sent = await postJson("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
      method: "POST",
      headers: { authkey: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        integrated_number: integratedNumber,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: templateName,
            language: { code: language, policy: "deterministic" },
            namespace,
            to_and_components: [{ to: [mobile], components }],
          },
        },
      }),
    }).catch(() => null);
    if (sent) return { ok: true, status: "sent" };
    // MSG91 rejected (bad key/template). Local sink still lets login work.
    if (devOtpSinkEnabled()) return { ok: true, status: "dev-sink" };
    return { ok: false, status: "failed" };
  }
  if (devOtpSinkEnabled()) return { ok: true, status: "dev-sink" };
  return { ok: false, status: "unconfigured" };
}

export async function sendWhatsAppOtp(phone: string, code: string): Promise<Delivery> {
  // Prefer local sink when enabled so bad/expired MSG91 keys do not block login.
  if (devOtpSinkEnabled()) return { ok: true, status: "dev-sink" };
  const templateName = process.env.MSG91_WHATSAPP_TEMPLATE_NAME?.trim();
  if (!templateName) return { ok: false, status: "unconfigured" };
  return sendWhatsAppTemplate(phone, templateName, {
    body_1: { type: "text", value: code },
    button_1: { subtype: "url", type: "text", value: code },
  });
}
