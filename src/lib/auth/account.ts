import type { Db } from "mongodb";
import type { OtpChannel, OtpPurpose } from "@/lib/auth/otp";
import { publicUser } from "@/lib/mongo";

type Account = {
  id: string;
  role?: string;
  email?: string;
  phone?: string;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
};

export async function resolveVerifiedLogin(db: Db, channel: OtpChannel, destination: string) {
  const users = db.collection<Account>("users");
  const verified = channel === "email"
    ? await users.findOne({ email: destination, emailVerifiedAt: { $type: "string" } })
    : await users.findOne({ phone: destination, phoneVerifiedAt: { $type: "string" } });
  if (verified?.role === "admin") return { ok: false as const, message: "Use the studio login for this contact." };
  if (channel === "email") {
    const owner = await users.findOne({ email: destination });
    if (owner?.role === "admin") return { ok: false as const, message: "Use the studio login for this contact." };
  }
  if (verified) {
    const stamp = new Date().toISOString();
    const patch = channel === "email" ? { emailVerifiedAt: stamp } : { phoneVerifiedAt: stamp };
    await users.updateOne({ id: verified.id }, { $set: patch });
    const next = await users.findOne({ id: verified.id });
    return { ok: true as const, user: publicUser(next || verified) };
  }
  const id = `user-${crypto.randomUUID()}`;
  const stamp = new Date().toISOString();
  const created = channel === "email"
    ? { id, name: "", nameSetAt: null, email: destination, phone: "", role: "customer" as const, addresses: [], emailVerifiedAt: stamp, phoneVerifiedAt: null, savedCart: [], savedWishlist: [] }
    : { id, name: "", nameSetAt: null, phone: destination, role: "customer" as const, addresses: [], emailVerifiedAt: null, phoneVerifiedAt: stamp, savedCart: [], savedWishlist: [] };
  try {
    await users.insertOne(created);
  } catch {
    if (channel === "whatsapp") {
      const owners = await users.find({ phone: destination, role: "customer" }).toArray();
      if (owners.length === 1) {
        const stamp = new Date().toISOString();
        await users.updateOne({ id: owners[0].id }, { $set: { phoneVerifiedAt: stamp } });
        const next = await users.findOne({ id: owners[0].id });
        return { ok: true as const, user: publicUser(next || owners[0]) };
      }
    }
    const again = channel === "email" ? await users.findOne({ email: destination }) : null;
    if (again?.role === "admin") return { ok: false as const, message: "Use the studio login for this contact." };
    if (again?.role === "customer" && again.emailVerifiedAt) return { ok: true as const, user: publicUser(again) };
    return { ok: false as const, message: "We couldn’t finish signing you in." };
  }
  return { ok: true as const, user: publicUser(created) };
}

export async function linkVerifiedContact(db: Db, userId: string, purpose: OtpPurpose, destination: string) {
  const users = db.collection<Account>("users");
  const account = await users.findOne({ id: userId, role: "customer" });
  if (!account) return { ok: false as const, message: "Log in to continue." };
  if (purpose === "link-email") {
    const taken = await users.findOne({ email: destination, emailVerifiedAt: { $type: "string" }, id: { $ne: userId } });
    if (taken) return { ok: false as const, message: "That email is already verified on another account." };
    await users.updateMany(
      { id: { $ne: userId }, email: destination, emailVerifiedAt: null },
      { $unset: { email: "" } },
    );
    await users.updateOne({ id: userId }, { $set: { email: destination, emailVerifiedAt: new Date().toISOString() } });
  } else if (purpose === "link-phone") {
    const taken = await users.findOne({ phone: destination, phoneVerifiedAt: { $type: "string" }, id: { $ne: userId } });
    if (taken) return { ok: false as const, message: "That mobile number is already verified on another account." };
    await users.updateMany(
      { id: { $ne: userId }, phone: destination, phoneVerifiedAt: null },
      { $unset: { phone: "" } },
    );
    await users.updateOne({ id: userId }, { $set: { phone: destination, phoneVerifiedAt: new Date().toISOString() } });
  } else {
    return { ok: false as const, message: "That verification can’t be used this way." };
  }
  const next = await users.findOne({ id: userId });
  return { ok: true as const, user: publicUser(next || account) };
}
