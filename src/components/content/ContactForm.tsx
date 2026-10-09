"use client";

import { useState } from "react";
import { Editorial } from "@/components/content/Pages";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  return (
    <Editorial eyebrow="Help" title="Contact" lede="Write to the studio. We read everything.">
      {sent ? (
        <p role="status">Received. In this preview the note stays on your device, and we still thank you for the gesture.</p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
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
          <button type="submit" className="h-12 bg-ink px-6 text-[11px] uppercase tracking-[0.18em] text-paper">Send</button>
        </form>
      )}
    </Editorial>
  );
}
