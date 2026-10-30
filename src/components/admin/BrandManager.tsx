"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Eye,
  ImagePlus,
  Leaf,
  Lightbulb,
  Link2,
  Lock,
  Menu,
  Save,
  Search,
  ShoppingBag,
  User,
} from "lucide-react";
import { AdminEditorSkeleton } from "@/components/admin/AdminSkeletons";
import { csrfHeaders } from "@/lib/auth/browser";
import { primeBrandCache } from "@/lib/brand/client";
import type {
  BrandAlign,
  BrandPlacementId,
  BrandPlacementSettings,
  BrandSettings,
  BrandSpacing,
} from "@/lib/brand/content";
import {
  BRAND_ALIGN_OPTIONS,
  BRAND_PLACEMENT_META,
  BRAND_PLACEMENTS,
  BRAND_SIZE_PRESETS,
  BRAND_SPACING_OPTIONS,
  DEFAULT_BRAND,
  getBrandPlacement,
  getBrandPlacementIcon,
} from "@/lib/brand/content";

/** Mockup accent — scoped to this page only (sidenav stays on global ink). */
const TEAL = "#0D2C2E";
const CARD = "#FFFFFF";
const MUTE = "#6B7280";
const LINE = "#E8E4DC";
const FIELD = "#F7F5F0";

const GALLERY_LABEL: Record<BrandPlacementId, string> = {
  header: "Site header (desktop)",
  footer: "Footer",
  checkout: "Checkout",
  auth: "Sign-in",
  welcome: "Welcome offer",
};

function brandFileName(url: string) {
  try {
    const path = url.split("?")[0] || url;
    const name = path.split("/").pop() || "logo.png";
    return decodeURIComponent(name);
  } catch {
    return "logo.png";
  }
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SocialDots({ light = false }: { light?: boolean }) {
  const fill = light ? "rgba(255,255,255,0.55)" : "#9CA3AF";
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="inline-flex size-5 items-center justify-center rounded-full" style={{ background: fill }}>
          <span className="size-1.5 rounded-full bg-white/80" />
        </span>
      ))}
    </div>
  );
}

function BrandMarkInline({
  brand,
  placement,
  maxHeight,
  wordmarkClassName = "text-sm font-medium",
}: {
  brand: BrandSettings;
  placement: BrandPlacementId;
  maxHeight?: number;
  wordmarkClassName?: string;
}) {
  const spot = getBrandPlacement(brand, placement);
  const src = getBrandPlacementIcon(brand, placement);
  const name = brand.iconAlt || DEFAULT_BRAND.iconAlt;
  const gap = spot.spacing === "compact" ? "gap-1" : spot.spacing === "relaxed" ? "gap-3" : "gap-2";
  const height = maxHeight ? Math.min(spot.height, maxHeight) : spot.height;
  const maxWidth = maxHeight ? Math.min(spot.maxWidth, Math.round(maxHeight * 3.2)) : spot.maxWidth;
  return (
    <span className={`inline-flex items-center ${gap}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        style={{
          height,
          width: "auto",
          maxWidth,
          filter: spot.lightOnDark ? "brightness(0) invert(1)" : undefined,
        }}
        className="object-contain"
      />
      {spot.showWordmark ? <span className={wordmarkClassName}>{name}</span> : null}
    </span>
  );
}

function BrandPlacementStage({
  brand,
  placement,
  compact = false,
}: {
  brand: BrandSettings;
  placement: BrandPlacementId;
  compact?: boolean;
}) {
  const spot = getBrandPlacement(brand, placement);
  const align =
    spot.align === "left" ? "justify-start" : spot.align === "right" ? "justify-end" : "justify-center";
  const cap = compact ? 28 : undefined;

  if (placement === "header") {
    const dark = spot.lightOnDark;
    return (
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: LINE, background: dark ? TEAL : "#fff", color: dark ? "#fff" : TEAL }}
      >
        <div className={`flex items-center gap-3 px-3 ${compact ? "h-11" : "h-14"} ${align}`}>
          <Menu size={compact ? 14 : 16} className="shrink-0" style={{ color: dark ? "rgba(255,255,255,0.65)" : MUTE }} aria-hidden />
          <div className="min-w-0 flex-1">
            <BrandMarkInline
              brand={brand}
              placement={placement}
              maxHeight={cap}
              wordmarkClassName={compact ? "text-xs font-semibold" : "text-sm font-semibold"}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2.5" style={{ color: dark ? "rgba(255,255,255,0.65)" : MUTE }}>
            <Search size={compact ? 13 : 15} aria-hidden />
            <User size={compact ? 13 : 15} aria-hidden />
            <ShoppingBag size={compact ? 13 : 15} aria-hidden />
          </div>
        </div>
      </div>
    );
  }

  if (placement === "footer") {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl px-4 ${compact ? "min-h-[4.5rem] py-3" : "min-h-24 py-5"} ${align}`}
        style={{ background: TEAL }}
      >
        <div className="min-w-0 flex-1">
          <BrandMarkInline
            brand={brand}
            placement={placement}
            maxHeight={cap}
            wordmarkClassName={compact ? "text-xs font-medium text-white" : "text-base font-medium text-white"}
          />
        </div>
        <SocialDots light />
      </div>
    );
  }

  if (placement === "checkout") {
    const dark = spot.lightOnDark;
    return (
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: LINE, background: dark ? TEAL : "#fff", color: dark ? "#fff" : TEAL }}
      >
        <div className={`flex items-center px-4 ${compact ? "h-12" : "h-14"} ${align}`}>
          <BrandMarkInline brand={brand} placement={placement} maxHeight={cap} />
        </div>
        <div
          className={`flex items-center justify-center gap-1.5 border-t ${compact ? "py-2 text-[10px]" : "py-2.5 text-xs"}`}
          style={{
            borderColor: dark ? "rgba(255,255,255,0.15)" : LINE,
            color: dark ? "rgba(255,255,255,0.7)" : MUTE,
            background: dark ? "rgba(0,0,0,0.15)" : FIELD,
          }}
        >
          <Lock size={11} aria-hidden /> Secure checkout
        </div>
      </div>
    );
  }

  if (placement === "auth") {
    const dark = spot.lightOnDark;
    return (
      <div
        className="overflow-hidden rounded-xl border p-4"
        style={{ borderColor: LINE, background: dark ? TEAL : "#fff", color: dark ? "#fff" : TEAL }}
      >
        <div className={`flex ${align}`}>
          <BrandMarkInline brand={brand} placement={placement} maxHeight={cap} />
        </div>
        <p className={`mt-3 font-semibold ${compact ? "text-sm" : "text-lg"}`}>
          Welcome back
        </p>
        <div
          className={`mt-3 flex items-center justify-center rounded-lg ${compact ? "h-8 text-[10px]" : "h-9 text-xs"}`}
          style={{
            background: dark ? "#fff" : TEAL,
            color: dark ? TEAL : "#fff",
          }}
        >
          Sign in
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl px-4 text-white ${compact ? "py-4" : "py-5"}`}
      style={{ background: `linear-gradient(160deg, ${TEAL} 0%, #163a3c 55%, #1f4d4f 100%)` }}
    >
      <Leaf
        size={compact ? 36 : 48}
        className="pointer-events-none absolute -right-1 bottom-1 opacity-20"
        aria-hidden
      />
      <div className={`flex ${align}`}>
        <BrandMarkInline
          brand={brand}
          placement={placement}
          maxHeight={cap}
          wordmarkClassName="text-xs font-medium text-white"
        />
      </div>
      <p className={`mt-2 font-semibold ${compact ? "text-sm" : "text-base"}`}>A little something</p>
      <p className={`mt-0.5 opacity-70 ${compact ? "text-[10px]" : "text-xs"}`}>Welcome offer</p>
    </div>
  );
}

function BrandToggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 py-1 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium" style={{ color: TEAL }}>
          {label}
        </span>
        {hint ? (
          <span className="mt-0.5 block text-xs font-normal" style={{ color: MUTE }}>
            {hint}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        style={{
          position: "relative",
          display: "inline-block",
          width: 44,
          height: 24,
          flexShrink: 0,
          borderRadius: 9999,
          background: on ? TEAL : "#D1D5DB",
          transition: "background-color 160ms ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 20,
            height: 20,
            borderRadius: 9999,
            background: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.22)",
            transform: on ? "translateX(20px)" : "translateX(0)",
            transition: "transform 160ms ease",
          }}
        />
      </span>
    </button>
  );
}

export function BrandManager() {
  const previewRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<BrandSettings>(DEFAULT_BRAND);
  const [active, setActive] = useState<BrandPlacementId>("header");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPlacement, setUploadingPlacement] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assetMeta, setAssetMeta] = useState<{ name: string; width: number; height: number; sizeLabel: string } | null>(null);

  const inspectUrl = (url: string, nameHint?: string, sizeBytes?: number) => {
    if (!url) {
      setAssetMeta(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      setAssetMeta({
        name: nameHint || brandFileName(url),
        width: img.naturalWidth || 0,
        height: img.naturalHeight || 0,
        sizeLabel: sizeBytes ? formatBytes(sizeBytes) : "",
      });
    };
    img.onerror = () => {
      setAssetMeta({
        name: nameHint || brandFileName(url),
        width: 0,
        height: 0,
        sizeLabel: sizeBytes ? formatBytes(sizeBytes) : "",
      });
    };
    img.src = url;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/brand", { headers: csrfHeaders() });
        const data = (await response.json()) as { ok?: boolean; brand?: BrandSettings; error?: string };
        if (!response.ok || !data.brand) throw new Error(data.error || "Could not load the brand icon.");
        if (cancelled) return;
        setDraft(data.brand);
        inspectUrl(data.brand.iconUrl);
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

  const patchPlacement = (id: BrandPlacementId, next: Partial<BrandPlacementSettings>) => {
    setDraft((current) => {
      const merged: BrandPlacementSettings = { ...getBrandPlacement(current, id), ...next };
      if (!merged.iconUrl?.trim()) {
        delete merged.iconUrl;
      } else {
        merged.iconUrl = merged.iconUrl.trim();
      }
      return {
        ...current,
        placements: {
          ...current.placements,
          [id]: merged,
        },
      };
    });
  };

  const save = async () => {
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
      setMessage(data.message || "Logo settings saved.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const uploadBrandFile = async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    body.append("role", "brand");
    const response = await fetch("/api/admin/media", { method: "POST", headers: csrfHeaders(false), body });
    const payload = (await response.json()) as { url?: string; message?: string };
    if (!response.ok || !payload.url) throw new Error(payload.message || "Could not upload that image.");
    return payload.url;
  };

  const onUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const url = await uploadBrandFile(file);
      patch({ iconUrl: url });
      inspectUrl(url, file.name, file.size);
      setMessage("Default logo uploaded. Save to publish. Surfaces without a custom logo use this file.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  };

  const onUploadPlacement = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || uploadingPlacement) return;
    setUploadingPlacement(true);
    setError("");
    setMessage("");
    try {
      const url = await uploadBrandFile(file);
      patchPlacement(active, { iconUrl: url });
      setMessage(`Custom logo set for ${BRAND_PLACEMENT_META[active].title}. Save to publish.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not upload that image.");
    } finally {
      setUploadingPlacement(false);
    }
  };

  if (loading) return <AdminEditorSkeleton />;

  const spot = getBrandPlacement(draft, active);
  const meta = BRAND_PLACEMENT_META[active];
  const placementIcon = getBrandPlacementIcon(draft, active);
  const hasCustomPlacementLogo = Boolean(spot.iconUrl?.trim());
  const nearestPreset = BRAND_SIZE_PRESETS.reduce((best, preset) =>
    Math.abs(preset.height - spot.height) < Math.abs(best.height - spot.height) ? preset : best,
  );
  const brandNameLimit = 60;
  const canRemove = Boolean(draft.iconUrl && draft.iconUrl !== DEFAULT_BRAND.iconUrl);
  const metaBits = [
    assetMeta?.name || brandFileName(draft.iconUrl || DEFAULT_BRAND.iconUrl),
    assetMeta?.width && assetMeta?.height ? `${assetMeta.width} × ${assetMeta.height} px` : "",
    assetMeta?.sizeLabel || "",
  ].filter(Boolean);

  const cardShadow = "0 8px 28px -18px rgba(13, 44, 46, 0.28)";
  const rangeClass =
    "mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E5E7EB] accent-[#0D2C2E] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0D2C2E]";

  return (
    <div className="-mx-1 space-y-5 md:space-y-6" style={{ color: TEAL, background: "transparent" }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h1 className="text-[1.85rem] font-semibold tracking-tight md:text-[2.15rem]" style={{ color: TEAL }}>
            Brand Logo & Identity
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: MUTE }}>
            Manage your brand logo and how it appears across the store. These changes will be applied to all pages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="inline-flex h-10 items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition hover:bg-[#FAFAF8]"
            style={{ borderColor: LINE, color: TEAL }}
          >
            <Eye size={15} />
            Preview changes
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white transition disabled:opacity-60"
            style={{ background: TEAL }}
          >
            <Save size={15} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {(error || message) && (
        <div className="space-y-2">
          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-[#fdf4f2] px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p role="status" className="rounded-xl border border-[#cfe0c8] bg-[#f3f8f1] px-4 py-3 text-sm text-[#3d5a3a]">
              {message}
            </p>
          ) : null}
        </div>
      )}

      {/* Top cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5" style={{ borderColor: LINE, boxShadow: cardShadow }}>
          <p className="text-sm font-semibold">Brand logo</p>
          <div
            className="mt-4 flex min-h-[10rem] items-center justify-center rounded-2xl border px-6 py-8"
            style={{ borderColor: LINE, background: FIELD }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.iconUrl || DEFAULT_BRAND.iconUrl}
              alt={draft.iconAlt || "Brand logo"}
              className="max-h-28 w-auto max-w-full object-contain"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <label
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition hover:bg-[#FAFAF8]"
              style={{ borderColor: LINE, color: TEAL }}
            >
              <ImagePlus size={15} />
              {uploading ? "Uploading…" : "Replace logo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                className="sr-only"
                onChange={(event) => void onUpload(event.target.files)}
              />
            </label>
            <button
              type="button"
              disabled={!canRemove}
              onClick={() => {
                patch({ iconUrl: DEFAULT_BRAND.iconUrl });
                inspectUrl(DEFAULT_BRAND.iconUrl);
                setMessage("Logo reset to the default mark. Save to publish.");
              }}
              className="inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderColor: LINE, color: MUTE }}
            >
              Remove
            </button>
          </div>
          <p className="mt-3 text-xs" style={{ color: MUTE }}>
            {metaBits.join(" · ")}
          </p>
          <p className="mt-3 rounded-xl px-3 py-2.5 text-xs" style={{ background: FIELD, color: MUTE }}>
            Recommended size 1200 × 400 px, Transparent background.
          </p>
        </section>

        <section className="rounded-2xl border bg-white p-5" style={{ borderColor: LINE, boxShadow: cardShadow }}>
          <p className="text-sm font-semibold">Brand info</p>
          <label className="mt-5 block text-sm font-medium">
            <span className="flex items-center justify-between gap-2">
              <span>Brand name</span>
              <span className="text-xs font-normal tabular-nums" style={{ color: MUTE }}>
                {Math.min(draft.iconAlt.length, brandNameLimit)}/{brandNameLimit}
              </span>
            </span>
            <input
              value={draft.iconAlt}
              maxLength={brandNameLimit}
              onChange={(event) => patch({ iconAlt: event.target.value.slice(0, brandNameLimit) })}
              className="mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none transition"
              style={{ borderColor: LINE, background: FIELD, color: TEAL }}
            />
          </label>
          <label className="mt-5 block text-sm font-medium">
            Logo URL <span className="font-normal" style={{ color: MUTE }}>(optional)</span>
            <span
              className="mt-2 flex h-11 items-center gap-2 rounded-xl border px-3"
              style={{ borderColor: LINE, background: FIELD }}
            >
              <Link2 size={15} style={{ color: MUTE }} aria-hidden />
              <input
                value={draft.iconUrl}
                onChange={(event) => {
                  const iconUrl = event.target.value;
                  patch({ iconUrl });
                  inspectUrl(iconUrl);
                }}
                placeholder="https://cdn.example.com/logo.png"
                className="h-full w-full bg-transparent text-sm outline-none"
                style={{ color: TEAL }}
              />
            </span>
          </label>
        </section>
      </div>

      {/* Placement */}
      <section className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: LINE, boxShadow: cardShadow }}>
        <div className="px-5 pt-5">
          <p className="text-sm font-semibold">Logo placement</p>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          {BRAND_PLACEMENTS.map((id) => {
            const selected = id === active;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className="shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition"
                style={
                  selected
                    ? { background: TEAL, color: "#fff" }
                    : { background: FIELD, color: MUTE }
                }
              >
                {BRAND_PLACEMENT_META[id].title}
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium" style={{ color: MUTE }}>
              Preview in {meta.title.toLowerCase()}
            </p>
            <div className="mt-3">
              <BrandPlacementStage brand={draft} placement={active} />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold">Logo size</p>
              <div className="mt-2 grid grid-cols-4 overflow-hidden rounded-xl border" style={{ borderColor: LINE }}>
                {BRAND_SIZE_PRESETS.map((preset, index) => {
                  const selected = nearestPreset.id === preset.id && Math.abs(spot.height - preset.height) <= 10;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => patchPlacement(active, { height: preset.height, maxWidth: preset.maxWidth })}
                      className="h-10 text-sm font-semibold transition"
                      style={{
                        background: selected ? TEAL : CARD,
                        color: selected ? "#fff" : MUTE,
                        borderLeft: index === 0 ? undefined : `1px solid ${LINE}`,
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block text-sm font-medium">
                <span className="flex items-center justify-between gap-2">
                  <span>Logo height</span>
                  <span className="tabular-nums font-normal" style={{ color: MUTE }}>
                    {spot.height}px
                  </span>
                </span>
                <input
                  type="range"
                  min={12}
                  max={96}
                  step={1}
                  value={spot.height}
                  onChange={(event) => patchPlacement(active, { height: Number(event.target.value) })}
                  className={rangeClass}
                />
              </label>

              <label className="block text-sm font-medium">
                <span className="flex items-center justify-between gap-2">
                  <span>Max width</span>
                  <span className="tabular-nums font-normal" style={{ color: MUTE }}>
                    {spot.maxWidth}px
                  </span>
                </span>
                <input
                  type="range"
                  min={40}
                  max={280}
                  step={4}
                  value={spot.maxWidth}
                  onChange={(event) => patchPlacement(active, { maxWidth: Number(event.target.value) })}
                  className={rangeClass}
                />
              </label>
            </div>

            <div className="space-y-3 border-t pt-4" style={{ borderColor: LINE }}>
              <div>
                <p className="text-sm font-semibold">Logo for this surface</p>
                <p className="mt-1 text-xs" style={{ color: MUTE }}>
                  Optional. Use a different file when the default mark does not fit this background.
                </p>
                <div
                  className="mt-3 flex min-h-[4.5rem] items-center justify-center rounded-xl border px-4 py-3"
                  style={{
                    borderColor: LINE,
                    background: spot.lightOnDark ? TEAL : FIELD,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={placementIcon}
                    alt=""
                    className="max-h-12 w-auto max-w-full object-contain"
                    style={{
                      filter: spot.lightOnDark ? "brightness(0) invert(1)" : undefined,
                    }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 text-xs font-medium"
                    style={{ borderColor: LINE, color: TEAL }}
                  >
                    <ImagePlus size={14} />
                    {uploadingPlacement ? "Uploading…" : hasCustomPlacementLogo ? "Replace custom" : "Upload custom"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingPlacement}
                      className="sr-only"
                      onChange={(event) => void onUploadPlacement(event.target.files)}
                    />
                  </label>
                  {hasCustomPlacementLogo ? (
                    <button
                      type="button"
                      onClick={() => {
                        patchPlacement(active, { iconUrl: "" });
                        setMessage(`Using the default logo again on ${meta.title}. Save to publish.`);
                      }}
                      className="inline-flex h-9 items-center rounded-xl border px-3 text-xs font-medium"
                      style={{ borderColor: LINE, color: MUTE }}
                    >
                      Use default logo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4" style={{ borderColor: LINE }}>
              <BrandToggle
                label="Show brand name"
                hint="Show the brand text next to the logo"
                on={spot.showWordmark}
                onChange={(showWordmark) => patchPlacement(active, { showWordmark })}
              />
              <BrandToggle
                label="Light on dark"
                hint="Force a white logo for dark backgrounds"
                on={spot.lightOnDark}
                onChange={(lightOnDark) => patchPlacement(active, { lightOnDark })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Logo alignment
                <span
                  className="mt-2 flex h-11 items-center gap-2 rounded-xl border px-3"
                  style={{ borderColor: LINE, background: FIELD }}
                >
                  {spot.align === "left" ? <AlignLeft size={15} style={{ color: MUTE }} /> : null}
                  {spot.align === "center" ? <AlignCenter size={15} style={{ color: MUTE }} /> : null}
                  {spot.align === "right" ? <AlignRight size={15} style={{ color: MUTE }} /> : null}
                  <select
                    value={spot.align}
                    onChange={(event) => patchPlacement(active, { align: event.target.value as BrandAlign })}
                    className="h-full w-full bg-transparent text-sm outline-none"
                    style={{ color: TEAL }}
                  >
                    {BRAND_ALIGN_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </span>
              </label>
              <label className="block text-sm font-medium">
                Spacing
                <select
                  value={spot.spacing}
                  onChange={(event) => patchPlacement(active, { spacing: event.target.value as BrandSpacing })}
                  className="mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none"
                  style={{ borderColor: LINE, background: FIELD, color: TEAL }}
                >
                  {BRAND_SPACING_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Live preview gallery */}
      <section ref={previewRef} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Live preview</p>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: "#E8F5F0", color: "#1B6B57" }}
          >
            <span className="size-1.5 rounded-full" style={{ background: "#1B6B57" }} aria-hidden />
            Live update
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {BRAND_PLACEMENTS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className="rounded-2xl border bg-white p-3 text-left transition"
              style={{
                borderColor: active === id ? TEAL : LINE,
                boxShadow: cardShadow,
                outline: active === id ? `1px solid ${TEAL}` : undefined,
              }}
            >
              <p className="mb-2 text-[11px] font-medium" style={{ color: MUTE }}>
                {GALLERY_LABEL[id]}
              </p>
              <BrandPlacementStage brand={draft} placement={id} compact />
            </button>
          ))}
        </div>
      </section>

      <p
        className="flex items-start gap-2.5 rounded-2xl border px-4 py-3.5 text-sm"
        style={{ borderColor: LINE, background: "#FBF9F4", color: MUTE }}
      >
        <Lightbulb size={16} className="mt-0.5 shrink-0" style={{ color: TEAL }} aria-hidden />
        <span>
          Tip: Changes will be applied across all surfaces after saving. You can always revert to the previous version.
        </span>
      </p>
    </div>
  );
}
