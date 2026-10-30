"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { AdminFormSkeleton, AdminPageHeaderSkeleton } from "@/components/admin/AdminSkeletons";
import { csrfHeaders } from "@/lib/auth/browser";
import { formatPrice } from "@/lib/format";

type Policy = {
  delhiveryEnabled: boolean;
  environment: string;
  pickupLocation: string;
  originPin: string;
  standardPaise: number;
  expressPaise: number;
  freeShippingPaise: number;
  standardEta: string;
  expressEta: string;
  codEnabled: boolean;
  codFeePaise: number;
  bookingMode: "auto" | "manual";
  credentialsSet: boolean;
  webhookConfigured: boolean;
  gstConfigured: boolean;
  mode: "off" | "mock" | "live";
};

export default function ShippingSettingsPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/fulfilment", { headers: csrfHeaders(false) })
      .then((response) => response.json())
      .then((body) => {
        const next = body.policy as Policy | null;
        if (!next) {
          setPolicy(null);
          return;
        }
        setPolicy(next);
      })
      .catch(() => setError("Shipping settings could not be loaded."));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!policy) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/fulfilment", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ action: "save-settings", ...policy }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error || "Could not save.");
        return;
      }
      setPolicy(body.policy);
      setMessage("Saved. API tokens stay in server environment variables.");
    } catch {
      setError("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!policy) {
    return (
      <div>
        <AdminPageHeaderSkeleton />
        <AdminFormSkeleton fields={6} />
      </div>
    );
  }

  const modeLabel = policy.mode === "mock" ? "Mock" : policy.mode === "live" ? "Live" : "Off";

  return (
    <form onSubmit={save} className="space-y-8">
      <AdminPageHeader
        title="Shipping / Delivery"
        purpose="Delivery rates, free-shipping threshold, cash on delivery, and Delhivery booking. Change these when shipping rules or courier setup change."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Mode</p>
          <p className="mt-2 font-medium">{modeLabel}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Delhivery token</p>
          <p className="mt-2 font-medium">{policy.credentialsSet ? "Set" : "Missing"}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Webhook</p>
          <p className="mt-2 font-medium">{policy.webhookConfigured ? "Set" : "Off"}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Origin PIN</p>
          <p className="mt-2 font-medium">{policy.originPin || "Missing"}</p>
        </div>
      </div>

      {policy.mode === "mock" ? (
        <p className="rounded-xl border border-[#e8d9b5] bg-[#fbf6ea] px-4 py-3 text-sm text-[#7a5a28]">
          Mock mode is on. Paid orders get a test waybill. Refresh tracking steps the status. Nothing is sent to Delhivery.
        </p>
      ) : null}

      <div className="mx-auto max-w-2xl space-y-4 xl:mx-0">
        <AdminPanel title="Courier" hint="Delhivery connection and pickup" defaultOpen>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#faf7f2] px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={policy.delhiveryEnabled}
              onChange={(event) => setPolicy({ ...policy, delhiveryEnabled: event.target.checked })}
            />
            <span>
              <span className="block font-medium">Enable Delhivery</span>
              <span className="mt-0.5 block text-xs text-mute">Use Delhivery for quotes, booking, and tracking.</span>
            </span>
          </label>
          <label className="block text-sm">
            Pickup location
            <input
              value={policy.pickupLocation}
              onChange={(event) => setPolicy({ ...policy, pickupLocation: event.target.value })}
              className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
          <label className="block text-sm">
            Booking
            <select
              value={policy.bookingMode}
              onChange={(event) => setPolicy({ ...policy, bookingMode: event.target.value as "auto" | "manual" })}
              className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
            >
              <option value="auto">Automatic after payment</option>
              <option value="manual">Manual from the order page</option>
            </select>
          </label>
          <p className="text-xs text-mute">
            Environment {policy.environment} · GST {policy.gstConfigured ? "is set" : "is missing"}
          </p>
        </AdminPanel>

        <AdminPanel title="Rates & estimates" hint="What customers see at checkout" defaultOpen>
          <p className="text-sm text-mute">
            Checkout prices each order from Delhivery&apos;s shipping estimate plus ₹10, rounded to the nearest rupee. Express appears when Delhivery returns an express estimate.
          </p>
          <label className="block text-sm">
            Free shipping above (paise)
            <input
              type="number"
              value={policy.freeShippingPaise}
              onChange={(event) => setPolicy({ ...policy, freeShippingPaise: Number(event.target.value) })}
              className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
            />
            <span className="mt-1 block text-xs text-mute">
              Free delivery from {formatPrice(policy.freeShippingPaise / 100)} bag value.
            </span>
          </label>
          <label className="block text-sm">
            Standard estimate label
            <input
              value={policy.standardEta}
              onChange={(event) => setPolicy({ ...policy, standardEta: event.target.value })}
              className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
          <label className="block text-sm">
            Express estimate label
            <input
              value={policy.expressEta}
              onChange={(event) => setPolicy({ ...policy, expressEta: event.target.value })}
              className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
            />
          </label>
        </AdminPanel>

        <AdminPanel title="Cash on delivery" hint="COD availability at checkout" defaultOpen={false}>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#faf7f2] px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={policy.codEnabled}
              onChange={(event) => setPolicy({ ...policy, codEnabled: event.target.checked })}
            />
            <span>
              <span className="block font-medium">Allow cash on delivery</span>
              <span className="mt-0.5 block text-xs text-mute">
                When allowed, COD uses Delhivery&apos;s COD estimate plus ₹10. A separate COD fee is not added.
              </span>
            </span>
          </label>
        </AdminPanel>

        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-[#fdf4f2] px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p role="status" className="rounded-xl border border-[#cfe0c8] bg-[#f3f8f1] px-4 py-3 text-sm text-[#3d5a3a]">{message}</p>
        ) : null}
        <button type="submit" disabled={saving} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper disabled:opacity-60">
          {saving ? "Saving…" : "Save shipping / delivery"}
        </button>
      </div>
    </form>
  );
}
