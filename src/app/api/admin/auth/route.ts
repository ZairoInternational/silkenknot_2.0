import bcrypt from "bcryptjs";
import {
  GENERIC_LOGIN_FAIL,
  GENERIC_RESET_SENT,
  adminChannels,
  adminLoginPayload,
  checkAdminLoginRate,
  checkAdminResetRate,
  consumeAdminAuthTicket,
  createAdminAuthTicket,
  destinationForChannel,
  findAdminByEmail,
  readAdminAuthTicket,
  revokeAdminSessions,
  setAdminPassword,
  validateStudioPassword,
  type AdminUser,
} from "@/lib/auth/admin";
import { clientIp, csrfHeaderMatches, jsonError, sameOrigin } from "@/lib/auth/http";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { clearSession, createSession, currentSession, ensureCsrfCookie } from "@/lib/session";

export const runtime = "nodejs";

const FAIL = () => jsonError(GENERIC_LOGIN_FAIL, 401);

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("Request blocked.", 403);
  await ensureCsrfCookie();
  if (!csrfHeaderMatches(request)) return jsonError("Request blocked.", 403);
  if (!databaseConfigured()) return jsonError("Add MONGODB_URI, then restart the app.", 503);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError("Request could not be read.");
  const action = String(body.action || "");
  const db = await getDb();
  const ip = clientIp(request);

  if (action === "login") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return FAIL();
    if (!(await checkAdminLoginRate(db, ip, email))) {
      return jsonError("Too many attempts. Wait a few minutes and try again.", 429);
    }
    const user = await findAdminByEmail(db, email);
    if (!user || !(await bcrypt.compare(password, String(user.passwordHash || "")))) return FAIL();
    const channels = adminChannels(user);
    if (!channels.length) {
      return jsonError("Studio verification contacts are missing. Ask your developer to set an email or phone on the admin account.", 503);
    }
    const ticket = await createAdminAuthTicket(db, { userId: String(user.id), purpose: "mfa", ip });
    return Response.json({
      ok: true,
      mfaRequired: true,
      ticketId: ticket.ticketId,
      ticketToken: ticket.ticketToken,
      channels,
    });
  }

  if (action === "mfa-send") {
    const ticketId = String(body.ticketId || "");
    const ticketToken = String(body.ticketToken || "");
    const channel = body.channel === "whatsapp" ? "whatsapp" : body.channel === "email" ? "email" : null;
    if (!ticketId || !ticketToken || !channel) return jsonError("Choose email or WhatsApp.");
    const ticket = await readAdminAuthTicket(db, ticketId, ticketToken, "mfa");
    if (!ticket) return FAIL();
    const user = await db.collection<AdminUser>("users").findOne({ id: ticket.userId, role: "admin" });
    if (!user) return FAIL();
    const destination = destinationForChannel(user, channel);
    if (!destination) return jsonError("That verification channel is not available.");
    const result = await requestOtp(db, {
      destination,
      channel,
      purpose: "admin-mfa",
      ip,
      userId: String(user.id),
    });
    if (!result.ok) return jsonError(result.message, result.status);
    return Response.json({
      ok: true,
      challengeId: result.challengeId,
      resendAt: result.resendAt,
      expiresAt: result.expiresAt,
      masked: adminChannels(user).find((item) => item.channel === channel)?.masked,
      channel,
      devCode: "devCode" in result ? result.devCode : undefined,
    });
  }

  if (action === "mfa-verify") {
    const ticketId = String(body.ticketId || "");
    const ticketToken = String(body.ticketToken || "");
    const challengeId = String(body.challengeId || "");
    const code = String(body.code || "");
    if (!ticketId || !ticketToken || !challengeId || !/^\d{6}$/.test(code)) {
      return jsonError("Enter the 6-digit code.");
    }
    const ticket = await readAdminAuthTicket(db, ticketId, ticketToken, "mfa");
    if (!ticket) return FAIL();
    const checked = await verifyOtp(db, challengeId, code);
    if (!checked.ok) return jsonError(checked.message, 400);
    if (checked.challenge.purpose !== "admin-mfa" || checked.challenge.userId !== ticket.userId) {
      return jsonError("That code is incorrect or has expired.", 400);
    }
    const user = await db.collection<AdminUser>("users").findOne({ id: ticket.userId, role: "admin" });
    if (!user) return FAIL();
    await consumeAdminAuthTicket(db, ticketId);
    await createSession(String(user.id), "admin");
    return Response.json(await adminLoginPayload(db, user));
  }

  if (action === "forgot-request") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return Response.json({ ok: true, message: GENERIC_RESET_SENT });
    if (!(await checkAdminResetRate(db, ip, email))) {
      return jsonError("Too many attempts. Wait a few minutes and try again.", 429);
    }
    const user = await findAdminByEmail(db, email);
    if (!user?.email) return Response.json({ ok: true, message: GENERIC_RESET_SENT });
    const ticket = await createAdminAuthTicket(db, { userId: String(user.id), purpose: "reset", ip });
    const result = await requestOtp(db, {
      destination: String(user.email).trim().toLowerCase(),
      channel: "email",
      purpose: "admin-reset",
      ip,
      userId: String(user.id),
    });
    if (!result.ok) {
      // Do not reveal whether delivery failed for a real account vs missing SMTP in prod probes.
      if (result.status === 503) return jsonError(result.message, 503);
      return Response.json({ ok: true, message: GENERIC_RESET_SENT });
    }
    return Response.json({
      ok: true,
      message: GENERIC_RESET_SENT,
      ticketId: ticket.ticketId,
      ticketToken: ticket.ticketToken,
      challengeId: result.challengeId,
      resendAt: result.resendAt,
      masked: adminChannels(user).find((item) => item.channel === "email")?.masked,
      channel: "email" as const,
      devCode: "devCode" in result ? result.devCode : undefined,
    });
  }

  if (action === "forgot-resend") {
    const ticketId = String(body.ticketId || "");
    const ticketToken = String(body.ticketToken || "");
    const ticket = await readAdminAuthTicket(db, ticketId, ticketToken, "reset");
    if (!ticket) return Response.json({ ok: true, message: GENERIC_RESET_SENT });
    const user = await db.collection<AdminUser>("users").findOne({ id: ticket.userId, role: "admin" });
    if (!user?.email) return Response.json({ ok: true, message: GENERIC_RESET_SENT });
    const result = await requestOtp(db, {
      destination: String(user.email).trim().toLowerCase(),
      channel: "email",
      purpose: "admin-reset",
      ip,
      userId: String(user.id),
    });
    if (!result.ok) return jsonError(result.message, result.status);
    return Response.json({
      ok: true,
      message: GENERIC_RESET_SENT,
      challengeId: result.challengeId,
      resendAt: result.resendAt,
      masked: adminChannels(user).find((item) => item.channel === "email")?.masked,
      channel: "email" as const,
      devCode: "devCode" in result ? result.devCode : undefined,
    });
  }

  if (action === "forgot-verify") {
    const ticketId = String(body.ticketId || "");
    const ticketToken = String(body.ticketToken || "");
    const challengeId = String(body.challengeId || "");
    const code = String(body.code || "");
    const password = String(body.password || "");
    if (!ticketId || !ticketToken || !challengeId || !/^\d{6}$/.test(code)) {
      return jsonError("Enter the 6-digit code.");
    }
    const ticket = await readAdminAuthTicket(db, ticketId, ticketToken, "reset");
    if (!ticket) return jsonError("That reset link has expired. Start again.", 400);
    const user = await db.collection<AdminUser>("users").findOne({ id: ticket.userId, role: "admin" });
    if (!user) return jsonError("That reset link has expired. Start again.", 400);
    const passwordError = validateStudioPassword(password, String(user.email || ""));
    if (passwordError) return jsonError(passwordError);
    const checked = await verifyOtp(db, challengeId, code);
    if (!checked.ok) return jsonError(checked.message, 400);
    if (checked.challenge.purpose !== "admin-reset" || checked.challenge.userId !== ticket.userId) {
      return jsonError("That code is incorrect or has expired.", 400);
    }
    await setAdminPassword(db, String(user.id), password);
    await consumeAdminAuthTicket(db, ticketId);
    await revokeAdminSessions(db, String(user.id));
    await clearSession();
    return Response.json({ ok: true, message: "Password updated. Sign in with your new password." });
  }

  if (action === "change-password") {
    const session = await currentSession();
    if (!session || session.role !== "admin") return jsonError("Not found.", 404);
    const currentPassword = String(body.currentPassword || "");
    const nextPassword = String(body.password || "");
    const user = await db.collection<AdminUser>("users").findOne({ id: session.id, role: "admin" });
    if (!user) return jsonError("Not found.", 404);
    if (!(await bcrypt.compare(currentPassword, String(user.passwordHash || "")))) {
      return jsonError("Current password is incorrect.");
    }
    const passwordError = validateStudioPassword(nextPassword, String(user.email || ""));
    if (passwordError) return jsonError(passwordError);
    if (await bcrypt.compare(nextPassword, String(user.passwordHash || ""))) {
      return jsonError("Choose a password you have not used before.");
    }
    await setAdminPassword(db, String(user.id), nextPassword);
    await revokeAdminSessions(db, String(user.id), session.sessionId);
    return Response.json({ ok: true, message: "Password updated." });
  }

  return jsonError("Unknown action.");
}
