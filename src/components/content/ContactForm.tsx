"use client";

import { useState } from "react";
import { Editorial } from "@/components/content/Pages";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Editorial eyebrow="Help" title="Contact" lede="Write to the studio. We read everything.">
      {sent ? (
        <p role="status">Received. We’ll reply to the email you entered.</p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setBusy(true);
            setError("");
            const response = await fetch("/api/contact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: form.get("name"),
                email: form.get("email"),
                message: form.get("message"),
              }),
            });
            const data = await response.json().catch(() => null) as { error?: string } | null;
            setBusy(false);
            if (!response.ok) {
              setError(data?.error || "We couldn’t send that just now.");
              return;
            }
            setSent(true);
          }}
        >
          <label className="block text-sm">
            Name
            <input required name="name" className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none" />
          </label>
          <label className="block text-sm">
            Email
            <input required type="email" name="email" className="mt-2 h-11 w-full border-b border-line bg-transparent outline-none" />
          </label>
          <label className="block text-sm">
            Message
            <textarea required name="message" className="mt-2 min-h-28 w-full border-b border-line bg-transparent outline-none" />
          </label>
          {error ? <p role="alert" className="text-sm text-[#8d3b32]">{error}</p> : null}
          <button type="submit" disabled={busy} className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper disabled:opacity-60">{busy ? "Sending…" : "Send"}</button>
        </form>
      )}
    </Editorial>
  );
}
