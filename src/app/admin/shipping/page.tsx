"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/Studio";
import { csrfHeaders } from "@/lib/auth/browser";

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

  useEffect(() => {
    fetch("/api/admin/fulfilment", { headers: csrfHeaders(false) })
      .then((response) => response.json())
      .then((body) => {
        const next = body.policy as Policy | null;
        if (!next) { setPolicy(null); return; }
        setPolicy(next);
      })
      .catch(() => setMessage("Shipping settings could not be loaded."));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!policy) return;
    const response = await fetch("/api/admin/fulfilment", {
      method: "POST",
      headers: csrfHeaders(),
      body: JSON.stringify({ action: "save-settings", ...policy }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error || "Could not save.");
      return;
    }
    setPolicy(body.policy);
    setMessage("Saved. API tokens stay in server environment variables.");
  }

  if (!policy) return <p>Loading shipping settings…</p>;
  return (
    <form onSubmit={save} className="max-w-xl space-y-4">
      <AdminPageHeader
        title="Shipping"
        purpose="Delivery rates, free-shipping threshold, cash on delivery, and Delhivery booking. Change these when shipping rules or courier setup change."
      />
      <p className="text-sm text-mute">{policy.mode === "mock" ? "Mock mode is on. Paid orders get a test waybill. Refresh tracking steps the status. Nothing is sent to Delhivery." : `Delhivery ${policy.credentialsSet ? "token is set" : "token is missing"}`} · Webhook {policy.webhookConfigured ? "token is set" : "push is off"} · GST {policy.gstConfigured ? "is set" : "is missing"} · Origin PIN {policy.originPin || "is missing"} · {policy.environment}</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policy.delhiveryEnabled} onChange={(event) => setPolicy({ ...policy, delhiveryEnabled: event.target.checked })} /> Enable Delhivery</label>
      <label className="block text-sm">Pickup location<input value={policy.pickupLocation} onChange={(event) => setPolicy({ ...policy, pickupLocation: event.target.value })} className="mt-1 h-11 w-full border-b border-line bg-transparent" /></label>
      <p className="text-sm text-mute">Checkout prices each order from Delhivery's shipping estimate plus ₹10, rounded to the nearest rupee. Every order uses the configured parcel weight. Express appears when Delhivery returns an express estimate.</p>
      <label className="block text-sm">Free shipping above (paise)<input type="number" value={policy.freeShippingPaise} onChange={(event) => setPolicy({ ...policy, freeShippingPaise: Number(event.target.value) })} className="mt-1 h-11 w-full border-b border-line bg-transparent" /></label>
      <label className="block text-sm">Standard estimate label<input value={policy.standardEta} onChange={(event) => setPolicy({ ...policy, standardEta: event.target.value })} className="mt-1 h-11 w-full border-b border-line bg-transparent" /></label>
      <label className="block text-sm">Express estimate label<input value={policy.expressEta} onChange={(event) => setPolicy({ ...policy, expressEta: event.target.value })} className="mt-1 h-11 w-full border-b border-line bg-transparent" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policy.codEnabled} onChange={(event) => setPolicy({ ...policy, codEnabled: event.target.checked })} /> Allow cash on delivery</label>
      <p className="text-sm text-mute">Cash on delivery, when allowed, uses Delhivery's COD estimate plus ₹10. A separate COD fee is not added.</p>
      <label className="block text-sm">Booking
        <select value={policy.bookingMode} onChange={(event) => setPolicy({ ...policy, bookingMode: event.target.value as "auto" | "manual" })} className="mt-1 h-11 w-full border-b border-line bg-transparent">
          <option value="auto">Automatic after payment</option>
          <option value="manual">Manual</option>
        </select>
      </label>
      {message ? <p className="text-sm">{message}</p> : null}
      <button type="submit" className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper">Save shipping settings</button>
    </form>
  );
}
