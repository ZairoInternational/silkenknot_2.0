"use client";

import type { SupportAction } from "@/lib/support/types";

type Props = {
  action: SupportAction;
  disabled?: boolean;
  onAction: (action: SupportAction) => void;
};

export function QuickQuestion({ action, disabled, onAction }: Props) {
  const className =
    "max-w-full rounded-full border border-[#e3dbd1] bg-[#fffcf8] px-3.5 py-2 text-left text-sm text-[#2c2926] transition-colors hover:border-[#CBAC7C] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350] disabled:cursor-not-allowed disabled:opacity-50";

  if (action.kind === "link" && action.href) {
    return (
      <a
        href={action.href}
        className={className}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          if (action.command === "login") onAction(action);
        }}
      >
        {action.label}
      </a>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled} onClick={() => onAction(action)}>
      {action.label}
    </button>
  );
}
