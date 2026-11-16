"use client";

import type { SupportAction } from "@/lib/support/types";

type Props = {
  action: SupportAction;
  disabled?: boolean;
  onAction: (action: SupportAction) => void;
};

export function QuickQuestion({ action, disabled, onAction }: Props) {
  const className =
    "max-w-full rounded-full border border-[#e8e8e6] bg-[#ffffff] px-3.5 py-2 text-left text-sm text-[#2c2926] transition-colors hover:border-[#61A2AF] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#61A2AF] disabled:cursor-not-allowed disabled:opacity-50";

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
