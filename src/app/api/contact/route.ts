import { NextResponse } from "next/server";
import { clientIp, sameOrigin } from "@/lib/auth/http";
import { contactEmail } from "@/lib/mail/templates";
import { sendEmail, smtpConfigured, studioInbox } from "@/lib/mailer";

export const runtime = "nodejs";

const hits = new Map<string, number[]>();

function allowed(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((at) => now - at < 60 * 60 * 1000);
  if (recent.length >= 5) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "This form could not be sent." }, { status: 403 });
  if (!allowed(clientIp(request))) return NextResponse.json({ error: "Please wait before sending another message." }, { status: 429 });
  if (!smtpConfigured()) return NextResponse.json({ error: "The studio inbox is not configured yet." }, { status: 503 });
  const body = await request.json().catch(() => null) as { name?: unknown; email?: unknown; message?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (message.length < 8 || message.length > 4000) return NextResponse.json({ error: "Write a short message." }, { status: 400 });
  const inbox = studioInbox();
  if (!inbox) return NextResponse.json({ error: "The studio inbox is not configured yet." }, { status: 503 });
  try {
    const note = contactEmail({ name, email, message });
    await sendEmail({ to: inbox, replyTo: email, ...note });
  } catch {
    return NextResponse.json({ error: "We couldn’t send that just now. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
