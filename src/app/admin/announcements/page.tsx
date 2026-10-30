"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { AdminEditorSkeleton } from "@/components/admin/AdminSkeletons";
import { AnnouncementDraftPreview } from "@/components/admin/StorefrontPreviews";
import { csrfHeaders } from "@/lib/auth/browser";
import {
  ANNOUNCEMENT_ICONS,
  DEFAULT_ANNOUNCEMENTS,
  type AnnouncementNote,
  type AnnouncementSettings,
} from "@/lib/announcements/content";

function blankNote(index: number): AnnouncementNote {
  return {
    id: `note-${Date.now()}-${index}`,
    text: "",
    href: "/shop",
    icon: "sparkles",
    active: true,
  };
}

export default function AnnouncementsPage() {
  const [draft, setDraft] = useState<AnnouncementSettings>(DEFAULT_ANNOUNCEMENTS);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/announcements", { headers: csrfHeaders(false) })
      .then((response) => response.json())
      .then((body) => {
        if (body.announcements) setDraft(body.announcements as AnnouncementSettings);
      })
      .catch(() => setError("Announcements could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  function updateNote(index: number, patch: Partial<AnnouncementNote>) {
    setDraft((current) => ({
      ...current,
      notes: current.notes.map((note, i) => (i === index ? { ...note, ...patch } : note)),
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: csrfHeaders(),
        body: JSON.stringify({ announcements: draft }),
      });
      const body = await response.json();
      if (!response.ok || !body.announcements) {
        setError(body.error || "Could not save.");
        return;
      }
      setDraft(body.announcements);
      setMessage(body.message || "Saved.");
    } catch {
      setError("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminEditorSkeleton />;

  const activeNotes = draft.notes.filter((note) => note.active).length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Announcement"
        purpose="Short messages that rotate in the black bar at the top of the store (shipping notes, sale lines). Keep each line brief. Check the live preview before you save."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Bar</p>
          <p className="mt-2 font-medium">{draft.enabled ? "Visible" : "Hidden"}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Messages</p>
          <p className="mt-2 font-serif text-3xl">{draft.notes.length}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Active</p>
          <p className="mt-2 font-serif text-3xl">{activeNotes}</p>
        </div>
      </div>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] xl:items-start">
        <form onSubmit={save} className="space-y-4">
          <AdminPanel title="Visibility" hint="Show or hide the announcement bar site-wide" defaultOpen>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-[#faf7f2] px-4 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft.enabled}
                onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
              />
              <span>
                <span className="block font-medium">Show announcement bar</span>
                <span className="mt-0.5 block text-xs text-mute">When off, no messages rotate at the top of the store.</span>
              </span>
            </label>
          </AdminPanel>

          {draft.notes.map((note, index) => (
            <AdminPanel
              key={note.id}
              title={`Message ${index + 1}`}
              hint={note.text || "Empty message"}
              defaultOpen={index === 0}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={note.active}
                    onChange={(event) => updateNote(index, { active: event.target.checked })}
                  />
                  Active in rotation
                </label>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1 border border-red-200 bg-[#fdf4f2] px-3 text-xs text-red-700 transition hover:bg-[#faeae6] disabled:opacity-40"
                  onClick={() => setDraft((current) => ({ ...current, notes: current.notes.filter((_, i) => i !== index) }))}
                  disabled={draft.notes.length <= 1}
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
              <label className="block text-sm">
                Text
                <input
                  value={note.text}
                  onChange={(event) => updateNote(index, { text: event.target.value })}
                  maxLength={80}
                  className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
                  required={note.active}
                />
                <span className="mt-1 block text-xs text-mute">{note.text.length}/80</span>
              </label>
              <label className="block text-sm">
                Link
                <input
                  value={note.href}
                  onChange={(event) => updateNote(index, { href: event.target.value })}
                  className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
                  placeholder="/shop"
                />
              </label>
              <label className="block text-sm">
                Icon
                <select
                  value={note.icon}
                  onChange={(event) => updateNote(index, { icon: event.target.value as AnnouncementNote["icon"] })}
                  className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none"
                >
                  {ANNOUNCEMENT_ICONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </label>
            </AdminPanel>
          ))}

          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-2 border border-dashed border-line text-sm transition hover:bg-[#faf7f2] disabled:opacity-40"
            onClick={() => setDraft((current) => (
              current.notes.length >= 8 ? current : { ...current, notes: [...current.notes, blankNote(current.notes.length)] }
            ))}
            disabled={draft.notes.length >= 8}
          >
            <Plus size={16} />
            Add message
          </button>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-[#fdf4f2] px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}
          {message ? (
            <p role="status" className="rounded-xl border border-[#cfe0c8] bg-[#f3f8f1] px-4 py-3 text-sm text-[#3d5a3a]">{message}</p>
          ) : null}
          <button type="submit" disabled={saving} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper disabled:opacity-60">
            {saving ? "Saving…" : "Save announcement"}
          </button>
        </form>

        <div className="order-first xl:order-none xl:sticky xl:top-4">
          <AnnouncementDraftPreview settings={draft} />
        </div>
      </div>
    </div>
  );
}
