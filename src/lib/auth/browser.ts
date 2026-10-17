export function csrfHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (typeof document === "undefined") return headers;
  const row = document.cookie.split("; ").find((part) => part.startsWith("silkknot_csrf="));
  if (row) headers["x-silkknot-csrf"] = decodeURIComponent(row.slice("silkknot_csrf=".length));
  return headers;
}

export function needsName(user: { name?: string; nameSetAt?: string | null } | null | undefined) {
  if (!user) return false;
  return user.nameSetAt === null || !user.name?.trim();
}

export function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return "/account";
  return value;
}

export function afterAuthPath(value: string | null) {
  if (!value) return "/shop";
  const path = safeNext(value);
  if (path === "/account" || path.startsWith("/account/login")) return "/shop";
  return path;
}

export function profileCompletion(user: {
  name?: string;
  nameSetAt?: string | null;
  phoneVerifiedAt?: string | null;
  emailVerifiedAt?: string | null;
  addresses?: unknown[];
}) {
  const steps = [
    { id: "name", label: "Name", done: Boolean(user.name?.trim()) && user.nameSetAt !== null },
    { id: "phone", label: "Phone", done: Boolean(user.phoneVerifiedAt) },
    { id: "email", label: "Email", done: Boolean(user.emailVerifiedAt) },
    { id: "address", label: "Address", done: (user.addresses?.length ?? 0) > 0 },
  ];
  const finished = steps.filter((step) => step.done).length;
  return {
    steps,
    percent: Math.round((finished / steps.length) * 100),
    next: steps.find((step) => !step.done) ?? null,
  };
}
