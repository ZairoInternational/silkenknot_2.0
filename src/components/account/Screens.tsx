"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatPrice } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Address } from "@/lib/types";
import { Field } from "@/components/ui";

const panel = "page-pad mx-auto w-full max-w-xl px-5 pb-24";

export function LoginScreen() {
  const store = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (store.ready && store.currentUser) router.replace("/account");
  }, [store.ready, store.currentUser, router]);

  return (
    <form
      className={panel}
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await store.login(email, password);
        if (!result.ok) setError(result.message);
        else router.push("/account");
      }}
    >
      <p className="eyebrow text-mute">Account</p>
      <h1 className="mt-3 font-serif text-6xl">Log in</h1>
      <div className="mt-10 space-y-6">
        <Field label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
      <button type="submit" className="mt-8 h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper">Enter</button>
      <p className="mt-6 text-sm text-mute">
        <Link href="/account/register" className="underline">Create an account</Link>
        <span className="mx-2">·</span>
        <Link href="/account/forgot-password" className="underline">Forgot password</Link>
      </p>
      <p className="mt-8 text-sm text-mute">Preview account: mira@silkknot.com / ritual123</p>
    </form>
  );
}

export function RegisterScreen() {
  const store = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: event.target.value });

  return (
    <form
      className={panel}
      onSubmit={async (event) => {
        event.preventDefault();
        if (form.password.length < 6) return setError("Use at least 6 characters.");
        if (form.password !== form.confirm) return setError("Passwords do not match.");
        const result = await store.register(form);
        if (!result.ok) return setError(result.message);
        router.push("/account");
      }}
    >
      <p className="eyebrow text-mute">Account</p>
      <h1 className="mt-3 font-serif text-6xl">Register</h1>
      <div className="mt-10 space-y-6">
        <Field label="Name" name="name" autoComplete="name" required value={form.name} onChange={set("name")} />
        <Field label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={set("password")} />
        <Field label="Confirm password" name="confirm" type="password" required value={form.confirm} onChange={set("confirm")} />
      </div>
      {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
      <button type="submit" className="mt-8 h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper">Create account</button>
      <p className="mt-6 text-sm"><Link href="/account/login" className="underline">Already registered</Link></p>
    </form>
  );
}

export function ForgotScreen() {
  const store = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"email" | "reset" | "done">("email");
  const [error, setError] = useState("");

  return (
    <div className={panel}>
      <p className="eyebrow text-mute">Account</p>
      <h1 className="mt-3 font-serif text-6xl">Forgot password</h1>
      <p className="mt-4 text-sm text-mute">In this preview there is no email service, so you can set a new password directly.</p>
      {stage === "email" ? (
        <form
          className="mt-8 space-y-6"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await store.findAccount(email);
            if (!result.ok) return setError(result.message);
            setError("");
            setStage("reset");
          }}
        >
          <Field label="Email" name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          {error ? <p role="alert" className="text-sm">{error}</p> : null}
          <button type="submit" className="h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper">Continue</button>
        </form>
      ) : null}
      {stage === "reset" ? (
        <form
          className="mt-8 space-y-6"
          onSubmit={async (event) => {
            event.preventDefault();
            if (password.length < 6) return setError("Use at least 6 characters.");
            const result = await store.resetPassword(email, password);
            if (!result.ok) return setError(result.message);
            setStage("done");
          }}
        >
          <Field label="New password" name="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          {error ? <p role="alert" className="text-sm">{error}</p> : null}
          <button type="submit" className="h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper">Update password</button>
        </form>
      ) : null}
      {stage === "done" ? <p className="mt-8" role="status">Password updated. <Link href="/account/login" className="underline">Log in</Link></p> : null}
    </div>
  );
}

function Guard({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const router = useRouter();
  useEffect(() => {
    if (store.ready && !store.currentUser) router.replace("/account/login");
  }, [store.ready, store.currentUser, router]);
  if (!store.currentUser) return <div className="page-pad px-5 text-mute">Opening your account…</div>;
  return <>{children}</>;
}

export function ProfileScreen() {
  return (
    <Guard>
      <ProfileForm />
    </Guard>
  );
}

function ProfileForm() {
  const store = useStore();
  const user = store.currentUser!;
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [note, setNote] = useState("");
  const orders = store.orders.filter((order) => order.userId === user.id || order.email === user.email).length;

  return (
    <div className={panel}>
      <p className="eyebrow text-mute">Account</p>
      <h1 className="mt-3 font-serif text-6xl">{user.name}</h1>
      <p className="mt-3 text-mute">{user.email}</p>
      <form
        className="mt-10 space-y-6"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await store.updateProfile({ name, phone });
          setNote(result.message || "");
        }}
      >
        <Field label="Name" name="name" required value={name} onChange={(event) => setName(event.target.value)} />
        <Field label="Phone" name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <button type="submit" className="h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper">Save profile</button>
        {note ? <p role="status" className="text-sm">{note}</p> : null}
      </form>
      <div className="mt-10 flex gap-6 text-[11px] uppercase tracking-[0.16em]">
        <Link href="/account/orders">Orders ({orders})</Link>
        <Link href="/account/addresses">Addresses</Link>
        <button type="button" onClick={() => void store.logout()}>Log out</button>
      </div>
    </div>
  );
}

export function OrdersScreen() {
  return (
    <Guard>
      <OrderList />
    </Guard>
  );
}

function OrderList() {
  const store = useStore();
  const user = store.currentUser!;
  const orders = store.orders.filter((order) => order.userId === user.id || order.email === user.email);
  return (
    <div className="page-pad mx-auto w-full max-w-3xl px-5 pb-24">
      <h1 className="font-serif text-6xl">Orders</h1>
      {orders.length === 0 ? <p className="mt-8 text-mute">No orders yet.</p> : null}
      <ul className="mt-10 space-y-8">
        {orders.map((order) => (
          <li key={order.id} className="border-t border-line pt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="font-serif text-3xl">{order.number}</p>
              <p className="text-[11px] uppercase tracking-[0.16em]">{order.status}</p>
            </div>
            <p className="mt-1 text-sm text-mute">{formatDate(order.createdAt)} · {formatPrice(order.total)}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {order.items.map((item) => (
                <li key={item.id}>{item.name} · {item.variantLabel} · {item.quantity}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AddressesScreen() {
  return (
    <Guard>
      <AddressBook />
    </Guard>
  );
}

function emptyAddress(name: string): Address {
  return {
    id: `addr-${Date.now()}`,
    label: "Home",
    name,
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal: "",
    country: "India",
    phone: "",
    isDefault: false,
  };
}

function AddressBook() {
  const store = useStore();
  const user = store.currentUser!;
  const [editing, setEditing] = useState<Address | null>(null);

  return (
    <div className="page-pad mx-auto w-full max-w-3xl px-5 pb-24">
      <div className="flex items-end justify-between">
        <h1 className="font-serif text-6xl">Addresses</h1>
        <button type="button" className="text-[11px] uppercase tracking-[0.16em]" onClick={() => setEditing(emptyAddress(user.name))}>
          Add
        </button>
      </div>
      <ul className="mt-10 space-y-6">
        {user.addresses.map((address) => (
          <li key={address.id} className="border-t border-line pt-5">
            <p className="eyebrow text-mute">{address.label}{address.isDefault ? " · Default" : ""}</p>
            <p className="mt-2">{address.name}</p>
            <p className="text-mute">{address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city} {address.postal}</p>
            <div className="mt-3 flex gap-4 text-[11px] uppercase tracking-[0.16em]">
              <button type="button" onClick={() => setEditing(address)}>Edit</button>
              <button type="button" onClick={() => void store.deleteAddress(address.id)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      {editing ? (
        <form
          className="mt-10 grid gap-5 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            await store.saveAddress(editing);
            setEditing(null);
          }}
        >
          {([
            ["label", "Label"],
            ["name", "Name"],
            ["line1", "Address"],
            ["line2", "Apartment"],
            ["city", "City"],
            ["state", "State"],
            ["postal", "Postal code"],
            ["phone", "Phone"],
          ] as const).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              name={key}
              required={key !== "line2"}
              value={editing[key]}
              onChange={(event) => setEditing({ ...editing, [key]: event.target.value })}
            />
          ))}
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={editing.isDefault} onChange={(event) => setEditing({ ...editing, isDefault: event.target.checked })} />
            Default address
          </label>
          <div className="flex gap-4 md:col-span-2">
            <button type="submit" className="h-12 bg-ink px-8 text-[11px] uppercase tracking-[0.2em] text-paper">Save address</button>
            <button type="button" onClick={() => setEditing(null)} className="text-[11px] uppercase tracking-[0.16em]">Cancel</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
