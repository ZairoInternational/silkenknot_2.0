import { MongoClient, type Db } from "mongodb";
import { ensurePaymentIndexes } from "@/lib/payments/indexes";
import bcrypt from "bcryptjs";
import { seedCategories, seedCoupons, seedProducts, seedUsers } from "@/lib/data";
import { approxProductWeight } from "@/lib/shipping/weight";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "silkknot";

let client: MongoClient | null = null;
let connecting: Promise<MongoClient> | null = null;
let seeded: Promise<void> | null = null;

export function databaseConfigured() {
  return Boolean(uri);
}

export async function getDb() {
  if (!uri) throw new Error("Add MONGODB_URI to .env.local");
  if (!client) {
    client = new MongoClient(uri);
    connecting = client.connect();
  }
  await connecting;
  const db = client!.db(dbName);
  if (!seeded) {
    seeded = seedIfEmpty(db).catch((error) => {
      seeded = null;
      throw error;
    });
  }
  await seeded;
  return db;
}

async function seedIfEmpty(db: Db) {
  const products = db.collection("products");
  if ((await products.countDocuments()) === 0) {
    await products.insertMany(seedProducts.map((product) => ({ ...product })));
  }
  const unweighed = await products.find({ $or: [{ weightGrams: { $exists: false } }, { weightGrams: { $lte: 0 } }] }).toArray();
  for (const product of unweighed) {
    await products.updateOne({ _id: product._id }, { $set: { weightGrams: approxProductWeight(String(product.type || "")) } });
  }
  const categories = db.collection("categories");
  const stored = await categories.find().toArray();
  for (const row of stored) {
    if (row.slug) continue;
    const slug = typeof row.id === "string" && row.id ? row.id : String(row._id);
    await categories.updateOne({ _id: row._id }, { $set: { slug } });
  }
  for (const category of seedCategories) {
    const slug = category.id;
    const found = await categories.findOne({ $or: [{ id: category.id }, { slug }] });
    if (found) {
      if (!found.slug) await categories.updateOne({ _id: found._id }, { $set: { slug } });
      continue;
    }
    await categories.insertOne({ ...category, slug });
  }

  const coupons = db.collection("coupons");
  if ((await coupons.countDocuments()) === 0) {
    await coupons.insertMany(seedCoupons.map((coupon) => ({ ...coupon })));
  }

  const users = db.collection("users");
  if ((await users.countDocuments()) === 0) {
    const seededUsers = await Promise.all(
      seedUsers.map(async (user) => {
        const { password, ...rest } = user;
        const phone = parsePhoneNumberFromString(user.phone, "IN");
        return {
          ...rest,
          phone: phone?.isValid() ? phone.number : user.phone,
          passwordHash: await bcrypt.hash(password, 10),
          emailVerifiedAt: user.role === "customer" ? new Date().toISOString() : null,
          phoneVerifiedAt: null,
          savedCart: [],
          savedWishlist: [],
        };
      }),
    );
    await users.insertMany(seededUsers);
  }
  await ensureAuthCollections(db);
  await ensurePaymentIndexes(db);
}

export async function getMongo() {
  const db = await getDb();
  if (!client) throw new Error("Database unavailable.");
  return { client, db };
}

async function ensureAuthCollections(db: Db) {
  const users = db.collection("users");
  const legacy = await users.find({ role: "customer", passwordHash: { $type: "string" }, email: { $type: "string" }, emailVerifiedAt: { $exists: false } }).toArray();
  if (legacy.length) {
    await users.updateMany(
      { id: { $in: legacy.map((row) => row.id) } },
      { $set: { emailVerifiedAt: new Date().toISOString() } },
    );
  }
  const localPhones = await users.find({ phone: /^\d{10}$/ }).toArray();
  for (const row of localPhones) {
    const phone = parsePhoneNumberFromString(String(row.phone), "IN");
    if (phone?.isValid()) await users.updateOne({ _id: row._id }, { $set: { phone: phone.number } });
  }
  const emailIndex = (await users.indexes()).find((index) => index.key?.email === 1 && index.unique);
  if (emailIndex?.name && !emailIndex.partialFilterExpression) await users.dropIndex(emailIndex.name);
  await users.createIndex(
    { email: 1 },
    { name: "email_1", unique: true, partialFilterExpression: { email: { $type: "string" } } },
  );
  await users.createIndex(
    { phone: 1 },
    { unique: true, partialFilterExpression: { phoneVerifiedAt: { $type: "string" }, phone: { $type: "string" } } },
  ).catch(() => undefined);
  await db.collection("otpChallenges").createIndex({ id: 1 }, { unique: true });
  await db.collection("otpChallenges").createIndex({ destination: 1, createdAt: -1 });
  await db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ userId: 1 });
  await db.collection("checkoutIntents").createIndex({ id: 1 }, { unique: true });
}

export function publicUser(user: { passwordHash?: string; password?: string; [key: string]: unknown }) {
  const copy = { ...user };
  delete copy.passwordHash;
  delete copy._id;
  delete copy.savedCart;
  delete copy.savedWishlist;
  delete copy.savedCoupon;
  copy.password = "";
  copy.email = copy.email || "";
  copy.phone = copy.phone || "";
  copy.addresses = copy.addresses || [];
  return copy;
}
