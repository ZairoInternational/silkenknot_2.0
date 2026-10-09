import bcrypt from "bcryptjs";
import { seedCategories, seedCoupons, seedProducts } from "@/lib/data";
import { databaseConfigured, getDb, publicUser } from "@/lib/mongo";
import { clearSession, currentSession, setSession } from "@/lib/session";
import type { Address, Category, Coupon, Order, Product, Review, User } from "@/lib/types";

function clean<T>(doc: T) {
  if (!doc || typeof doc !== "object") return doc;
  const copy = { ...(doc as Record<string, unknown>) };
  delete copy._id;
  delete copy.passwordHash;
  return copy as T;
}

function offlineCatalog() {
  return {
    configured: false,
    products: seedProducts,
    categories: seedCategories,
    coupons: seedCoupons,
    orders: [] as Order[],
    user: null,
    admin: false,
  };
}

export async function GET() {
  if (!databaseConfigured()) return Response.json(offlineCatalog());
  try {
    const db = await getDb();
    const [products, categories, coupons] = await Promise.all([
      db.collection("products").find().toArray(),
      db.collection("categories").find().sort({ order: 1 }).toArray(),
      db.collection("coupons").find().toArray(),
    ]);
    const session = await currentSession();
    let user = null;
    let orders: Order[] = [];
    let customers: ReturnType<typeof publicUser>[] = [];
    let admin = false;
    if (session) {
      const found = await db.collection("users").findOne({ id: session.id });
      if (found) user = publicUser(found);
      if (session.role === "admin") {
        admin = true;
        customers = (await db.collection("users").find({ role: "customer" }).toArray()).map((item) => publicUser(item));
        orders = (await db.collection("orders").find().sort({ createdAt: -1 }).toArray()).map((order) => clean(order) as unknown as Order);
      } else if (found) {
        orders = (await db.collection("orders").find({ $or: [{ userId: found.id }, { email: found.email }] }).sort({ createdAt: -1 }).toArray()).map((order) => clean(order) as unknown as Order);
      }
    }
    return Response.json({
      configured: true,
      products: products.map((item) => clean(item)),
      categories: categories.map((item) => clean(item)),
      coupons: coupons.map((item) => clean(item)),
      orders,
      user,
      customers,
      admin,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database unavailable.";
    return Response.json({ ...offlineCatalog(), message }, { status: 503 });
  }
}

async function bodyOf(request: Request) {
  return (await request.json()) as Record<string, unknown>;
}

function fail(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const body = await bodyOf(request);
  const action = String(body.action || "");
  if (!databaseConfigured()) {
    return fail("Add your MongoDB connection string as MONGODB_URI in .env.local, then restart the app.");
  }

  try {
    const db = await getDb();
    const users = db.collection("users");
    const products = db.collection<Product>("products");
    const categories = db.collection<Category>("categories");
    const coupons = db.collection<Coupon>("coupons");
    const orders = db.collection<Order>("orders");

    if (action === "lookup") {
      const email = String(body.email || "").trim().toLowerCase();
      const user = await users.findOne({ email, role: "customer" });
      if (!user) return fail("We couldn’t find that account.");
      return Response.json({ ok: true });
    }

    if (action === "register") {
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!name || !email || password.length < 6) return fail("Name, email, and a password of at least 6 characters are required.");
      const existing = await users.findOne({ email });
      if (existing) return fail("An account with this email already exists.");
      const user = {
        id: `user-${Date.now()}`,
        name,
        email,
        phone: "",
        role: "customer" as const,
        addresses: [] as Address[],
        passwordHash: await bcrypt.hash(password, 10),
      };
      await users.insertOne(user);
      await setSession({ id: user.id, role: "customer" });
      return Response.json({ ok: true, message: "Welcome to Silk Knot.", user: publicUser(user) });
    }

    if (action === "login" || action === "admin-login") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = await users.findOne({ email });
      if (!user || !(await bcrypt.compare(password, String(user.passwordHash || "")))) {
        return fail(action === "admin-login" ? "Those studio details are not recognised." : "Email or password is incorrect.");
      }
      if (action === "admin-login" && user.role !== "admin") return fail("Those studio details are not recognised.");
      if (action === "login" && user.role !== "customer") return fail("Use the studio login for this account.");
      await setSession({ id: String(user.id), role: user.role === "admin" ? "admin" : "customer" });
      const orderQuery = user.role === "admin" ? {} : { $or: [{ userId: user.id }, { email: user.email }] };
      const mine = (await orders.find(orderQuery).sort({ createdAt: -1 }).toArray()).map((order) => clean(order));
      const customers = user.role === "admin"
        ? (await users.find({ role: "customer" }).toArray()).map((item) => publicUser(item))
        : [];
      return Response.json({ ok: true, user: publicUser(user), orders: mine, customers, admin: user.role === "admin" });
    }

    if (action === "logout" || action === "admin-logout") {
      await clearSession();
      return Response.json({ ok: true });
    }

    if (action === "reset-password") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (password.length < 6) return fail("Use at least 6 characters.");
      const user = await users.findOne({ email, role: "customer" });
      if (!user) return fail("We couldn’t find that account.");
      await users.updateOne({ id: user.id }, { $set: { passwordHash: await bcrypt.hash(password, 10) } });
      return Response.json({ ok: true, message: "Password updated. You can log in." });
    }

    if (action === "review") {
      const review = body.review as Review;
      await products.updateOne(
        { id: String(body.productId) },
        { $push: { reviews: review }, $inc: { reviewCount: 1 } },
      );
      return Response.json({ ok: true });
    }

    if (action === "place-order") {
      const draft = body.order as Omit<Order, "id" | "number" | "createdAt" | "status">;
      if (!draft?.items?.length) return fail("Your bag is empty.");
      const catalog = await products.find({ id: { $in: draft.items.map((item) => item.productId) } }).toArray();
      for (const item of draft.items) {
        const product = catalog.find((entry) => entry.id === item.productId);
        const variant = product?.variants.find((option) => option.label === item.variantLabel);
        if (!product || !variant || variant.stock < item.quantity) return fail(`${item.name} no longer has enough stock.`);
      }
      for (const item of draft.items) {
        await products.updateOne(
          { id: item.productId, "variants.label": item.variantLabel },
          { $inc: { "variants.$.stock": -item.quantity } },
        );
      }
      const session = await currentSession();
      const order: Order = {
        ...draft,
        userId: session?.role === "customer" ? session.id : undefined,
        id: `ord-${Date.now()}`,
        number: `SK${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        status: "placed",
      };
      await orders.insertOne(order);
      const fresh = (await products.find().toArray()).map((item) => clean(item));
      return Response.json({ ok: true, order: clean(order), products: fresh });
    }

    const session = await currentSession();
    if (!session) return fail("Log in to continue.", 401);

    if (action === "profile") {
      const name = String(body.name || "").trim();
      const phone = String(body.phone || "").trim();
      if (!name) return fail("Add your name.");
      await users.updateOne({ id: session.id }, { $set: { name, phone } });
      const user = await users.findOne({ id: session.id });
      return Response.json({ ok: true, message: "Profile saved.", user: user ? publicUser(user) : null });
    }

    if (action === "save-address" || action === "delete-address") {
      const user = await users.findOne({ id: session.id });
      if (!user) return fail("Log in to continue.", 401);
      let addresses = (user.addresses as Address[]) || [];
      if (action === "delete-address") {
        addresses = addresses.filter((item) => item.id !== body.id);
      } else {
        const address = body.address as Address;
        const others = addresses.filter((item) => item.id !== address.id);
        addresses = address.isDefault
          ? [...others.map((item) => ({ ...item, isDefault: false })), address]
          : [...others, address];
      }
      if (addresses[0] && !addresses.some((item) => item.isDefault)) addresses[0] = { ...addresses[0], isDefault: true };
      await users.updateOne({ id: session.id }, { $set: { addresses } });
      const next = await users.findOne({ id: session.id });
      return Response.json({ ok: true, user: next ? publicUser(next) : null });
    }

    if (session.role !== "admin") return fail("Studio access is required.", 403);

    if (action === "save-product") {
      const product = clean(body.product) as Product;
      await products.updateOne({ id: product.id }, { $set: product }, { upsert: true });
      return Response.json({ ok: true, message: body.isNew ? "Product created." : "Product saved.", product });
    }

    if (action === "delete-product") {
      await products.deleteOne({ id: String(body.id) });
      return Response.json({ ok: true, message: "Product deleted." });
    }

    if (action === "save-category") {
      const category = clean(body.category) as Category;
      await categories.updateOne({ id: category.id }, { $set: { ...category, slug: category.id } }, { upsert: true });
      return Response.json({ ok: true, message: "Category saved." });
    }

    if (action === "delete-category") {
      const id = String(body.id);
      if (await products.countDocuments({ categoryId: id })) {
        return fail("Move products out of this category before deleting it.");
      }
      await categories.deleteOne({ id });
      return Response.json({ ok: true, message: "Category deleted." });
    }

    if (action === "move-category") {
      const list = (body.categories as Category[]) || [];
      await Promise.all(list.map((category) => categories.updateOne({ id: category.id }, { $set: { order: category.order } })));
      return Response.json({ ok: true });
    }

    if (action === "order-status") {
      await orders.updateOne({ id: String(body.id) }, { $set: { status: body.status as Order["status"] } });
      return Response.json({ ok: true });
    }

    if (action === "save-coupon") {
      const coupon = clean(body.coupon) as Coupon;
      await coupons.updateOne({ id: coupon.id }, { $set: coupon }, { upsert: true });
      return Response.json({ ok: true, message: "Offer saved." });
    }

    if (action === "delete-coupon") {
      await coupons.deleteOne({ id: String(body.id) });
      return Response.json({ ok: true });
    }

    return fail("Unknown action.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database unavailable.";
    return fail(message, 503);
  }
}
