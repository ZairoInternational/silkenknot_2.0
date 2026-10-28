"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/Studio";
import { csrfHeaders } from "@/lib/auth/browser";
import { formatPrice } from "@/lib/format";

type Policy = {
  enabled: boolean;
  feePaise: number;
  waiveAbovePaise: number;
  waiveFirstOrder: boolean;
};

export default function PlatformFeeSettingsPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/fees", { headers: csrfHeaders(false) })
      .then((response) => response.json())
      .then((body) => {
        const next = body.policy as Policy | null;
        if (!next) {
          setPolicy(null);
          return;
        }
        setPolicy(next);
      })
      .catch(() => setMessage("Platform fee settings could not be loaded."));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!policy) return;
    const response = await fetch("/api/admin/fees", {
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
    setMessage("Saved. Customers only see “Platform fee” — not why it is charged or waived.");
  }

  if (!policy) return <p>Loading platform fee settings…</p>;

  return (
    <form onSubmit={save} className="max-w-xl space-y-4">
      <AdminPageHeader
        title="Payment fees"
        purpose={`Optional checkout “Platform fee” (default ${formatPrice(30)}). Customers only see the fee amount. Use waiver rules below when you want to waive it for large or first orders.`}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={policy.enabled}
          onChange={(event) => setPolicy({ ...policy, enabled: event.target.checked })}
        />
        Charge a platform fee
      </label>
      <label className="block text-sm">
        Fee amount (paise)
        <input
          type="number"
          min={0}
          step={100}
          value={policy.feePaise}
          onChange={(event) => setPolicy({ ...policy, feePaise: Number(event.target.value) })}
          className="mt-1 h-11 w-full border-b border-line bg-transparent"
        />
        <span className="mt-1 block text-mute">{formatPrice(policy.feePaise / 100)} per order when not waived</span>
      </label>
      <div className="space-y-3 border-t border-line pt-4">
        <h2 className="font-serif text-2xl">Waiver rules</h2>
        <p className="text-sm text-mute">Turn each rule on separately. If any matching rule applies, the fee becomes free.</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={policy.waiveFirstOrder}
            onChange={(event) => setPolicy({ ...policy, waiveFirstOrder: event.target.checked })}
          />
          Waive on a customer&apos;s first order
        </label>
        <label className="block text-sm">
          Waive when bag total (after coupon, before delivery) is at least (paise)
          <input
            type="number"
            min={0}
            step={100}
            value={policy.waiveAbovePaise}
            onChange={(event) => setPolicy({ ...policy, waiveAbovePaise: Number(event.target.value) })}
            className="mt-1 h-11 w-full border-b border-line bg-transparent"
          />
          <span className="mt-1 block text-mute">
            {policy.waiveAbovePaise > 0
              ? `Free platform fee from ${formatPrice(policy.waiveAbovePaise / 100)} bag value. Set 0 to turn this rule off.`
              : "Set above 0 to waive on higher-value bags."}
          </span>
        </label>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
      <button type="submit" className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper">
        Save platform fee
      </button>
    </form>
  );
}
