"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStickyActions, AdminTip, adminBtn, adminControl } from "@/components/admin/AdminShell";
import { AdminEditorSkeleton } from "@/components/admin/AdminSkeletons";
import { csrfHeaders } from "@/lib/auth/browser";
import {
  DEFAULT_WELCOME_SCRATCH,
  type WelcomeScratchSettings,
} from "@/lib/welcome-scratch/content";

export default function WelcomeScratchPage() {
  const [draft, setDraft] = useState<WelcomeScratchSettings>(DEFAULT_WELCOME_SCRATCH);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/welcome-scratch", { headers: csrfHeaders(false) })
      .then((response) => response.json())
      .then((body) => {
        if (body.welcomeScratch) setDraft(body.welcomeScratch as WelcomeScratchSettings);
      })
      .catch(() => setError("Welcome offer could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/welcome-scratch", {
        method: "PUT",
        headers: csrfHeaders(),
        body: JSON.stringify({ welcomeScratch: draft }),
      });
      const body = await response.json();
      if (!response.ok || !body.welcomeScratch) {
        setError(body.error || "Could not save.");
        return;
      }
      setDraft(body.welcomeScratch);
      setMessage(body.message || "Saved.");
    } catch {
      setError("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminEditorSkeleton />;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Welcome scratch"
        purpose="Scratch-card welcome modal on the homepage (session once per visitor)."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Modal</p>
          <p className="mt-2 font-medium">{draft.enabled ? "Enabled" : "Disabled"}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Code</p>
          <p className="mt-2 font-medium tracking-[0.12em]">{draft.prizeCode}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Offer</p>
          <p className="mt-2 font-medium">{draft.prizeLabel}</p>
        </div>
      </div>

      <form onSubmit={save} className="mx-auto max-w-xl space-y-4">
        <AdminPanel title="Visibility" hint="Show or hide the scratch modal site-wide" defaultOpen>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#ffffff] px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={draft.enabled}
              onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
            />
            <span>
              <span className="block font-medium">Enable welcome scratch</span>
              <span className="mt-0.5 block text-xs text-mute">
                When off, the homepage never shows the scratch-card offer.
              </span>
            </span>
          </label>
        </AdminPanel>

        <AdminPanel title="Prize" hint="Must match an active discount code under Catalog → Discount codes" defaultOpen>
          <label className="block text-sm">
            Coupon code
            <input
              value={draft.prizeCode}
              onChange={(event) => setDraft({ ...draft, prizeCode: event.target.value.toUpperCase() })}
              className={`mt-1.5 ${adminControl.input}`}
              maxLength={32}
              required
              autoCapitalize="characters"
            />
          </label>
          <label className="mt-4 block text-sm">
            Prize label
            <input
              value={draft.prizeLabel}
              onChange={(event) => setDraft({ ...draft, prizeLabel: event.target.value })}
              className={`mt-1.5 ${adminControl.input}`}
              maxLength={60}
              required
              placeholder="10% off your order"
            />
            <span className="mt-1 block text-xs text-mute">{draft.prizeLabel.length}/60</span>
          </label>
        </AdminPanel>

        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-[#fdf4f2] px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p role="status" className="rounded-xl border border-[#cfe0c8] bg-[#f3f8f1] px-4 py-3 text-sm text-[#3d5a3a]">{message}</p>
        ) : null}

        <AdminStickyActions>
          <AdminTip label={saving ? "Saving…" : "Save welcome scratch"}>
            <button type="submit" disabled={saving} className={adminBtn.primary}>
              {saving ? "Saving…" : "Save welcome scratch"}
            </button>
          </AdminTip>
        </AdminStickyActions>
      </form>
    </div>
  );
}
