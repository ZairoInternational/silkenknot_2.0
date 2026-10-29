"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Eye,
  Plus,
  Trash2,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { AdminEditorSkeleton, AdminTableSkeleton } from "@/components/admin/AdminSkeletons";
import { Media } from "@/components/ui";
import { csrfHeaders } from "@/lib/auth/browser";
import {
  BANNER_PLACEMENTS,
  BANNER_STATUSES,
  BANNER_TIMEZONE,
  toDatetimeLocalIst,
  type BannerPlacement,
  type BannerStatus,
} from "@/lib/banners/content";

type AdminBanner = {
  id: string;
  name: string;
  description: string;
  placement: BannerPlacement;
  image: { desktopUrl: string; mobileUrl: string; alt: string };
  title: string;
  subtitle: string;
  promotionalText: string;
  supportingText: string;
  cta: { enabled: boolean; label: string; href: string; openInNewTab: boolean };
  wholeBannerClickable: boolean;
  status: BannerStatus;
  startsAt: string;
  endsAt: string;
  timezone: string;
  priority: number;
  updatedAt: string;
  currentlyActive?: boolean;
  activityLabel?: string;
};

type BannerDraft = {
  name: string;
  description: string;
  placement: BannerPlacement;
  image: { desktopUrl: string; mobileUrl: string; alt: string };
  title: string;
  subtitle: string;
  promotionalText: string;
  supportingText: string;
  ctaEnabled: boolean;
  ctaLabel: string;
  ctaHref: string;
  ctaOpenInNewTab: boolean;
  wholeBannerClickable: boolean;
  startsAtLocal: string;
  endsAtLocal: string;
  priority: number;
};

const PLACEMENT_LABEL: Record<BannerPlacement, string> = {
  "homepage-hero": "Homepage hero (full-bleed)",
  "promotional-strip": "Promotional strip",
};

const emptyDraft = (): BannerDraft => ({
  name: "",
  description: "",
  placement: "homepage-hero",
  image: { desktopUrl: "", mobileUrl: "", alt: "" },
  title: "",
  subtitle: "",
  promotionalText: "",
  supportingText: "",
  ctaEnabled: false,
  ctaLabel: "",
  ctaHref: "",
  ctaOpenInNewTab: false,
  wholeBannerClickable: false,
  startsAtLocal: "",
  endsAtLocal: "",
  priority: 0,
});

function bannerToDraft(banner: AdminBanner): BannerDraft {
  return {
    name: banner.name,
    description: banner.description,
    placement: banner.placement,
    image: { ...banner.image },
    title: banner.title,
    subtitle: banner.subtitle,
    promotionalText: banner.promotionalText,
    supportingText: banner.supportingText,
    ctaEnabled: banner.cta.enabled,
    ctaLabel: banner.cta.label,
    ctaHref: banner.cta.href,
    ctaOpenInNewTab: banner.cta.openInNewTab,
    wholeBannerClickable: banner.wholeBannerClickable,
    startsAtLocal: toDatetimeLocalIst(banner.startsAt),
    endsAtLocal: toDatetimeLocalIst(banner.endsAt),
    priority: banner.priority,
  };
}

function draftToPayload(draft: BannerDraft) {
  const isHero = draft.placement === "homepage-hero";
  const linkHref = draft.ctaHref.trim();
  return {
    name: draft.name,
    description: draft.description,
    placement: draft.placement,
    image: draft.image,
    title: isHero ? "" : draft.title,
    subtitle: isHero ? "" : draft.subtitle,
    promotionalText: isHero ? "" : draft.promotionalText,
    supportingText: isHero ? "" : draft.supportingText,
    cta: isHero
      ? {
          enabled: Boolean(linkHref),
          label: "",
          href: linkHref,
          openInNewTab: draft.ctaOpenInNewTab,
        }
      : {
          enabled: draft.ctaEnabled,
          label: draft.ctaLabel,
          href: draft.ctaHref,
          openInNewTab: draft.ctaOpenInNewTab,
        },
    wholeBannerClickable: isHero ? Boolean(linkHref) : draft.wholeBannerClickable,
    startsAt: draft.startsAtLocal,
    endsAt: draft.endsAtLocal,
    priority: draft.priority,
  };
}

async function uploadAdminImage(file: File, fields: Record<string, string>) {
  const body = new FormData();
  body.append("file", file);
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  const response = await fetch("/api/admin/media", { method: "POST", headers: csrfHeaders(false), body });
  const payload = (await response.json()) as { url?: string; message?: string };
  if (!response.ok || !payload.url) throw new Error(payload.message || "Could not upload that image.");
  return payload.url;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      {label}
      {required ? <span className="text-red-700"> *</span> : null}
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border-b border-line bg-transparent outline-none"
      />
      {hint ? <span className="mt-1 block text-xs text-mute">{hint}</span> : null}
    </label>
  );
}

function statusTone(status: BannerStatus, active?: boolean) {
  if (active) return "bg-emerald-50 text-emerald-800";
  if (status === "draft") return "bg-stone-100 text-stone-700";
  if (status === "scheduled") return "bg-amber-50 text-amber-800";
  if (status === "published") return "bg-sky-50 text-sky-800";
  return "bg-stone-200 text-stone-600";
}

function BannerPreview({ draft, mode }: { draft: BannerDraft; mode: "desktop" | "mobile" }) {
  const src = mode === "mobile" ? draft.image.mobileUrl || draft.image.desktopUrl : draft.image.desktopUrl;
  const isHero = draft.placement === "homepage-hero";
  const linkHref = draft.ctaHref.trim();
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[#f6f1ea]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-mute">
        <span>Preview · {mode}</span>
        <span>{PLACEMENT_LABEL[draft.placement]}</span>
      </div>
      <div className={`relative ${mode === "mobile" ? "aspect-[4/5] max-w-sm mx-auto" : "aspect-[21/9]"} bg-[#e7dfd4]`}>
        {src ? (
          <Media src={src} alt={draft.image.alt || draft.name || "Preview"} sizes="600px" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-mute">Upload a desktop image to preview</div>
        )}
        {!isHero ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-[#2c2926]/50 via-[#2c2926]/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-5 text-[#f7f3ee]">
              {draft.title ? <p className="font-serif text-2xl">{draft.title}</p> : null}
              {draft.subtitle ? <p className="mt-1 text-sm opacity-90">{draft.subtitle}</p> : null}
              {draft.ctaEnabled ? (
                <span className="mt-3 inline-flex w-fit rounded-full bg-[#9a7352] px-4 py-1.5 text-sm">{draft.ctaLabel || "CTA"}</span>
              ) : (
                <span className="mt-3 text-xs uppercase tracking-[0.14em] opacity-70">No CTA</span>
              )}
            </div>
          </>
        ) : null}
      </div>
      {isHero ? (
        <p className="px-4 py-2 text-xs text-mute">
          {linkHref ? `Whole image links to ${linkHref}` : "Image only — no link configured"}
        </p>
      ) : draft.wholeBannerClickable && draft.ctaEnabled ? (
        <p className="px-4 py-2 text-xs text-mute">Entire banner clickable → {draft.ctaHref || "(missing href)"}</p>
      ) : null}
    </div>
  );
}

export function BannersList() {
  const [items, setItems] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [placement, setPlacement] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (placement) params.set("placement", placement);
    if (status) params.set("status", status);
    (async () => {
      try {
        const response = await fetch(`/api/admin/banners?${params}`, { headers: csrfHeaders() });
        const data = (await response.json()) as {
          ok?: boolean;
          items?: AdminBanner[];
          totalPages?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok) throw new Error(data.error || "Could not load banners.");
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        setError("");
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not load banners.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, placement, status]);

  const reload = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (placement) params.set("placement", placement);
    if (status) params.set("status", status);
    const response = await fetch(`/api/admin/banners?${params}`, { headers: csrfHeaders() });
    const data = (await response.json()) as {
      ok?: boolean;
      items?: AdminBanner[];
      totalPages?: number;
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || "Could not load banners.");
    setItems(data.items || []);
    setTotalPages(data.totalPages || 1);
  }, [page, placement, status]);

  const runAction = async (id: string, action: string) => {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: "PUT",
        headers: csrfHeaders(),
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Action failed.");
      setMessage(data.message || "Updated.");
      await reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (banner: AdminBanner) => {
    if (!window.confirm(`Delete “${banner.name}”? This cannot be undone. Managed CDN images are removed only if nothing else references them.`)) {
      return;
    }
    setBusyId(banner.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "DELETE",
        headers: csrfHeaders(),
        body: JSON.stringify({ confirm: true }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not delete.");
      setMessage(data.message || "Deleted.");
      await reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not delete.");
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    if (!placement) {
      setError("Filter by a placement before reordering.");
      return;
    }
    const ordered = [...items];
    const [row] = ordered.splice(index, 1);
    ordered.splice(next, 0, row);
    setBusyId(row.id);
    setError("");
    try {
      const response = await fetch("/api/admin/banners", {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({ action: "reorder", placement, orderedIds: ordered.map((item) => item.id) }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Could not reorder.");
      setMessage(data.message || "Order saved.");
      await reload();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not reorder.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Banners & Campaigns"
        purpose="Create, schedule, and publish storefront banners. Scheduling uses Asia/Kolkata. Homepage hero campaigns show full-bleed across the hero and rotate in the same carousel as your product slides. Promotional strip sits under the hero."
        action={
          <Link href="/admin/banners/new" className="inline-flex h-11 items-center gap-2 bg-ink px-5 text-[11px] uppercase tracking-[0.18em] text-paper">
            <Plus size={14} /> New campaign
          </Link>
        }
      />

      <div className="flex flex-wrap gap-4">
        <label className="text-sm">
          Placement
          <select
            value={placement}
            onChange={(event) => {
              setPage(1);
              setPlacement(event.target.value);
            }}
            className="ml-2 border-b border-line bg-transparent outline-none"
          >
            <option value="">All</option>
            {BANNER_PLACEMENTS.map((item) => (
              <option key={item} value={item}>
                {PLACEMENT_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Status
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
            className="ml-2 border-b border-line bg-transparent outline-none"
          >
            <option value="">All</option>
            {BANNER_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p role="status" className="text-sm text-red-700">{error}</p> : null}
      {message ? <p role="status" className="text-sm text-mute">{message}</p> : null}

      {loading ? (
        <AdminTableSkeleton rows={6} cols={5} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-serif text-2xl">No campaigns yet</p>
          <p className="mt-2 text-sm text-mute">Create a draft, upload images, then schedule or publish.</p>
          <Link href="/admin/banners/new" className="mt-6 inline-flex h-11 items-center bg-ink px-5 text-[11px] uppercase tracking-[0.18em] text-paper">
            Create campaign
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line text-[11px] uppercase tracking-[0.14em] text-mute">
              <tr>
                <th className="py-3 pr-4">Campaign</th>
                <th className="py-3 pr-4">Placement</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Schedule (IST)</th>
                <th className="py-3 pr-4">CTA</th>
                <th className="py-3 pr-4">Updated</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((banner, index) => (
                <tr key={banner.id} className="border-b border-line/70 align-top">
                  <td className="py-4 pr-4">
                    <div className="flex gap-3">
                      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[#e7dfd4]">
                        {banner.image.desktopUrl ? (
                          <Media src={banner.image.desktopUrl} alt="" sizes="80px" className="object-cover" />
                        ) : null}
                      </div>
                      <div>
                        <Link href={`/admin/banners/${banner.id}`} className="font-medium hover:underline">
                          {banner.name}
                        </Link>
                        <p className="mt-1 text-xs text-mute">{banner.activityLabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4">{PLACEMENT_LABEL[banner.placement]}</td>
                  <td className="py-4 pr-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${statusTone(banner.status, banner.currentlyActive)}`}>
                      {banner.status}
                      {banner.currentlyActive ? " · live" : ""}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-xs text-mute">
                    <div>{toDatetimeLocalIst(banner.startsAt).replace("T", " ")}</div>
                    <div>→ {toDatetimeLocalIst(banner.endsAt).replace("T", " ")}</div>
                  </td>
                  <td className="py-4 pr-4">{banner.cta.enabled ? banner.cta.label : "—"}</td>
                  <td className="py-4 pr-4 text-xs text-mute">{new Date(banner.updatedAt).toLocaleString("en-IN", { timeZone: BANNER_TIMEZONE })}</td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/banners/${banner.id}`} className="inline-flex h-8 items-center gap-1 border border-line px-2 text-xs">
                        <Eye size={12} /> Edit
                      </Link>
                      {banner.status !== "published" ? (
                        <button type="button" disabled={busyId === banner.id} onClick={() => void runAction(banner.id, "publish")} className="h-8 border border-line px-2 text-xs disabled:opacity-50">
                          Publish
                        </button>
                      ) : (
                        <button type="button" disabled={busyId === banner.id} onClick={() => void runAction(banner.id, "unpublish")} className="h-8 border border-line px-2 text-xs disabled:opacity-50">
                          Unpublish
                        </button>
                      )}
                      {banner.status !== "scheduled" ? (
                        <button type="button" disabled={busyId === banner.id} onClick={() => void runAction(banner.id, "schedule")} className="inline-flex h-8 items-center gap-1 border border-line px-2 text-xs disabled:opacity-50">
                          <CalendarClock size={12} /> Schedule
                        </button>
                      ) : null}
                      {banner.status !== "archived" ? (
                        <button type="button" disabled={busyId === banner.id} onClick={() => void runAction(banner.id, "archive")} className="inline-flex h-8 items-center gap-1 border border-line px-2 text-xs disabled:opacity-50">
                          <Archive size={12} /> Archive
                        </button>
                      ) : null}
                      {placement ? (
                        <>
                          <button type="button" disabled={busyId === banner.id || index === 0} onClick={() => void move(index, -1)} className="h-8 border border-line px-2 disabled:opacity-40" aria-label="Move up">
                            <ArrowUp size={12} />
                          </button>
                          <button type="button" disabled={busyId === banner.id || index === items.length - 1} onClick={() => void move(index, 1)} className="h-8 border border-line px-2 disabled:opacity-40" aria-label="Move down">
                            <ArrowDown size={12} />
                          </button>
                        </>
                      ) : null}
                      <button type="button" disabled={busyId === banner.id} onClick={() => void onDelete(banner)} className="inline-flex h-8 items-center gap-1 border border-red-200 px-2 text-xs text-red-700 disabled:opacity-50">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="border border-line px-3 py-1 disabled:opacity-40">
            Previous
          </button>
          <span className="text-mute">
            Page {page} of {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="border border-line px-3 py-1 disabled:opacity-40">
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function initialNewDraft(): BannerDraft {
  const start = new Date();
  const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
  return {
    ...emptyDraft(),
    startsAtLocal: toDatetimeLocalIst(start.toISOString()),
    endsAtLocal: toDatetimeLocalIst(end.toISOString()),
  };
}

export function BannerEditor({ id }: { id?: string }) {
  const router = useRouter();
  const isNew = !id || id === "new";
  const [draft, setDraft] = useState<BannerDraft>(() => {
    if (!isNew) return emptyDraft();
    return initialNewDraft();
  });
  const [savedSnapshot, setSavedSnapshot] = useState(() => (isNew ? JSON.stringify(draft) : ""));
  const [status, setStatus] = useState<BannerStatus>("draft");
  const [activityLabel, setActivityLabel] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [bannerId, setBannerId] = useState(isNew ? "" : id);

  const dirty = useMemo(() => JSON.stringify(draft) !== savedSnapshot, [draft, savedSnapshot]);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/admin/banners/${id}`, { headers: csrfHeaders() });
        const data = (await response.json()) as { ok?: boolean; banner?: AdminBanner; error?: string };
        if (!response.ok || !data.banner) throw new Error(data.error || "Could not load campaign.");
        if (cancelled) return;
        const next = bannerToDraft(data.banner);
        setDraft(next);
        setSavedSnapshot(JSON.stringify(next));
        setStatus(data.banner.status);
        setActivityLabel(data.banner.activityLabel || "");
        setBannerId(data.banner.id);
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "Could not load campaign.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const patch = (next: Partial<BannerDraft>) => setDraft((current) => ({ ...current, ...next }));

  const onUpload = async (files: FileList | null, slot: "desktop" | "mobile") => {
    const file = files?.[0];
    if (!file || uploading) return;
    setUploading(slot);
    setError("");
    setMessage("");
    try {
      const scope = bannerId || `draft-${Date.now().toString(36)}`;
      const url = await uploadAdminImage(file, { role: "banner", scope: scope.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "homepage" });
      if (slot === "desktop") {
        patch({
          image: {
            ...draft.image,
            desktopUrl: url,
            alt: draft.image.alt || draft.name || file.name.replace(/\.[^.]+$/, ""),
          },
        });
      } else {
        patch({ image: { ...draft.image, mobileUrl: url } });
      }
      setMessage(`${slot === "desktop" ? "Desktop" : "Mobile"} image uploaded.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (isNew && !bannerId) {
        const response = await fetch("/api/admin/banners", {
          method: "POST",
          headers: csrfHeaders(),
          body: JSON.stringify(draftToPayload(draft)),
        });
        const data = (await response.json()) as { ok?: boolean; banner?: AdminBanner; error?: string; message?: string };
        if (!response.ok || !data.banner) throw new Error(data.error || "Could not create draft.");
        setBannerId(data.banner.id);
        const next = bannerToDraft(data.banner);
        setDraft(next);
        setSavedSnapshot(JSON.stringify(next));
        setStatus(data.banner.status);
        setActivityLabel(data.banner.activityLabel || "");
        setMessage(data.message || "Draft created.");
        router.replace(`/admin/banners/${data.banner.id}`);
        return;
      }
      const response = await fetch(`/api/admin/banners/${bannerId}`, {
        method: "PUT",
        headers: csrfHeaders(),
        body: JSON.stringify(draftToPayload(draft)),
      });
      const data = (await response.json()) as { ok?: boolean; banner?: AdminBanner; error?: string; message?: string };
      if (!response.ok || !data.banner) throw new Error(data.error || "Could not save.");
      const next = bannerToDraft(data.banner);
      setDraft(next);
      setSavedSnapshot(JSON.stringify(next));
      setStatus(data.banner.status);
      setActivityLabel(data.banner.activityLabel || "");
      setMessage(data.message || "Saved.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const runStatus = async (action: "publish" | "unpublish" | "schedule" | "archive") => {
    if (!bannerId) {
      setError("Save the draft before changing publication status.");
      return;
    }
    if (dirty) {
      setError("Save your changes before publishing or scheduling.");
      return;
    }
    if (action === "publish" && !window.confirm("Publish this campaign? It will be live only inside its Asia/Kolkata schedule window.")) {
      return;
    }
    if (action === "archive" && !window.confirm("Archive this campaign? It will leave the storefront immediately.")) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/banners/${bannerId}`, {
        method: "PUT",
        headers: csrfHeaders(),
        body: JSON.stringify({
          action,
          startsAt: draft.startsAtLocal,
          endsAt: draft.endsAtLocal,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; banner?: AdminBanner; error?: string; message?: string };
      if (!response.ok || !data.banner) throw new Error(data.error || "Could not update status.");
      const next = bannerToDraft(data.banner);
      setDraft(next);
      setSavedSnapshot(JSON.stringify(next));
      setStatus(data.banner.status);
      setActivityLabel(data.banner.activityLabel || "");
      setMessage(data.message || "Updated.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not update status.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminEditorSkeleton />;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={isNew && !bannerId ? "New campaign" : draft.name || "Edit campaign"}
        purpose="Upload desktop and optional mobile images to BunnyCDN, configure an optional CTA, and schedule in Asia/Kolkata. Save as draft before publishing."
        action={
          <Link href="/admin/banners" className="text-sm text-mute underline">
            Back to list
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] ${statusTone(status)}`}>{status}</span>
        {activityLabel ? <span className="text-mute">{activityLabel}</span> : null}
        {dirty ? <span className="text-amber-800">Unsaved changes</span> : null}
      </div>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] xl:items-start">
        <form
          className="space-y-10"
          onSubmit={(event) => {
            event.preventDefault();
            void saveDraft();
          }}
        >
          <section className="space-y-4 border-b border-line pb-10">
            <h2 className="font-serif text-3xl">Campaign details</h2>
            <Field label="Campaign name" value={draft.name} onChange={(name) => patch({ name })} required />
            <label className="block text-sm">
              Internal description
              <textarea
                value={draft.description}
                onChange={(event) => patch({ description: event.target.value })}
                rows={2}
                className="mt-2 w-full border-b border-line bg-transparent outline-none"
              />
            </label>
            <label className="block text-sm">
              Placement <span className="text-red-700">*</span>
              <select
                value={draft.placement}
                onChange={(event) => patch({ placement: event.target.value as BannerPlacement })}
                className="mt-2 w-full border-b border-line bg-transparent outline-none"
              >
                {BANNER_PLACEMENTS.map((item) => (
                  <option key={item} value={item}>
                    {PLACEMENT_LABEL[item]}
                  </option>
                ))}
              </select>
            </label>
            {draft.placement === "homepage-hero" ? (
              <p className="text-sm text-mute">
                Homepage hero campaigns are full-bleed images only (no overlay text or buttons). They lead the carousel, then your existing product slides continue.
              </p>
            ) : (
              <>
                <Field label="Title" value={draft.title} onChange={(title) => patch({ title })} />
                <Field label="Subtitle" value={draft.subtitle} onChange={(subtitle) => patch({ subtitle })} />
                <Field label="Promotional text" value={draft.promotionalText} onChange={(promotionalText) => patch({ promotionalText })} />
                <label className="block text-sm">
                  Supporting text
                  <textarea
                    value={draft.supportingText}
                    onChange={(event) => patch({ supportingText: event.target.value })}
                    rows={3}
                    className="mt-2 w-full border-b border-line bg-transparent outline-none"
                  />
                </label>
              </>
            )}
            <Field
              label="Priority"
              type="number"
              value={draft.priority}
              onChange={(value) => patch({ priority: Number(value) || 0 })}
              hint="Higher priority shows first within the same placement."
            />
          </section>

          <section className="space-y-4 border-b border-line pb-10">
            <h2 className="font-serif text-3xl">Images</h2>
            <Field
              label="Image alt text"
              value={draft.image.alt}
              onChange={(alt) => patch({ image: { ...draft.image, alt } })}
              hint="Required for accessibility. Falls back to the campaign name if empty."
            />
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm">Desktop image <span className="text-red-700">*</span></p>
                <div className="relative mt-2 aspect-video overflow-hidden rounded-xl bg-[#e7dfd4]">
                  {draft.image.desktopUrl ? (
                    <Media src={draft.image.desktopUrl} alt="" sizes="320px" className="object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-mute">No desktop image</div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={Boolean(uploading)}
                  className="mt-3 block w-full text-sm"
                  onChange={(event) => void onUpload(event.target.files, "desktop")}
                />
                <span className="mt-1 block text-xs text-mute">
                  {uploading === "desktop" ? "Uploading…" : "JPEG, PNG, or WebP under 6 MB. Required before publish."}
                </span>
              </div>
              <div>
                <p className="text-sm">Mobile image (optional)</p>
                <div className="relative mt-2 aspect-[4/5] max-w-xs overflow-hidden rounded-xl bg-[#e7dfd4]">
                  {draft.image.mobileUrl ? (
                    <Media src={draft.image.mobileUrl} alt="" sizes="240px" className="object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-mute">Falls back to desktop</div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={Boolean(uploading)}
                  className="mt-3 block w-full text-sm"
                  onChange={(event) => void onUpload(event.target.files, "mobile")}
                />
                {draft.image.mobileUrl ? (
                  <button
                    type="button"
                    className="mt-2 text-xs text-mute underline"
                    onClick={() => patch({ image: { ...draft.image, mobileUrl: "" } })}
                  >
                    Remove mobile image
                  </button>
                ) : null}
                <span className="mt-1 block text-xs text-mute">{uploading === "mobile" ? "Uploading…" : "Optional."}</span>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-b border-line pb-10">
            {draft.placement === "homepage-hero" ? (
              <>
                <h2 className="font-serif text-3xl">Optional link</h2>
                <p className="text-sm text-mute">
                  Leave empty for a non-clickable image. If set, the whole campaign image becomes the link — no separate button.
                </p>
                <Field
                  label="Destination URL"
                  value={draft.ctaHref}
                  onChange={(ctaHref) => patch({ ctaHref, ctaEnabled: Boolean(ctaHref.trim()), wholeBannerClickable: Boolean(ctaHref.trim()) })}
                  hint="Internal path like /collections/bestsellers, or https://…"
                />
                {draft.ctaHref.trim() ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.ctaOpenInNewTab}
                      onChange={(event) => patch({ ctaOpenInNewTab: event.target.checked })}
                    />
                    Open in new tab
                  </label>
                ) : null}
              </>
            ) : (
              <>
                <h2 className="font-serif text-3xl">CTA</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.ctaEnabled}
                    onChange={(event) =>
                      patch({
                        ctaEnabled: event.target.checked,
                        wholeBannerClickable: event.target.checked ? draft.wholeBannerClickable : false,
                      })
                    }
                  />
                  Enable CTA button
                </label>
                {draft.ctaEnabled ? (
                  <div className="space-y-4">
                    <Field label="Button label" value={draft.ctaLabel} onChange={(ctaLabel) => patch({ ctaLabel })} required />
                    <Field
                      label="Destination URL"
                      value={draft.ctaHref}
                      onChange={(ctaHref) => patch({ ctaHref })}
                      required
                      hint="Internal path like /collections/bestsellers, or https://…"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.ctaOpenInNewTab}
                        onChange={(event) => patch({ ctaOpenInNewTab: event.target.checked })}
                      />
                      Open in new tab
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.wholeBannerClickable}
                        onChange={(event) => patch({ wholeBannerClickable: event.target.checked })}
                      />
                      Make entire banner clickable
                    </label>
                  </div>
                ) : (
                  <p className="text-sm text-mute">Banner will render without a button.</p>
                )}
              </>
            )}
          </section>

          <section className="space-y-4 border-b border-line pb-10">
            <h2 className="font-serif text-3xl">Schedule</h2>
            <p className="text-sm text-mute">Timezone: {BANNER_TIMEZONE}. Date-only ends are treated as end of that IST day.</p>
            <Field label="Starts at" type="datetime-local" value={draft.startsAtLocal} onChange={(startsAtLocal) => patch({ startsAtLocal })} required />
            <Field label="Ends at" type="datetime-local" value={draft.endsAtLocal} onChange={(endsAtLocal) => patch({ endsAtLocal })} required />
          </section>

          {error ? <p role="status" className="text-sm text-red-700">{error}</p> : null}
          {message ? <p role="status" className="text-sm text-mute">{message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving || Boolean(uploading)} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper disabled:opacity-60">
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button type="button" disabled={saving || !bannerId} onClick={() => void runStatus("schedule")} className="h-12 border border-line px-5 text-[11px] uppercase tracking-[0.18em] disabled:opacity-60">
              Schedule
            </button>
            <button type="button" disabled={saving || !bannerId} onClick={() => void runStatus("publish")} className="h-12 border border-line px-5 text-[11px] uppercase tracking-[0.18em] disabled:opacity-60">
              Publish
            </button>
            <button type="button" disabled={saving || !bannerId || status === "draft"} onClick={() => void runStatus("unpublish")} className="h-12 border border-line px-5 text-[11px] uppercase tracking-[0.18em] disabled:opacity-60">
              Unpublish
            </button>
            <button type="button" disabled={saving || !bannerId} onClick={() => void runStatus("archive")} className="h-12 border border-line px-5 text-[11px] uppercase tracking-[0.18em] disabled:opacity-60">
              Archive
            </button>
          </div>
        </form>

        <div className="order-first space-y-4 xl:order-none xl:sticky xl:top-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`h-9 px-3 text-xs uppercase tracking-[0.14em] ${previewMode === "desktop" ? "bg-ink text-paper" : "border border-line"}`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={`h-9 px-3 text-xs uppercase tracking-[0.14em] ${previewMode === "mobile" ? "bg-ink text-paper" : "border border-line"}`}
            >
              Mobile
            </button>
          </div>
          <BannerPreview draft={draft} mode={previewMode} />
        </div>
      </div>
    </div>
  );
}
