import bcrypt from "bcryptjs";
import { seedCategories, seedCoupons, seedProducts } from "@/lib/data";
import { databaseConfigured, getDb, publicUser } from "@/lib/mongo";
import { readBag, saveBag } from "@/lib/auth/bag";
import { csrfHeaderMatches, jsonError, sameOrigin } from "@/lib/auth/http";
import { applyAdminStatus, CheckoutError, publicOrder, type StoredOrder } from "@/lib/payments/service";
import { customerOrderVisible } from "@/lib/shipping/states";
import { clearSession, currentSession, ensureCsrfCookie, setSession } from "@/lib/session";
import type { Address, CartItem, Category, Coupon, Order, Product, Review } from "@/lib/types";

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
    await ensureCsrfCookie();
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
    let bag = null;
    if (session) {
      const found = await db.collection("users").findOne({ id: session.id });
      if (found) user = publicUser(found);
      if (session.role === "customer") bag = await readBag(db, session.id);
      if (session.role === "admin") {
        admin = true;
        customers = (await db.collection("users").find({ role: "customer" }).toArray()).map((item) => publicUser(item));
        orders = (await db.collection("orders").find().sort({ createdAt: -1 }).toArray()).map((order) => publicOrder(order as unknown as StoredOrder));
      } else if (found) {
        const orderQuery = found.email
          ? { $or: [{ userId: found.id }, { email: found.email }] }
          : { userId: found.id };
        orders = (await db.collection("orders").find(orderQuery).sort({ createdAt: -1 }).toArray())
          .map((order) => publicOrder(order as unknown as StoredOrder))
          .filter((order) => customerOrderVisible(order));
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
      bag,
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
  if (!sameOrigin(request)) return jsonError("Request blocked.", 403);
  const body = await bodyOf(request);
  const action = String(body.action || "");
  const openActions = new Set(["admin-login"]);
  if (!openActions.has(action) && !csrfHeaderMatches(request)) return jsonError("Request blocked.", 403);
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

    if (action === "lookup" || action === "register" || action === "login" || action === "reset-password") {
      return fail("Sign in with a one-time code sent to your WhatsApp or email.", 410);
    }

    if (action === "admin-login") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = await users.findOne({ email });
      if (!user || user.role !== "admin" || !(await bcrypt.compare(password, String(user.passwordHash || "")))) {
        return fail("Those studio details are not recognised.");
      }
      await setSession({ id: String(user.id), role: "admin" });
      const orderQuery = user.role === "admin" ? {} : { $or: [{ userId: user.id }, { email: user.email }] };
      const mine = (await orders.find(orderQuery).sort({ createdAt: -1 }).toArray()).map((order) => publicOrder(order as unknown as StoredOrder));
      const customers = user.role === "admin"
        ? (await users.find({ role: "customer" }).toArray()).map((item) => publicUser(item))
        : [];
      return Response.json({ ok: true, user: publicUser(user), orders: mine, customers, admin: user.role === "admin" });
    }

    if (action === "logout" || action === "admin-logout") {
      await clearSession();
      return Response.json({ ok: true });
    }

    if (action === "review") {
      const session = await currentSession();
      if (!session || session.role !== "customer") return fail("Log in to review this product.");
      const account = await users.findOne({ id: session.id });
      if (!account) return fail("Log in to review this product.");
      const review = body.review as Review;
      const entry = { ...review, name: account.name };
      await products.updateOne(
        { id: String(body.productId) },
        { $push: { reviews: { $each: [entry], $position: 0 } }, $inc: { reviewCount: 1 } },
      );
      return Response.json({ ok: true });
    }

    if (action === "review-vote") {
      const session = await currentSession();
      if (!session || session.role !== "customer") return fail("Log in to mark this review.");
      const productId = String(body.productId || "");
      const reviewId = String(body.reviewId || "");
      const vote = body.vote === "yes" || body.vote === "no" ? body.vote : "";
      if (!productId || !reviewId || !vote) return fail("That vote could not be saved.");
      const voterKey = `user:${session.id}`;
      const votes = db.collection("reviewVotes");
      const existing = await votes.findOne({ productId, reviewId, voterKey });
      if (existing?.vote !== vote) {
        if (existing) await votes.updateOne({ _id: existing._id }, { $set: { vote } });
        else await votes.insertOne({ productId, reviewId, voterKey, vote });
      }
      const helpful = await votes.countDocuments({ productId, reviewId, vote: "yes" });
      await products.updateOne({ id: productId, "reviews.id": reviewId }, { $set: { "reviews.$.helpful": helpful } });
      return Response.json({ ok: true, helpful, vote });
    }

    if (action === "review-report") {
      const session = await currentSession();
      if (!session || session.role !== "customer") return fail("Log in to report this review.");
      const productId = String(body.productId || "");
      const reviewId = String(body.reviewId || "");
      if (!productId || !reviewId) return fail("That report could not be saved.");
      await db.collection("reviewReports").updateOne(
        { productId, reviewId, userId: session.id },
        { $setOnInsert: { productId, reviewId, userId: session.id, createdAt: new Date().toISOString() } },
        { upsert: true },
      );
      return Response.json({ ok: true });
    }

    if (action === "my-review-votes") {
      const session = await currentSession();
      if (!session || session.role !== "customer") return Response.json({ ok: true, votes: {}, reported: [] });
      const voterKey = `user:${session.id}`;
      const rows = await db.collection("reviewVotes").find({ voterKey }).toArray();
      const reports = await db.collection("reviewReports").find({ userId: session.id }).toArray();
      const votes = Object.fromEntries(rows.map((row) => [String(row.reviewId), row.vote === "no" ? "no" : "yes"]));
      return Response.json({ ok: true, votes, reported: reports.map((row) => String(row.reviewId)) });
    }

    if (action === "sync-bag") {
      const session = await currentSession();
      if (!session || session.role !== "customer") return fail("Log in to continue.", 401);
      const replaced = await saveBag(db, session.id, {
        cart: Array.isArray(body.cart) ? body.cart as CartItem[] : [],
        wishlist: Array.isArray(body.wishlist) ? (body.wishlist as string[]) : [],
        couponCode: typeof body.couponCode === "string" ? body.couponCode : null,
      });
      return Response.json({ ok: true, ...replaced });
    }

    if (action === "place-order") {
      return fail("An order is saved only after the payment is captured.", 410);
    }

    const session = await currentSession();
    if (!session) return fail("Log in to continue.", 401);

    if (action === "profile") {
      if (session.role !== "customer") return fail("Log in to continue.", 401);
      const name = String(body.name || "").trim().replace(/\s+/g, " ");
      if (name.length < 2 || name.length > 80) return fail("Enter your name.");
      await users.updateOne({ id: session.id }, { $set: { name, nameSetAt: new Date().toISOString() } });
      const user = await users.findOne({ id: session.id });
      return Response.json({ ok: true, message: "Profile saved.", user: user ? publicUser(user) : null });
    }

    if ((action === "save-address" || action === "delete-address") && session.role === "customer") {
      const user = await users.findOne({ id: session.id });
      if (!user) return fail("Log in to continue.", 401);
      let addresses = (user.addresses as Address[]) || [];
      if (action === "delete-address") {
        addresses = addresses.filter((item) => item.id !== body.id);
      } else {
        const raw = (body.address || {}) as Record<string, unknown>;
        const address: Address = {
          id: String(raw.id || ""),
          label: String(raw.label || "Home"),
          name: String(raw.name || ""),
          line1: String(raw.line1 || ""),
          line2: String(raw.line2 || ""),
          city: String(raw.city || ""),
          postal: String(raw.postal || ""),
          country: String(raw.country || "India"),
          phone: String(raw.phone || ""),
          isDefault: Boolean(raw.isDefault),
        };
        // Drop legacy `state` from older saved addresses.
        const others = addresses.map((item) => {
          const { state: _legacy, ...rest } = item as Address & { state?: string };
          void _legacy;
          return rest;
        });
        const without = others.filter((item) => item.id !== address.id);
        addresses = address.isDefault
          ? [...without.map((item) => ({ ...item, isDefault: false })), address]
          : [...without, address];
      }
      if (addresses[0] && !addresses.some((item) => item.isDefault)) addresses[0] = { ...addresses[0], isDefault: true };
      await users.updateOne({ id: session.id }, { $set: { addresses } });
      const next = await users.findOne({ id: session.id });
      return Response.json({ ok: true, user: next ? publicUser(next) : null });
    }

    if (session.role !== "admin") return fail("Studio access is required.", 403);

    if (action === "save-product") {
      const product = clean(body.product) as Product;
      if ((product.images || []).some((src) => src.startsWith("data:") || src.startsWith("blob:"))) {
        return fail("Browse product photos so they upload to the image host. Paths already in the public folder can stay as they are.");
      }
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
      try {
        const order = await applyAdminStatus(db, String(body.id || ""), body.status as Order["status"]);
        return Response.json({ ok: true, order });
      } catch (error) {
        if (error instanceof CheckoutError) return fail(error.message, error.code === "conflict" ? 409 : 400);
        return fail("Could not update the order.", 500);
      }
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
