"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/announcements", { headers: csrfHeaders(false) })
      .then((response) => response.json())
      .then((body) => {
        if (body.announcements) setDraft(body.announcements as AnnouncementSettings);
      })
      .catch(() => setMessage("Announcements could not be loaded."))
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
    try {
      const response = await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: csrfHeaders(),
        body: JSON.stringify({ announcements: draft }),
      });
      const body = await response.json();
      if (!response.ok || !body.announcements) {
        setMessage(body.error || "Could not save.");
        return;
      }
      setDraft(body.announcements);
      setMessage(body.message || "Saved.");
    } catch {
      setMessage("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AdminEditorSkeleton />;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Top banner"
        purpose="Short messages that rotate in the black bar at the top of the store (shipping notes, sale lines). Keep each line brief. Check the live preview before you save."
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] xl:items-start">
        <form onSubmit={save} className="space-y-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
            />
            Show announcement bar
          </label>

          <ul className="space-y-4">
            {draft.notes.map((note, index) => (
              <li key={note.id} className="border-b border-line pb-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">Message {index + 1}</p>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={note.active}
                        onChange={(event) => updateNote(index, { active: event.target.checked })}
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      className="text-sm text-mute underline"
                      onClick={() => setDraft((current) => ({ ...current, notes: current.notes.filter((_, i) => i !== index) }))}
                      disabled={draft.notes.length <= 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <label className="block text-sm">
                  Text
                  <input
                    value={note.text}
                    onChange={(event) => updateNote(index, { text: event.target.value })}
                    maxLength={80}
                    className="mt-1 h-11 w-full border-b border-line bg-transparent"
                    required={note.active}
                  />
                </label>
                <label className="mt-3 block text-sm">
                  Link
                  <input
                    value={note.href}
                    onChange={(event) => updateNote(index, { href: event.target.value })}
                    className="mt-1 h-11 w-full border-b border-line bg-transparent"
                    placeholder="/shop"
                  />
                </label>
                <label className="mt-3 block text-sm">
                  Icon
                  <select
                    value={note.icon}
                    onChange={(event) => updateNote(index, { icon: event.target.value as AnnouncementNote["icon"] })}
                    className="mt-1 h-11 w-full border-b border-line bg-transparent"
                  >
                    {ANNOUNCEMENT_ICONS.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="text-sm underline"
            onClick={() => setDraft((current) => (
              current.notes.length >= 8 ? current : { ...current, notes: [...current.notes, blankNote(current.notes.length)] }
            ))}
            disabled={draft.notes.length >= 8}
          >
            Add message
          </button>

          {message ? <p className="text-sm">{message}</p> : null}
          <button type="submit" disabled={saving} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper">
            {saving ? "Saving…" : "Save announcements"}
          </button>
        </form>

        <div className="order-first xl:order-none xl:sticky xl:top-4">
          <AnnouncementDraftPreview settings={draft} />
        </div>
      </div>
    </div>
  );
}
