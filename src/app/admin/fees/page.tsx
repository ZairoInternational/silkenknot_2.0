"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { AdminFormSkeleton, AdminPageHeaderSkeleton } from "@/components/admin/AdminSkeletons";
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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      .catch(() => setError("Platform fee settings could not be loaded."));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!policy) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/fees", {
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
      setMessage("Saved. Customers only see “Platform fee” — not why it is charged or waived.");
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
        <AdminFormSkeleton fields={5} />
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-8">
      <AdminPageHeader
        title="Platform fee"
        purpose={`Optional checkout “Platform fee” (default ${formatPrice(30)}). Customers only see the fee amount. Use waiver rules when you want to waive it for large or first orders.`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Status</p>
          <p className="mt-2 font-medium">{policy.enabled ? "Charging" : "Off"}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Fee</p>
          <p className="mt-2 font-serif text-3xl">{formatPrice(policy.feePaise / 100)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Waive from</p>
          <p className="mt-2 font-medium">
            {policy.waiveAbovePaise > 0 ? formatPrice(policy.waiveAbovePaise / 100) : "Not set"}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 xl:mx-0">
        <AdminPanel title="Fee amount" hint="Shown at checkout as Platform fee" defaultOpen>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#faf7f2] px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={policy.enabled}
              onChange={(event) => setPolicy({ ...policy, enabled: event.target.checked })}
            />
            <span>
              <span className="block font-medium">Charge a platform fee</span>
              <span className="mt-0.5 block text-xs text-mute">When off, checkout never adds this line.</span>
            </span>
          </label>
          <label className="block text-sm">
            Fee amount (paise)
            <input
              type="number"
              min={0}
              step={100}
              value={policy.feePaise}
              onChange={(event) => setPolicy({ ...policy, feePaise: Number(event.target.value) })}
              className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
            />
            <span className="mt-1 block text-xs text-mute">{formatPrice(policy.feePaise / 100)} per order when not waived</span>
          </label>
        </AdminPanel>

        <AdminPanel title="Waiver rules" hint="If any matching rule applies, the fee becomes free" defaultOpen>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#faf7f2] px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={policy.waiveFirstOrder}
              onChange={(event) => setPolicy({ ...policy, waiveFirstOrder: event.target.checked })}
            />
            <span>
              <span className="block font-medium">Waive on a customer&apos;s first order</span>
              <span className="mt-0.5 block text-xs text-mute">Helpful for new shoppers.</span>
            </span>
          </label>
          <label className="block text-sm">
            Waive when bag total (after coupon, before delivery) is at least (paise)
            <input
              type="number"
              min={0}
              step={100}
              value={policy.waiveAbovePaise}
              onChange={(event) => setPolicy({ ...policy, waiveAbovePaise: Number(event.target.value) })}
              className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
            />
            <span className="mt-1 block text-xs text-mute">
              {policy.waiveAbovePaise > 0
                ? `Free platform fee from ${formatPrice(policy.waiveAbovePaise / 100)} bag value. Set 0 to turn this rule off.`
                : "Set above 0 to waive on higher-value bags."}
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
          {saving ? "Saving…" : "Save platform fee"}
        </button>
      </div>
    </form>
  );
}
