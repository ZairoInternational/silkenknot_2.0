type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | ClassValue[];

/**
 * Join class names, skipping falsy values.
 * Usage: cn(base, active && "text-ink", className)
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input && input !== 0) continue;
    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
      continue;
    }
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    }
  }

  return out.join(" ");
}
