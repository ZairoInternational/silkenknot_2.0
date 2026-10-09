"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { formatDate, formatPrice, slugify } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Category, Coupon, OrderStatus, Product, Variant } from "@/lib/types";
import { Media } from "@/components/ui";

const links = [
  ["Overview", "/admin"],
  ["Products", "/admin/products"],
  ["Categories", "/admin/categories"],
  ["Orders", "/admin/orders"],
  ["Customers", "/admin/customers"],
  ["Offers", "/admin/offers"],
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
        <Link href="/admin" className="font-serif text-3xl">Silk Knot</Link>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-mute">Studio</p>
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
  return {
    id: "",
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
    benefits: ["", "", ""],
    ingredients: [""],
    howToUse: [""],
    images: [],
    variants: [{ id: "standard", label: "Standard", price: 0, stock: 0 }],
    featured: false,
    bestseller: false,
    newArrival: false,
    active: true,
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const set = <K extends keyof Product>(key: K, value: Product[K]) => setProduct((current) => ({ ...current, [key]: value }));

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const urls: string[] = [];
    for (const file of [...files]) {
      urls.push(await compress(file));
    }
    set("images", [...product.images, ...urls]);
  };

  return (
    <form
      className="mx-auto max-w-3xl space-y-10"
      onSubmit={async (event) => {
        event.preventDefault();
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
          Description
          <textarea value={product.description} onChange={(event) => set("description", event.target.value)} className="mt-2 min-h-28 w-full border-b border-line bg-transparent outline-none" />
        </label>
        <label className="block text-sm">
          Short description
          <textarea value={product.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} className="mt-2 min-h-20 w-full border-b border-line bg-transparent outline-none" />
        </label>
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
          Drop images or browse
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => void onFiles(event.target.files)} />
        </label>
        <div className="mt-3 flex gap-2">
          <input id="image-url" placeholder="Or paste an image URL" className="h-11 flex-1 border-b border-line bg-transparent outline-none" />
          <button
            type="button"
            className="text-[11px] uppercase tracking-[0.16em]"
            onClick={() => {
              const input = document.getElementById("image-url") as HTMLInputElement;
              if (!input.value.trim()) return;
              set("images", [...product.images, input.value.trim()]);
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
              <button type="button" className="mt-1 text-[11px] uppercase tracking-[0.14em]" onClick={() => set("images", product.images.filter((_, item) => item !== index))}>
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
  if (!context) return URL.createObjectURL(file);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
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
  const orders = store.orders.filter((order) => status === "all" || order.status === status);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-5xl">Orders</h1>
        <label className="text-sm">
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="ml-3 h-10 border-b border-line bg-transparent">
            {["all", "placed", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
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
      <p className="mt-2">{order.address.line1}, {order.address.city} {order.address.postal}</p>
      <label className="mt-6 block text-sm">
        Status
        <select
          value={order.status}
          onChange={(event) => store.updateOrderStatus(order.id, event.target.value as OrderStatus)}
          className="mt-2 h-11 w-full max-w-xs border-b border-line bg-transparent"
        >
          {["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>
      <ul className="mt-8 space-y-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between border-b border-line py-3">
            <span>{item.name} · {item.variantLabel} × {item.quantity}</span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-right font-serif text-3xl">{formatPrice(order.total)}</p>
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
