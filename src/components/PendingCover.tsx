"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function PendingCover({ message, underModal = false }: { message: string; underModal?: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pending-cover" style={{ zIndex: underModal ? 40 : 80 }} role="alertdialog" aria-modal="true" aria-busy="true" aria-live="assertive" aria-label={message}>
      <div className="pending-card">
        <span className="pending-spin" aria-hidden="true" />
        <p>{message}</p>
      </div>
    </div>,
    document.body,
  );
}
