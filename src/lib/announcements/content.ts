export const ANNOUNCEMENTS_CONTENT_ID = "site-announcements";

export const ANNOUNCEMENT_ICONS = ["sparkles", "truck", "gift", "leaf", "flame"] as const;
export type AnnouncementIcon = (typeof ANNOUNCEMENT_ICONS)[number];

export type AnnouncementNote = {
  id: string;
  text: string;
  href: string;
  icon: AnnouncementIcon;
  active: boolean;
};

export type AnnouncementSettings = {
  enabled: boolean;
  notes: AnnouncementNote[];
};

export const DEFAULT_ANNOUNCEMENTS: AnnouncementSettings = {
  enabled: true,
  notes: [
    { id: "note-1", text: "New seasonal scents are here", href: "/shop?category=aromatherapy", icon: "sparkles", active: true },
    { id: "note-2", text: "Free shipping on orders over ₹999", href: "/shipping", icon: "truck", active: true },
    { id: "note-3", text: "Save 10% with code RITUAL10", href: "/shop", icon: "gift", active: true },
    { id: "note-4", text: "Body butters for everyday skin", href: "/shop?category=body-care", icon: "leaf", active: true },
    { id: "note-5", text: "Candles for the last hour of the day", href: "/shop?category=aromatherapy", icon: "flame", active: true },
  ],
};

function asString(value: unknown, fallback: string, max: number) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

function asHref(value: unknown, fallback: string) {
  const href = asString(value, fallback, 300);
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")) return href;
  return fallback;
}

function asIcon(value: unknown, fallback: AnnouncementIcon): AnnouncementIcon {
  return ANNOUNCEMENT_ICONS.includes(value as AnnouncementIcon) ? (value as AnnouncementIcon) : fallback;
}

function normalizeNote(input: unknown, index: number, fallback?: AnnouncementNote): AnnouncementNote | null {
  const base = fallback || DEFAULT_ANNOUNCEMENTS.notes[index % DEFAULT_ANNOUNCEMENTS.notes.length];
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const text = asString(raw.text, base?.text || "", 80);
  if (!text) return null;
  const id = asString(raw.id, base?.id || `note-${index + 1}`, 40).replace(/[^a-zA-Z0-9_-]/g, "") || `note-${index + 1}`;
  return {
    id,
    text,
    href: asHref(raw.href, base?.href || "/shop"),
    icon: asIcon(raw.icon, base?.icon || "sparkles"),
    active: typeof raw.active === "boolean" ? raw.active : base?.active ?? true,
  };
}

export function normalizeAnnouncements(input: unknown): AnnouncementSettings {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const list = Array.isArray(raw.notes) ? raw.notes : DEFAULT_ANNOUNCEMENTS.notes;
  const notes = list
    .slice(0, 8)
    .map((item, index) => normalizeNote(item, index, DEFAULT_ANNOUNCEMENTS.notes[index]))
    .filter((item): item is AnnouncementNote => Boolean(item));
  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_ANNOUNCEMENTS.enabled,
    notes: notes.length ? notes : DEFAULT_ANNOUNCEMENTS.notes,
  };
}

export function publicAnnouncements(settings: AnnouncementSettings) {
  if (!settings.enabled) return [] as AnnouncementNote[];
  return settings.notes.filter((note) => note.active && note.text.trim());
}
