import { MongoClient, type Db } from "mongodb";
import bcrypt from "bcryptjs";
import { seedCategories, seedCoupons, seedProducts, seedUsers } from "@/lib/data";

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
        return { ...rest, passwordHash: await bcrypt.hash(password, 10) };
      }),
    );
    await users.insertMany(seededUsers);
    await users.createIndex({ email: 1 }, { unique: true });
  }
}

export function publicUser(user: { passwordHash?: string; password?: string; [key: string]: unknown }) {
  const copy = { ...user };
  delete copy.passwordHash;
  delete copy._id;
  copy.password = "";
  return copy;
}
