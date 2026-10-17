import nodemailer, { type Transporter } from "nodemailer";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

type SmtpConfig = {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
  inbox?: string;
};

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim().replace(/\s+/g, "");
  const from = process.env.SMTP_FROM?.trim();
  const inbox = process.env.SMTP_INBOX?.trim() || user;
  const port = portRaw ? Number(portRaw) : undefined;
  return { host, port, user, pass, from, inbox };
}

export function smtpConfigured() {
  const config = getSmtpConfig();
  return Boolean(config.host && config.port && Number.isInteger(config.port) && config.user && config.pass && config.from);
}

export function studioInbox() {
  return getSmtpConfig().inbox || "";
}

let cached: { key: string; transporter: Transporter } | null = null;

function mailer() {
  const config = getSmtpConfig();
  if (!config.host || !config.port || !config.user || !config.pass || !config.from) {
    throw new Error("SMTP is not configured (missing SMTP_HOST/PORT/USER/PASS/FROM).");
  }
  const key = `${config.host}:${config.port}:${config.user}:${config.from}`;
  if (!cached || cached.key !== key) {
    cached = {
      key,
      transporter: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        requireTLS: config.port === 587,
        auth: { user: config.user, pass: config.pass },
      }),
    };
  }
  return { transporter: cached.transporter, from: config.from };
}

export async function sendEmail(input: SendEmailInput) {
  const { transporter, from } = mailer();
  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });
}
