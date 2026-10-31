import { MongoClient, type Db } from "mongodb";
import { ensurePaymentIndexes } from "@/lib/payments/indexes";
import bcrypt from "bcryptjs";
import { seedCategories, seedCoupons, seedProducts, seedUsers } from "@/lib/data";
import { ensureAnnouncementContent } from "@/lib/announcements/server";
import { ensureBannerBootstrap } from "@/lib/banners/server";
import { ensureBrandContent } from "@/lib/brand/server";
import { ensureHeroContent } from "@/lib/hero/server";
import { ensureSiteMediaContent } from "@/lib/site-media/server";
import { approxProductWeight } from "@/lib/shipping/weight";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "silkknot";
const MIGRATION_META_ID = "db-migrations-v1";
const BOOTSTRAP_META_ID = "db-bootstrap-v1";

let client: MongoClient | null = null;
let connecting: Promise<MongoClient> | null = null;
let seeded: Promise<void> | null = null;
let heavyMigrations: Promise<void> | null = null;

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

async function ensureIndex(
  db: Db,
  collection: string,
  keys: Record<string, 1 | -1>,
  options: { name: string; unique?: boolean; partialFilterExpression?: Record<string, unknown> },
) {
  try {
    await db.collection(collection).createIndex(keys, options);
  } catch {
    // Index may already exist under another name or conflict with legacy data.
  }
}

async function ensureStorefrontIndexes(db: Db) {
  await Promise.all([
    ensureIndex(db, "products", { id: 1 }, { name: "products_id", unique: true }),
    ensureIndex(db, "products", { slug: 1 }, { name: "products_slug", unique: true }),
    ensureIndex(db, "products", { active: 1, categoryId: 1 }, { name: "products_active_category" }),
    ensureIndex(db, "categories", { order: 1 }, { name: "categories_order" }),
    ensureIndex(db, "users", { id: 1 }, { name: "users_id", unique: true }),
    ensureIndex(db, "orders", { userId: 1, createdAt: -1 }, { name: "orders_user_created" }),
    ensureIndex(db, "orders", { email: 1, createdAt: -1 }, { name: "orders_email_created" }),
  ]);
}

async function ensureAuthIndexes(db: Db) {
  const users = db.collection("users");
  try {
    const emailIndex = (await users.indexes()).find((index) => index.key?.email === 1 && index.unique);
    if (emailIndex?.name && !emailIndex.partialFilterExpression) await users.dropIndex(emailIndex.name);
  } catch {
    // ignore
  }
  await ensureIndex(db, "users", { email: 1 }, {
    name: "email_1",
    unique: true,
    partialFilterExpression: { email: { $type: "string" } },
  });
  await ensureIndex(db, "users", { phone: 1 }, {
    name: "phone_1",
    unique: true,
    partialFilterExpression: { phoneVerifiedAt: { $type: "string" }, phone: { $type: "string" } },
  });
  await ensureIndex(db, "otpChallenges", { id: 1 }, { name: "otp_challenges_id", unique: true });
  await ensureIndex(db, "otpChallenges", { destination: 1, createdAt: -1 }, { name: "otp_challenges_destination" });
  await ensureIndex(db, "sessions", { tokenHash: 1 }, { name: "sessions_token_hash", unique: true });
  await ensureIndex(db, "sessions", { userId: 1 }, { name: "sessions_user" });
  await ensureIndex(db, "checkoutIntents", { id: 1 }, { name: "checkout_intents_id", unique: true });
}

/** Empty-collection seeds + content docs + indexes. Heavy backfills run in the background. */
async function seedIfEmpty(db: Db) {
  const bootstrap = await db.collection("siteContent").findOne(
    { id: BOOTSTRAP_META_ID },
    { projection: { ready: 1 } },
  );
  if (bootstrap?.ready) {
    // Indexes are idempotent; refresh in background so first request stays cheap.
    void Promise.all([ensureAuthIndexes(db), ensureStorefrontIndexes(db), ensurePaymentIndexes(db)]);
    if (!heavyMigrations) {
      heavyMigrations = runHeavyMigrations(db).catch((error) => {
        heavyMigrations = null;
        console.warn("[mongo] background migration failed", {
          name: error instanceof Error ? error.name : "unknown",
        });
      });
    }
    return;
  }

  const products = db.collection("products");
  if (!(await products.findOne({}, { projection: { _id: 1 } }))) {
    await products.insertMany(seedProducts.map((product) => ({ ...product })));
  }

  const categories = db.collection("categories");
  if (!(await categories.findOne({}, { projection: { _id: 1 } }))) {
    await categories.insertMany(seedCategories.map((category) => ({ ...category, slug: category.id })));
  } else {
    // Ensure seed categories exist without blocking on slug backfills.
    await Promise.all(
      seedCategories.map(async (category) => {
        const found = await categories.findOne({ $or: [{ id: category.id }, { slug: category.id }] });
        if (!found) await categories.insertOne({ ...category, slug: category.id });
      }),
    );
  }

  const coupons = db.collection("coupons");
  if (!(await coupons.findOne({}, { projection: { _id: 1 } }))) {
    await coupons.insertMany(seedCoupons.map((coupon) => ({ ...coupon })));
  }

  const users = db.collection("users");
  if (!(await users.findOne({}, { projection: { _id: 1 } }))) {
    const adminSeedEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
    const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD?.trim();
    const adminSeedPhone = process.env.ADMIN_SEED_PHONE?.trim();
    const seededUsers = await Promise.all(
      seedUsers.map(async (user) => {
        const { password, ...rest } = user;
        const isAdmin = user.role === "admin";
        const email = isAdmin && adminSeedEmail ? adminSeedEmail : user.email;
        const plain = isAdmin && adminSeedPassword ? adminSeedPassword : password;
        const rawPhone = isAdmin && adminSeedPhone ? adminSeedPhone : user.phone;
        const phone = parsePhoneNumberFromString(rawPhone, "IN");
        return {
          ...rest,
          email,
          phone: phone?.isValid() ? phone.number : rawPhone,
          passwordHash: await bcrypt.hash(plain, 10),
          emailVerifiedAt: user.role === "customer" ? new Date().toISOString() : null,
          phoneVerifiedAt: null,
          savedCart: [],
          savedWishlist: [],
        };
      }),
    );
    await users.insertMany(seededUsers);
  }

  await Promise.all([
    ensureHeroContent(db),
    ensureAnnouncementContent(db),
    ensureBrandContent(db),
    ensureSiteMediaContent(db),
    ensureBannerBootstrap(db),
  ]);

  await Promise.all([ensureAuthIndexes(db), ensureStorefrontIndexes(db), ensurePaymentIndexes(db)]);

  const now = new Date().toISOString();
  await db.collection("siteContent").updateOne(
    { id: BOOTSTRAP_META_ID },
    { $set: { id: BOOTSTRAP_META_ID, ready: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );

  if (!heavyMigrations) {
    heavyMigrations = runHeavyMigrations(db).catch((error) => {
      heavyMigrations = null;
      console.warn("[mongo] background migration failed", {
        name: error instanceof Error ? error.name : "unknown",
      });
    });
  }
}

async function runHeavyMigrations(db: Db) {
  const site = db.collection("siteContent");
  const meta = await site.findOne({ id: MIGRATION_META_ID });
  if (meta?.weightSlugPhoneDone) return;

  const products = db.collection("products");
  const unweighed = await products
    .find({ $or: [{ weightGrams: { $exists: false } }, { weightGrams: { $lte: 0 } }] })
    .toArray();
  if (unweighed.length) {
    await Promise.all(
      unweighed.map((product) =>
        products.updateOne(
          { _id: product._id },
          { $set: { weightGrams: approxProductWeight(String(product.type || "")) } },
        ),
      ),
    );
  }

  const categories = db.collection("categories");
  const missingSlug = await categories.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }] }).toArray();
  if (missingSlug.length) {
    await Promise.all(
      missingSlug.map((row) => {
        const slug = typeof row.id === "string" && row.id ? row.id : String(row._id);
        return categories.updateOne({ _id: row._id }, { $set: { slug } });
      }),
    );
  }

  const users = db.collection("users");
  const legacy = await users
    .find({
      role: "customer",
      passwordHash: { $type: "string" },
      email: { $type: "string" },
      emailVerifiedAt: { $exists: false },
    })
    .toArray();
  if (legacy.length) {
    await users.updateMany(
      { id: { $in: legacy.map((row) => row.id) } },
      { $set: { emailVerifiedAt: new Date().toISOString() } },
    );
  }

  const localPhones = await users.find({ phone: /^\d{10}$/ }).toArray();
  if (localPhones.length) {
    await Promise.all(
      localPhones.map((row) => {
        const phone = parsePhoneNumberFromString(String(row.phone), "IN");
        if (!phone?.isValid()) return Promise.resolve();
        return users.updateOne({ _id: row._id }, { $set: { phone: phone.number } });
      }),
    );
  }

  const now = new Date().toISOString();
  await site.updateOne(
    { id: MIGRATION_META_ID },
    {
      $set: { id: MIGRATION_META_ID, kind: "db-migrations", weightSlugPhoneDone: true, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function getMongo() {
  const db = await getDb();
  if (!client) throw new Error("Database unavailable.");
  return { client, db };
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
