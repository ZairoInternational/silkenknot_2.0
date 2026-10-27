"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { formatDate, formatPrice, slugify } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Category, Coupon, Order, OrderStatus, Product, Variant } from "@/lib/types";
import type { HeroOffer } from "@/lib/hero/content";
import { DEFAULT_HERO_OFFER } from "@/lib/hero/content";
import type { BrandSettings } from "@/lib/brand/content";
import { DEFAULT_BRAND } from "@/lib/brand/content";
import { primeBrandCache } from "@/lib/brand/client";
function linesToList(value: string) {
  return value.split("\n").map((item) => item.trimEnd());
}
import { Mark, Media } from "@/components/ui";
import { csrfHeaders } from "@/lib/auth/browser";

const links = [
  ["Overview", "/admin"],
  ["Products", "/admin/products"],
  ["Categories", "/admin/categories"],
  ["Orders", "/admin/orders"],
  ["Shipping", "/admin/shipping"],
  ["Fees", "/admin/fees"],
  ["Customers", "/admin/customers"],
  ["Offers", "/admin/offers"],
  ["Hero", "/admin/hero"],
  ["Brand", "/admin/brand"],
  ["Announcements", "/admin/announcements"],
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const login = pathname === "/admin/login";

  useEffect(() => {
    if (!store.ready) return;
    if (!store.adminAuthed && !login) router.replace("/admin/login");
    if (store.adminAuthed && login) router.replace("/admin");
  }, [store.ready, store.adminAuthed, login, router]);

  if (!store.ready) return <p className="p-10 text-mute">Opening the studio…</p>;
  if (login) return <div className="min-h-screen bg-cream">{children}</div>;
  if (!store.adminAuthed) return null;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-paper p-6 md:block">
        <Link href="/admin" className="inline-flex items-center gap-2 font-serif text-3xl">
          <Mark className="h-6 w-9" />
          Silken Knot
        </Link>
        
        <nav className="mt-10 space-y-2" aria-label="Studio">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className={`block py-2 text-sm ${pathname === href ? "text-ink" : "text-mute"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="md:pl-60">
        <header className="flex h-16 items-center justify-between border-b border-line px-4 md:px-8">
          <nav className="flex gap-4 overflow-x-auto text-sm md:hidden">
            {links.map(([label, href]) => (
              <Link key={href} href={href}>{label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-[11px] uppercase tracking-[0.16em]">
            <Link href="/">View store</Link>
            <button type="button" onClick={() => void store.logoutAdmin()}>Log out</button>
          </div>
        </header>
        <div className="px-4 py-8 md:px-8">{children}</div>
      </div>
    </div>
  );
}

export function AdminLogin() {
  const store = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await store.loginAdmin(email, password);
        if (!result.ok) setError(result.message);
        else router.push("/admin");
      }}
    >
      <p className="eyebrow text-mute">Studio</p>
      <h1 className="mt-3 font-serif text-6xl">Log in</h1>
      <label className="mt-10 text-sm">
        Email
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full border-b border-line bg-transparent outline-none" />
      </label>
      <label className="mt-6 text-sm">
        Password
        <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full border-b border-line bg-transparent outline-none" />
      </label>
      {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
      <button type="submit" className="mt-8 h-12 bg-ink text-[11px] uppercase tracking-[0.2em] text-paper">Enter studio</button>
      <p className="mt-6 text-sm text-mute">admin@silkknot.com / studio123</p>
    </form>
  );
}

export function Dashboard() {
  const store = useStore();
  const revenue = store.orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0);
  const low = store.products.filter((product) => product.variants.some((variant) => variant.stock < 8));
  const stats = [
    [store.products.length, "Products"],
    [store.orders.length, "Orders"],
    [store.users.filter((user) => user.role === "customer").length, "Customers"],
    [formatPrice(revenue), "Revenue"],
  ];
  return (
    <div>
      <h1 className="font-serif text-5xl">Overview</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="bg-paper p-6">
            <p className="font-serif text-4xl">{value}</p>
            <p className="mt-2 eyebrow text-mute">{label}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-12 font-serif text-3xl">Needs attention</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {low.map((product) => <li key={product.id}>{product.name} is low in stock.</li>)}
        {low.length === 0 ? <li className="text-mute">Stock looks comfortable.</li> : null}
      </ul>
    </div>
  );
}

export function ProductIndex() {
  const store = useStore();
  return (
    <div>
      <div className="flex items-end justify-between">
        <h1 className="font-serif text-5xl">Products</h1>
        <Link href="/admin/products/new" className="bg-ink px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-paper">Add product</Link>
      </div>
      <ul className="mt-8 divide-y divide-line">
        {store.products.map((product) => (
          <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <Link href={`/admin/products/${product.id}`} className="font-serif text-2xl">{product.name}</Link>
              <p className="text-sm text-mute">{product.type} · {formatPrice(product.price)} · {product.active ? "Active" : "Hidden"}</p>
            </div>
            <Link href={`/admin/products/${product.id}`} className="text-[11px] uppercase tracking-[0.16em]">Edit</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductEditor({ id }: { id?: string }) {
  const store = useStore();
  const existing = id ? store.productById(id) : undefined;
  if (id && store.ready && !existing) return <p>Product not found.</p>;
  if (!store.ready) return <p>Loading…</p>;
  return <ProductForm initial={existing} />;
}

function blankProduct(): Product {
  // Stable id before first save so Bunny paths can use products/{id}/… immediately.
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `p-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`
      : `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    slug: "",
    name: "",
    categoryId: "body-care",
    type: "Body Butter",
    scent: "",
    price: 0,
    rating: 5,
    reviewCount: 0,
    shortDescription: "",
    description: "",
    benefits: [""],
    ingredients: [""],
    howToUse: [""],
    showDescription: true,
    showIngredients: false,
    showHowToUse: false,
    showBenefits: false,
    images: [],
    variants: [{ id: "standard", label: "Standard", price: 0, stock: 0 }],
    featured: false,
    bestseller: false,
    newArrival: false,
    active: true,
    weightGrams: 200,
    createdAt: new Date().toISOString(),
    reviews: [],
    faqs: [],
  };
}

function ProductForm({ initial }: { initial?: Product }) {
  const store = useStore();
  const router = useRouter();
  const [product, setProduct] = useState<Product>(initial ?? blankProduct());
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /** CDN URLs removed in the editor — deleted only after a successful product save. */
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setProduct((current) => ({ ...current, [key]: value }));

  const onFiles = async (files: FileList | null) => {
    if (!files?.length || uploading) return;
    if (!product.id) {
      setError("Save a product id before uploading images.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of [...files]) {
        const prepared = await compress(file);
        const body = new FormData();
        body.append("file", prepared, "product.webp");
        body.append("productId", product.id);
        body.append("role", product.images.length + urls.length === 0 ? "main" : "gallery");
        const response = await fetch("/api/admin/media", {
          method: "POST",
          headers: csrfHeaders(false),
          body,
        });
        const payload = await response.json() as { url?: string; message?: string };
        if (!response.ok || !payload.url) throw new Error(payload.message || "Could not upload that image.");
        urls.push(payload.url);
      }
      setProduct((current) => ({ ...current, images: [...current.images, ...urls] }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const src = product.images[index];
    set("images", product.images.filter((_, item) => item !== index));
    if (!src || src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) return;
    setPendingDeletes((current) => (current.includes(src) ? current : [...current, src]));
  };

  return (
    <form
      className="mx-auto max-w-3xl space-y-10"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextImages = product.images;
        const result = await store.saveProduct(
          {
            ...product,
            benefits: product.benefits.map((item) => item.trim()).filter(Boolean),
            ingredients: product.ingredients.map((item) => item.trim()).filter(Boolean),
            howToUse: product.howToUse.map((item) => item.trim()).filter(Boolean),
            slug: slugify(product.slug || product.name),
          },
          !initial,
        );
        if (!result.ok) return setError(result.message);
        // Delete CDN objects only after DB save succeeds and the URL is no longer on this product.
        const toDelete = pendingDeletes.filter((url) => !nextImages.includes(url));
        for (const url of toDelete) {
          try {
            await fetch("/api/admin/media", {
              method: "DELETE",
              headers: { ...csrfHeaders(), "Content-Type": "application/json" },
              body: JSON.stringify({ url }),
            });
          } catch {
            // Orphan cleanup can retry later; product record is already correct.
          }
        }
        setPendingDeletes([]);
        router.push("/admin/products");
      }}
    >
      <div className="flex items-end justify-between">
        <h1 className="font-serif text-5xl">{initial ? "Edit product" : "New product"}</h1>
      </div>
      <section className="space-y-5 bg-paper p-6">
        <p className="eyebrow text-mute">Product information</p>
        <AdminField label="Product name" value={product.name} onChange={(value) => set("name", value)} />
        <label className="block text-sm">
          Category
          <select value={product.categoryId} onChange={(event) => set("categoryId", event.target.value)} className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none">
            {store.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <AdminField label="Type" value={product.type} onChange={(value) => set("type", value)} />
        <AdminField label="Scent" value={product.scent} onChange={(value) => set("scent", value)} />
        <label className="block text-sm">
          Approximate weight (grams)
          <input
            type="number"
            min={1}
            max={30000}
            value={product.weightGrams || ""}
            onChange={(event) => set("weightGrams", Math.round(Number(event.target.value) || 0))}
            className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
          />
          <span className="mt-2 block text-xs text-mute">Used to estimate the parcel for this product. Shoppers do not see it. The shipment uses the total of the items in the order.</span>
        </label>
        <label className="block text-sm">
          Short description
          <textarea value={product.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} className="mt-2 min-h-20 w-full border-b border-line bg-transparent outline-none" />
        </label>
      </section>
      <section className="space-y-4 bg-paper p-6">
        <p className="eyebrow text-mute">Detail sections (optional)</p>
        <p className="text-xs text-mute">Check a section to show it on the product page, then author the copy. One item per line for lists.</p>
        {([
          ["showDescription", "Show description", "description"] as const,
          ["showBenefits", "Show benefits", "benefits"] as const,
          ["showIngredients", "Show ingredients", "ingredients"] as const,
          ["showHowToUse", "Show how to use", "howToUse"] as const,
        ]).map(([flag, label, field]) => {
          const hasList = field === "benefits" || field === "ingredients" || field === "howToUse";
          const enabled =
            product[flag] ??
            (field === "description"
              ? Boolean(product.description.trim())
              : product[field].some((item) => item.trim()));
          return (
            <div key={flag} className="space-y-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={enabled} onChange={(event) => set(flag, event.target.checked)} />
                {label}
              </label>
              {enabled ? (
                <label className="block text-sm">
                  {field === "description"
                    ? "Description"
                    : field === "benefits"
                      ? "Benefits (one per line)"
                      : field === "ingredients"
                        ? "Ingredients (one per line)"
                        : "How to use (one step per line)"}
                  <textarea
                    value={hasList ? product[field].join("\n") : product.description}
                    onChange={(event) => {
                      if (hasList) set(field, linesToList(event.target.value));
                      else set("description", event.target.value);
                    }}
                    className="mt-2 min-h-24 w-full border-b border-line bg-transparent outline-none"
                  />
                </label>
              ) : null}
            </div>
          );
        })}
      </section>
      <section className="bg-paper p-6">
        <p className="eyebrow text-mute">Media</p>
        <label
          className="mt-4 flex min-h-32 cursor-pointer items-center justify-center border border-dashed border-stone text-sm text-mute"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void onFiles(event.dataTransfer.files);
          }}
        >
          {uploading ? "Uploading to the image host…" : "Drop images or browse"}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} className="sr-only" onChange={(event) => void onFiles(event.target.files)} />
        </label>
        <div className="mt-3 flex gap-2">
          <input id="image-url" placeholder="Or paste an image URL" className="h-11 flex-1 border-b border-line bg-transparent outline-none" />
          <button
            type="button"
            className="text-[11px] uppercase tracking-[0.16em]"
            onClick={() => {
              const input = document.getElementById("image-url") as HTMLInputElement;
              const value = input.value.trim();
              if (!value) return;
              if (value.startsWith("data:") || value.startsWith("blob:")) {
                setError("Browse a photo to upload it, or paste a public image address.");
                return;
              }
              set("images", [...product.images, value]);
              input.value = "";
            }}
          >
            Add URL
          </button>
        </div>
        <ul className="mt-4 flex flex-wrap gap-3">
          {product.images.map((src, index) => (
            <li
              key={`${src}-${index}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null || dragIndex === index) return;
                const images = [...product.images];
                const [moved] = images.splice(dragIndex, 1);
                images.splice(index, 0, moved);
                set("images", images);
                setDragIndex(null);
              }}
              className="w-24"
            >
              <span className="relative block aspect-[4/5] bg-cream">
                <Media src={src} alt="" sizes="96px" />
              </span>
              <button type="button" className="mt-1 text-[11px] uppercase tracking-[0.14em]" onClick={() => void removeImage(index)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-4 bg-paper p-6">
        <p className="eyebrow text-mute">Pricing & inventory</p>
        {product.variants.map((variant, index) => (
          <div key={variant.id} className="grid gap-3 border-t border-line pt-4 md:grid-cols-4">
            <AdminField label="Option" value={variant.label} onChange={(value) => updateVariant(product, setProduct, index, { label: value })} />
            <AdminField label="Price" value={String(variant.price || "")} onChange={(value) => updateVariant(product, setProduct, index, { price: Number(value) || 0 })} />
            <AdminField label="Sale compare" value={variant.compareAtPrice ? String(variant.compareAtPrice) : ""} onChange={(value) => updateVariant(product, setProduct, index, { compareAtPrice: value ? Number(value) : undefined })} />
            <AdminField label="Stock" value={String(variant.stock)} onChange={(value) => updateVariant(product, setProduct, index, { stock: Number(value) || 0 })} />
          </div>
        ))}
        <button
          type="button"
          className="text-[11px] uppercase tracking-[0.16em]"
          onClick={() => set("variants", [...product.variants, { id: `opt-${Date.now()}`, label: "", price: product.price || 0, stock: 0 }])}
        >
          Add option
        </button>
      </section>
      <section className="bg-paper p-6">
        <p className="eyebrow text-mute">Options</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {([
            ["featured", "Featured"],
            ["bestseller", "Bestseller"],
            ["newArrival", "New arrival"],
            ["active", "Active"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={product[key]} onChange={(event) => set(key, event.target.checked)} />
              {label}
            </label>
          ))}
        </div>
      </section>
      {error ? <p role="alert">{error}</p> : null}
      <div className="flex gap-4">
        <button type="submit" className="h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper">Save product</button>
        {initial ? (
          <button
            type="button"
            className="text-[11px] uppercase tracking-[0.16em]"
            onClick={async () => {
              await store.deleteProduct(initial.id);
              router.push("/admin/products");
            }}
          >
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

function updateVariant(product: Product, setProduct: (value: Product) => void, index: number, patch: Partial<Variant>) {
  setProduct({
    ...product,
    variants: product.variants.map((variant, item) => (item === index ? { ...variant, ...patch } : variant)),
  });
}

function AdminField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <label htmlFor={id} className="block text-sm">
      {label}
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none" />
    </label>
  );
}

async function compress(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare that image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  if (!blob) throw new Error("Could not prepare that image.");
  return blob;
}

export function CategoryManager() {
  const store = useStore();
  const [draft, setDraft] = useState<Category>({ id: "", name: "", description: "", image: "", imageAlt: "", order: store.categories.length });
  const [error, setError] = useState("");
  return (
    <div>
      <h1 className="font-serif text-5xl">Categories</h1>
      <ul className="mt-8 space-y-4">
        {store.categories.map((category, index) => (
          <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
            <div>
              <p className="font-serif text-2xl">{category.name}</p>
              <p className="text-sm text-mute">{category.description}</p>
            </div>
            <div className="flex gap-3 text-[11px] uppercase tracking-[0.16em]">
              <button type="button" onClick={() => store.moveCategory(category.id, -1)} disabled={index === 0}>Up</button>
              <button type="button" onClick={() => store.moveCategory(category.id, 1)} disabled={index === store.categories.length - 1}>Down</button>
              <button type="button" onClick={() => setDraft(category)}>Edit</button>
              <button type="button" onClick={async () => setError((await store.deleteCategory(category.id)).message || "")}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-8 max-w-xl space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const isNew = !store.categories.some((category) => category.id === draft.id);
          const result = await store.saveCategory({ ...draft, id: slugify(draft.id || draft.name), order: draft.order ?? store.categories.length }, isNew);
          setError(result.message || "");
          if (result.ok) setDraft({ id: "", name: "", description: "", image: "", imageAlt: "", order: store.categories.length + 1 });
        }}
      >
        <AdminField label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
        <AdminField label="Slug" value={draft.id} onChange={(id) => setDraft({ ...draft, id })} />
        <AdminField label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
        <AdminField label="Image URL" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} />
        <AdminField label="Second image URL" value={draft.imageAlt} onChange={(imageAlt) => setDraft({ ...draft, imageAlt })} />
        {error ? <p role="status" className="text-sm">{error}</p> : null}
        <button type="submit" className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper">Save category</button>
      </form>
    </div>
  );
}

export function OrderIndex() {
  const store = useStore();
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");
  const [shipment, setShipment] = useState("all");
  const [query, setQuery] = useState("");
  const orders = store.orders.filter((order) => {
    if (status !== "all" && order.status !== status) return false;
    if (payment !== "all" && order.paymentState !== payment) return false;
    if (shipment !== "all" && (order.shipment?.state || "not_created") !== shipment) return false;
    const haystack = `${order.number} ${order.customerName} ${order.email}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-5xl">Orders</h1>
        <label className="text-sm">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="ml-3 h-10 border-b border-line bg-transparent">
            {["all", "pending_payment", "confirmed", "shipped", "delivered", "cancelled"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      <label className="text-sm">
          Payment
          <select value={payment} onChange={(event) => setPayment(event.target.value)} className="ml-3 h-10 border-b border-line bg-transparent">
            {["all", "pending", "captured", "failed", "refund_pending", "refunded"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Shipment
          <select value={shipment} onChange={(event) => setShipment(event.target.value)} className="ml-3 h-10 border-b border-line bg-transparent">
            {["all", "not_created", "pending", "booked", "in_transit", "delivered", "exception", "unknown"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders" className="h-10 border-b border-line bg-transparent" />
      </div>
      <ul className="mt-8 divide-y divide-line">
        {orders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <Link href={`/admin/orders/${order.id}`} className="font-serif text-2xl">{order.number}</Link>
              <p className="text-sm text-mute">{order.customerName} · {formatDate(order.createdAt)} · {formatPrice(order.total)}</p>
            </div>
            <span className="text-[11px] uppercase tracking-[0.16em]">{order.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const store = useStore();
  const order = store.orders.find((item) => item.id === id);
  if (!order) return <p>Order not found.</p>;
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-5xl">{order.number}</h1>
      <p className="mt-2 text-mute">{order.customerName} · {order.email} · {order.phone}</p>
      {order.paymentState ? <p className="mt-2 text-sm">Payment {order.paymentState} · Fulfilment {order.fulfillmentState || "unfulfilled"}</p> : null}
      <p className="mt-2">{order.address.line1}, {order.address.city} {order.address.postal}</p>
      <label className="mt-6 block text-sm">
        Status
        <select
          value={order.status}
          disabled={Boolean(order.shipment?.awb)}
          onChange={(event) => store.updateOrderStatus(order.id, event.target.value as OrderStatus)}
          className="mt-2 h-11 w-full max-w-xs border-b border-line bg-transparent disabled:opacity-60"
        >
          {["pending_payment", "placed", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>
      {order.shipment?.awb ? <p className="mt-2 text-sm text-mute">This order has a waybill. Delivery status follows Delhivery.</p> : null}
      <ul className="mt-8 space-y-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between border-b border-line py-3">
            <span>{item.name} · {item.variantLabel} × {item.quantity}</span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-right font-serif text-3xl">{formatPrice(order.total)}</p>
      <FulfilmentPanel orderId={order.id} initial={order} />
    </div>
  );
}

export function CustomerIndex() {
  const store = useStore();
  const customers = store.users.filter((user) => user.role === "customer");
  return (
    <div>
      <h1 className="font-serif text-5xl">Customers</h1>
      <ul className="mt-8 divide-y divide-line">
        {customers.map((customer) => (
          <li key={customer.id} className="flex items-center justify-between py-4">
            <div>
              <Link href={`/admin/customers/${customer.id}`} className="font-serif text-2xl">{customer.name}</Link>
              <p className="text-sm text-mute">{customer.email}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CustomerDetail({ id }: { id: string }) {
  const store = useStore();
  const customer = store.users.find((user) => user.id === id);
  if (!customer) return <p>Customer not found.</p>;
  const orders = store.orders.filter((order) => order.userId === customer.id || order.email === customer.email);
  return (
    <div>
      <h1 className="font-serif text-5xl">{customer.name}</h1>
      <p className="mt-2 text-mute">{customer.email} · {customer.phone || "No phone"}</p>
      <h2 className="mt-10 font-serif text-3xl">Addresses</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {customer.addresses.map((address) => <li key={address.id}>{address.line1}, {address.city} {address.postal}</li>)}
      </ul>
      <h2 className="mt-10 font-serif text-3xl">Orders</h2>
      <ul className="mt-3 space-y-2">
        {orders.map((order) => (
          <li key={order.id}><Link href={`/admin/orders/${order.id}`}>{order.number}</Link> · {order.status} · {formatPrice(order.total)}</li>
        ))}
      </ul>
    </div>
  );
}

export function HeroManager() {
  const [draft, setDraft] = useState<HeroOffer>(DEFAULT_HERO_OFFER);
  const [chipsText, setChipsText] = useState(DEFAULT_HERO_OFFER.chips.join(", "));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/hero", { headers: csrfHeaders() });
        const data = (await response.json()) as { ok?: boolean; offer?: HeroOffer; error?: string };
        if (!response.ok || !data.offer) throw new Error(data.error || "Could not load the hero offer.");
        if (cancelled) return;
        setDraft(data.offer);
        setChipsText(data.offer.chips.join(", "));
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not load the hero offer.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (next: Partial<HeroOffer>) => setDraft((current) => ({ ...current, ...next }));

  const onUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("role", "banner");
      body.append("scope", "homepage");
      const response = await fetch("/api/admin/media", { method: "POST", headers: csrfHeaders(false), body });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) throw new Error(payload.message || "Could not upload that image.");
      patch({ image: payload.url });
      setMessage("Image uploaded.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p className="text-mute">Loading hero…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-5xl">Hero</h1>
      <p className="mt-3 max-w-xl text-sm text-mute">
        Configure the homepage campaign slide (sale / festival). Turn it off to hide the offer without touching code. Product slides stay as they are.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError("");
          setMessage("");
          const chips = chipsText
            .split(",")
            .map((chip) => chip.trim())
            .filter(Boolean);
          const offer: HeroOffer = { ...draft, chips };
          try {
            const response = await fetch("/api/admin/hero", {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...csrfHeaders() },
              body: JSON.stringify({ offer }),
            });
            const data = (await response.json()) as { ok?: boolean; offer?: HeroOffer; message?: string; error?: string };
            if (!response.ok || !data.offer) throw new Error(data.error || "Could not save.");
            setDraft(data.offer);
            setChipsText(data.offer.chips.join(", "));
            setMessage(data.message || "Saved.");
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : "Could not save.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.enabled} onChange={(event) => patch({ enabled: event.target.checked })} />
          Show campaign slide on the homepage
        </label>

        <AdminField label="Pill label" value={draft.pill} onChange={(pill) => patch({ pill })} />
        <AdminField label="Title line 1" value={draft.titleLine1} onChange={(titleLine1) => patch({ titleLine1 })} />
        <AdminField label="Title line 2 (accent)" value={draft.titleLine2} onChange={(titleLine2) => patch({ titleLine2 })} />
        <label className="block text-sm">
          Supporting note
          <textarea
            value={draft.note}
            onChange={(event) => patch({ note: event.target.value })}
            rows={3}
            className="mt-2 w-full border-b border-line bg-transparent outline-none"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Primary CTA" value={draft.cta} onChange={(cta) => patch({ cta })} />
          <AdminField label="Primary link" value={draft.href} onChange={(href) => patch({ href })} />
          <AdminField label="Secondary CTA" value={draft.secondaryCta} onChange={(secondaryCta) => patch({ secondaryCta })} />
          <AdminField label="Secondary link" value={draft.secondaryHref} onChange={(secondaryHref) => patch({ secondaryHref })} />
        </div>

        <AdminField label="Coupon code" value={draft.couponCode} onChange={(couponCode) => patch({ couponCode })} />
        <AdminField label="Seal label (rotating ring)" value={draft.sealLabel} onChange={(sealLabel) => patch({ sealLabel })} />
        <AdminField label="Seal percent" value={draft.sealPercent} onChange={(sealPercent) => patch({ sealPercent })} />

        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Card tag" value={draft.cardTag} onChange={(cardTag) => patch({ cardTag })} />
          <AdminField label="Card name" value={draft.cardName} onChange={(cardName) => patch({ cardName })} />
        </div>
        <AdminField label="Chips (comma-separated)" value={chipsText} onChange={setChipsText} />

        <AdminField label="Image URL" value={draft.image} onChange={(image) => patch({ image })} />
        <AdminField label="Image alt text" value={draft.alt} onChange={(alt) => patch({ alt })} />
        <label className="block text-sm">
          Upload hero image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            className="mt-2 block w-full text-sm"
            onChange={(event) => void onUpload(event.target.files)}
          />
          <span className="mt-1 block text-xs text-mute">{uploading ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB."}</span>
        </label>

        {draft.image ? (
          <div className="relative h-40 w-full max-w-sm overflow-hidden rounded-lg border border-line bg-paper">
            <Media src={draft.image} alt={draft.alt || "Hero preview"} className="object-cover" sizes="100vw" />
          </div>
        ) : null}

        {error ? <p role="status" className="text-sm text-red-700">{error}</p> : null}
        {message ? <p role="status" className="text-sm text-mute">{message}</p> : null}
        <button type="submit" disabled={saving} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper disabled:opacity-60">
          {saving ? "Saving…" : "Save hero offer"}
        </button>
      </form>
    </div>
  );
}

export function BrandManager() {
  const [draft, setDraft] = useState<BrandSettings>(DEFAULT_BRAND);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/brand", { headers: csrfHeaders() });
        const data = (await response.json()) as { ok?: boolean; brand?: BrandSettings; error?: string };
        if (!response.ok || !data.brand) throw new Error(data.error || "Could not load the brand icon.");
        if (cancelled) return;
        setDraft(data.brand);
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not load the brand icon.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = (next: Partial<BrandSettings>) => setDraft((current) => ({ ...current, ...next }));

  const onUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("role", "brand");
      const response = await fetch("/api/admin/media", { method: "POST", headers: csrfHeaders(false), body });
      const payload = (await response.json()) as { url?: string; message?: string };
      if (!response.ok || !payload.url) throw new Error(payload.message || "Could not upload that image.");
      patch({ iconUrl: payload.url });
      setMessage("Icon uploaded. Save to publish it everywhere.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p className="text-mute">Loading brand…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-5xl">Brand</h1>
      <p className="mt-3 max-w-xl text-sm text-mute">
        Set the Silken Knot icon used across the storefront — header, footer, checkout, and sign-in.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          setError("");
          setMessage("");
          try {
            const response = await fetch("/api/admin/brand", {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...csrfHeaders() },
              body: JSON.stringify({ brand: draft }),
            });
            const data = (await response.json()) as { ok?: boolean; brand?: BrandSettings; message?: string; error?: string };
            if (!response.ok || !data.brand) throw new Error(data.error || "Could not save.");
            setDraft(data.brand);
            primeBrandCache(data.brand);
            setMessage(data.message || "Saved.");
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : "Could not save.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <AdminField label="Icon URL" value={draft.iconUrl} onChange={(iconUrl) => patch({ iconUrl })} />
        <AdminField label="Icon alt text" value={draft.iconAlt} onChange={(iconAlt) => patch({ iconAlt })} />
        <label className="block text-sm">
          Upload brand icon
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            className="mt-2 block w-full text-sm"
            onChange={(event) => void onUpload(event.target.files)}
          />
          <span className="mt-1 block text-xs text-mute">{uploading ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB. Prefer a square mark with a transparent background."}</span>
        </label>

        {draft.iconUrl ? (
          <div className="flex items-end gap-6">
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.iconUrl} alt={draft.iconAlt || "Brand icon preview"} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="relative flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border border-line bg-paper p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.iconUrl} alt={draft.iconAlt || "Brand logo preview"} className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        ) : null}

        {error ? <p role="status" className="text-sm text-red-700">{error}</p> : null}
        {message ? <p role="status" className="text-sm text-mute">{message}</p> : null}
        <button type="submit" disabled={saving} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper disabled:opacity-60">
          {saving ? "Saving…" : "Save brand icon"}
        </button>
      </form>
    </div>
  );
}

export function OfferManager() {
  const store = useStore();
  const blank: Coupon = { id: "", code: "", type: "percent", value: 10, scope: "order", active: true, label: "" };
  const [draft, setDraft] = useState<Coupon>(blank);
  const [error, setError] = useState("");
  return (
    <div>
      <h1 className="font-serif text-5xl">Offers</h1>
      <ul className="mt-8 divide-y divide-line">
        {store.coupons.map((coupon) => (
          <li key={coupon.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-serif text-2xl">{coupon.code}</p>
              <p className="text-sm text-mute">{coupon.label} · {coupon.scope} · {coupon.active ? "Active" : "Paused"}</p>
            </div>
            <div className="flex gap-3 text-[11px] uppercase tracking-[0.16em]">
              <button type="button" onClick={() => setDraft(coupon)}>Edit</button>
              <button type="button" onClick={() => store.deleteCoupon(coupon.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-8 max-w-xl space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const isNew = !draft.id || !store.coupons.some((coupon) => coupon.id === draft.id);
          const result = await store.saveCoupon({ ...draft, id: draft.id || `coupon-${Date.now()}`, label: draft.label || draft.code }, isNew);
          setError(result.message || "");
          if (result.ok) setDraft(blank);
        }}
      >
        <AdminField label="Code" value={draft.code} onChange={(code) => setDraft({ ...draft, code })} />
        <AdminField label="Label" value={draft.label} onChange={(label) => setDraft({ ...draft, label })} />
        <label className="block text-sm">
          Type
          <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as Coupon["type"] })} className="mt-2 h-11 w-full border-b border-line bg-transparent">
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        <AdminField label="Value" value={String(draft.value)} onChange={(value) => setDraft({ ...draft, value: Number(value) || 0 })} />
        <label className="block text-sm">
          Scope
          <select value={draft.scope} onChange={(event) => setDraft({ ...draft, scope: event.target.value as Coupon["scope"] })} className="mt-2 h-11 w-full border-b border-line bg-transparent">
            <option value="order">Order</option>
            <option value="product">Product</option>
            <option value="category">Category</option>
          </select>
        </label>
        {draft.scope === "product" ? (
          <label className="block text-sm">
            Product
            <select value={draft.productId ?? ""} onChange={(event) => setDraft({ ...draft, productId: event.target.value })} className="mt-2 h-11 w-full border-b border-line bg-transparent">
              <option value="">Choose</option>
              {store.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
        ) : null}
        {draft.scope === "category" ? (
          <label className="block text-sm">
            Category
            <select value={draft.categoryId ?? ""} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })} className="mt-2 h-11 w-full border-b border-line bg-transparent">
              <option value="">Choose</option>
              {store.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />
          Active
        </label>
        {error ? <p role="status" className="text-sm">{error}</p> : null}
        <button type="submit" className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper">Save offer</button>
      </form>
    </div>
  );
}

type ShippingLabelView = {
  kind: "pdf" | "link" | "data";
  waybill: string;
  pdfSize: "A4" | "4R";
  requestedPdf: boolean;
  downloadUrl: string;
  expiresInSeconds: number | null;
  pdfBase64: string;
  packagesFound: number;
  fields: { key: string; value: string }[];
};

function openPdf(base64: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  window.open(url, "_blank", "noopener");
}

function FulfilmentPanel({ orderId, initial }: { orderId: string; initial: Order }) {
  const [order, setOrder] = useState(initial);
  const [message, setMessage] = useState("");
  const [labelSize, setLabelSize] = useState<"A4" | "4R">("4R");
  const [label, setLabel] = useState<ShippingLabelView | null>(null);
  async function run(action: string, extra: Record<string, unknown> = {}) {
    setMessage("");
    if (action !== "shipping-label") setLabel(null);
    const response = await fetch("/api/admin/fulfilment", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ action, orderId, ...extra }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Could not update fulfilment.");
      return;
    }
    if (body.order) setOrder(body.order);
    if (action === "shipping-label" && body.label) {
      setLabel(body.label);
      setMessage(body.label.kind === "link" ? "Delhivery returned a label link." : body.label.kind === "pdf" ? "Delhivery returned a PDF." : "Delhivery returned label data.");
      return;
    }
    setMessage("Saved.");
  }
  const shipment = order.shipment;
  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="font-serif text-3xl">Fulfilment</h2>
      <p className="mt-2 text-sm">Payment {order.paymentState || "—"} · Shipment {shipment?.state || "not_created"} · {shipment?.provider || "manual"}</p>
      {shipment?.test ? <p className="mt-2 text-sm">Test shipment. Not sent to Delhivery. Refresh tracking to add the next test event.</p> : null}
      {shipment?.awb ? <p className="mt-2 text-sm">Waybill {shipment.awb}</p> : null}
      {shipment?.weightGrams ? <p className="mt-2 text-sm">Parcel weight for testing: {shipment.weightGrams} g{shipment.packageData === "product_weights" ? "" : " · includes a product still using the store fallback"}</p> : null}
      {order.payment === "cod" ? <p className="mt-2 text-sm">Cash on delivery {order.codCollection === "due" ? "is still due" : "does not apply"}.</p> : null}
      {shipment?.lastError ? <p className="mt-2 text-sm">{shipment.lastError}</p> : null}
      <ul className="mt-4 space-y-2 text-sm">
        {(shipment?.events || []).map((event) => <li key={`${event.at}-${event.providerStatus}`}>{event.at} · {event.providerStatus}</li>)}
      </ul>
      {shipment?.awb && !shipment.test ? (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm">Prepare for dispatch</h3>
          <p className="mt-1 text-sm text-mute">Uses this waybill with Delhivery’s shipping-label options. A4 is a full page. 4R is a 4×6 label.</p>
          <label className="mt-3 block text-sm">Label size
            <select value={labelSize} onChange={(event) => setLabelSize(event.target.value === "A4" ? "A4" : "4R")} className="mt-1 h-11 w-full max-w-xs border-b border-line bg-transparent">
              <option value="4R">4R · 4×6</option>
              <option value="A4">A4 · 8×11</option>
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("shipping-label", { pdf: true, pdfSize: labelSize })}>Get printable PDF</button>
            <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("shipping-label", { pdf: false, pdfSize: labelSize })}>Get label data</button>
          </div>
          {label?.kind === "link" ? (
            <p className="mt-3 text-sm">
              <a className="underline" href={label.downloadUrl} target="_blank" rel="noreferrer">Open shipping label</a>
              {label.expiresInSeconds ? ` · link expires in ${Math.round(label.expiresInSeconds / 3600)} hours` : null}
            </p>
          ) : null}
          {label?.kind === "pdf" && label.pdfBase64 ? <button type="button" className="mt-3 h-10 border-b border-line text-sm" onClick={() => openPdf(label.pdfBase64)}>Open PDF</button> : null}
          {label?.kind === "data" && label.fields.length ? (
            <dl className="mt-3 space-y-1 text-sm">
              {label.fields.map((field) => <div key={field.key} className="flex gap-3"><dt className="w-40 shrink-0 text-mute">{field.key}</dt><dd className="break-all">{field.value}</dd></div>)}
            </dl>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("refresh")}>Refresh tracking</button>
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("retry-booking", { acknowledgeAbsent: window.confirm("Confirm Delhivery has no shipment for this order before booking again.") })}>Retry booking</button>
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("pickup")}>Request pickup</button>
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("cancel-shipment", { confirm: window.confirm("Cancel this shipment?") })}>Cancel shipment</button>
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("manual")}>Manual fulfilment</button>
        <button type="button" className="h-10 border-b border-line text-sm" onClick={() => run("refund")}>Request refund</button>
      </div>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </section>
  );
}
