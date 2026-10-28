import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { Db } from "mongodb";
import { hashIp } from "@/lib/auth/otp";
import { maskDestination } from "@/lib/auth/contact";
import { publicUser } from "@/lib/mongo";
import { publicOrder, type StoredOrder } from "@/lib/payments/service";
import type { Order } from "@/lib/types";

export type AdminAuthPurpose = "mfa" | "reset";

type AdminAuthTicket = {
  id: string;
  userId: string;
  purpose: AdminAuthPurpose;
  tokenHash: string;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
  ipHash: string;
};

export type AdminUser = {
  id: string;
  role?: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  name?: string;
};

const TICKET_TTL_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE = 12;
const RESET_RATE = 8;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function validateStudioPassword(password: string, email?: string) {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 128) return "That password is too long.";
  if (email && password.toLowerCase() === email.toLowerCase()) return "Do not use your email as the password.";
  if (/^(studio123|password|admin123|1234567890)$/i.test(password)) return "Choose a stronger password.";
  return null;
}

export async function enforceAdminAuthRate(db: Db, key: string, limit: number) {
  const windowStart = Math.floor(Date.now() / RATE_WINDOW_MS);
  const fullKey = `admin-auth:${key}:${windowStart}`;
  await db.collection("rateLimits").updateOne({ key: fullKey }, { $inc: { count: 1 }, $setOnInsert: { key: fullKey } }, { upsert: true });
  const row = await db.collection("rateLimits").findOne({ key: fullKey });
  return (row?.count || 0) <= limit;
}

export async function checkAdminLoginRate(db: Db, ip: string, email: string) {
  const ipOk = await enforceAdminAuthRate(db, `login-ip:${hashIp(ip)}`, LOGIN_RATE);
  const emailOk = await enforceAdminAuthRate(db, `login-email:${email}`, LOGIN_RATE);
  return ipOk && emailOk;
}

export async function checkAdminResetRate(db: Db, ip: string, email: string) {
  const ipOk = await enforceAdminAuthRate(db, `reset-ip:${hashIp(ip)}`, RESET_RATE);
  const emailOk = await enforceAdminAuthRate(db, `reset-email:${email}`, RESET_RATE);
  return ipOk && emailOk;
}

export function adminChannels(user: AdminUser) {
  const channels: { channel: "email" | "whatsapp"; masked: string }[] = [];
  const email = String(user.email || "").trim().toLowerCase();
  const phone = String(user.phone || "").trim();
  if (email) channels.push({ channel: "email", masked: maskDestination("email", email) });
  if (phone) channels.push({ channel: "whatsapp", masked: maskDestination("whatsapp", phone) });
  return channels;
}

export function destinationForChannel(user: AdminUser, channel: "email" | "whatsapp") {
  if (channel === "email") {
    const email = String(user.email || "").trim().toLowerCase();
    return email || null;
  }
  const phone = String(user.phone || "").trim();
  return phone || null;
}

export async function createAdminAuthTicket(
  db: Db,
  input: { userId: string; purpose: AdminAuthPurpose; ip: string },
) {
  const id = randomBytes(18).toString("base64url");
  const token = randomBytes(24).toString("base64url");
  const now = Date.now();
  const ticket: AdminAuthTicket = {
    id,
    userId: input.userId,
    purpose: input.purpose,
    tokenHash: hashToken(token),
    expiresAt: new Date(now + TICKET_TTL_MS).toISOString(),
    consumedAt: null,
    createdAt: new Date(now).toISOString(),
    ipHash: hashIp(input.ip),
  };
  await db.collection<AdminAuthTicket>("adminAuthTickets").insertOne(ticket);
  return { ticketId: id, ticketToken: token };
}

export async function readAdminAuthTicket(
  db: Db,
  ticketId: string,
  ticketToken: string,
  purpose: AdminAuthPurpose,
) {
  const row = await db.collection<AdminAuthTicket>("adminAuthTickets").findOne({ id: ticketId, purpose });
  const now = new Date().toISOString();
  if (!row || row.consumedAt || row.expiresAt <= now) return null;
  if (row.tokenHash !== hashToken(ticketToken)) return null;
  return row;
}

export async function consumeAdminAuthTicket(db: Db, ticketId: string) {
  await db.collection<AdminAuthTicket>("adminAuthTickets").updateOne(
    { id: ticketId, consumedAt: null },
    { $set: { consumedAt: new Date().toISOString() } },
  );
}

export async function revokeAdminSessions(db: Db, userId: string, keepSessionId?: string) {
  const filter: Record<string, unknown> = { userId, role: "admin", revokedAt: null };
  if (keepSessionId) filter.id = { $ne: keepSessionId };
  await db.collection("sessions").updateMany(filter, { $set: { revokedAt: new Date().toISOString() } });
}

export async function setAdminPassword(db: Db, userId: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await db.collection("users").updateOne({ id: userId, role: "admin" }, { $set: { passwordHash } });
}

export async function findAdminByEmail(db: Db, email: string) {
  return db.collection<AdminUser>("users").findOne({ email, role: "admin" });
}

export async function adminLoginPayload(db: Db, user: AdminUser) {
  const orders = (await db.collection("orders").find().sort({ createdAt: -1 }).toArray()).map((order) =>
    publicOrder(order as unknown as StoredOrder),
  ) as Order[];
  const customers = (await db.collection("users").find({ role: "customer" }).toArray()).map((item) => publicUser(item));
  return {
    ok: true as const,
    user: publicUser(user),
    orders,
    customers,
    admin: true as const,
  };
}

export const GENERIC_LOGIN_FAIL = "Those studio details are not recognised.";
export const GENERIC_RESET_SENT = "If that studio account exists, a verification code is on its way.";
