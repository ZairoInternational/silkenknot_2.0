import { mergeBag } from "@/lib/auth/bag";
import { linkVerifiedContact, resolveVerifiedLogin } from "@/lib/auth/account";
import { normalizeEmail, normalizePhone } from "@/lib/auth/contact";
import { csrfHeaderMatches, clientIp, jsonError, sameOrigin } from "@/lib/auth/http";
import { requestOtp, verifyOtp, type OtpPurpose } from "@/lib/auth/otp";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { createSession, currentSession, ensureCsrfCookie } from "@/lib/session";
import type { CartItem } from "@/lib/types";

function purposeOf(value: unknown): OtpPurpose {
  if (value === "link-email" || value === "link-phone") return value;
  return "login";
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request blocked.", 403);
  await ensureCsrfCookie();
  if (!databaseConfigured()) return jsonError("Add MONGODB_URI to .env.local, then restart the app.", 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonError("Request could not be read.");
  const channel = body.channel === "whatsapp" ? "whatsapp" : body.channel === "email" ? "email" : null;
  if (!channel) return jsonError("Choose email or WhatsApp.");
  const purpose = purposeOf(body.purpose);
  if (purpose === "link-email" && channel !== "email") return jsonError("Use email to verify an email address.");
  if (purpose === "link-phone" && channel !== "whatsapp") return jsonError("Use WhatsApp to verify a mobile number.");
  const destination = channel === "email"
    ? normalizeEmail(String(body.destination || ""))
    : normalizePhone(String(body.destination || ""), String(body.country || "IN"));
  if (!destination) return jsonError(channel === "email" ? "Enter a valid email address." : "Enter a valid mobile number.");

  const db = await getDb();
  let userId: string | undefined;
  if (purpose !== "login") {
    if (!csrfHeaderMatches(request)) return jsonError("Request blocked.", 403);
    const session = await currentSession();
    if (!session || session.role !== "customer") return jsonError("Log in to continue.", 401);
    userId = session.id;
  }
  const result = await requestOtp(db, { destination, channel, purpose, ip: clientIp(request), userId });
  if (!result.ok) return jsonError(result.message, result.status);
  return Response.json({
    ok: true,
    challengeId: result.challengeId,
    expiresAt: result.expiresAt,
    resendAt: result.resendAt,
    devCode: "devCode" in result ? result.devCode : undefined,
  });
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request blocked.", 403);
  await ensureCsrfCookie();
  if (!csrfHeaderMatches(request)) return jsonError("Request blocked.", 403);
  if (!databaseConfigured()) return jsonError("Add MONGODB_URI to .env.local, then restart the app.", 503);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonError("Request could not be read.");
  const challengeId = String(body.challengeId || "");
  const code = String(body.code || "");
  if (!challengeId || !/^\d{6}$/.test(code)) return jsonError("Enter the 6-digit code.");
  const db = await getDb();
  const checked = await verifyOtp(db, challengeId, code);
  if (!checked.ok) return jsonError(checked.message, 400);
  const challenge = checked.challenge;
  if (challenge.purpose === "login") {
    const account = await resolveVerifiedLogin(db, challenge.channel, challenge.destination);
    if (!account.ok || !account.user?.id) return jsonError(account.ok ? "We couldn’t finish signing you in." : account.message, 400);
    const role = account.user.role === "admin" ? "admin" : "customer";
    if (role !== "customer") return jsonError("Use the studio login for this contact.", 403);
    await createSession(String(account.user.id), "customer");
    const bag = await mergeBag(db, String(account.user.id), {
      cart: Array.isArray(body.cart) ? body.cart as CartItem[] : [],
      wishlist: Array.isArray(body.wishlist) ? body.wishlist.map(String) : [],
      couponCode: typeof body.couponCode === "string" ? body.couponCode : null,
    });
    return Response.json({ ok: true, user: { ...account.user, password: "" }, ...bag });
  }
  const session = await currentSession();
  if (!session || session.role !== "customer" || (challenge.userId && challenge.userId !== session.id)) {
    return jsonError("Log in to continue.", 401);
  }
  const linked = await linkVerifiedContact(db, session.id, challenge.purpose, challenge.destination);
  if (!linked.ok) return jsonError(linked.message, 400);
  return Response.json({ ok: true, user: linked.user });
}
