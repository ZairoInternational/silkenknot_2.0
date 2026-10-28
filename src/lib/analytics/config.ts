/** Public GTM container id only. Never put Measurement Protocol or API secrets here. */

let configuredId: string | null | undefined;

export function parseGtmId(raw: string | null | undefined): string | null {
  const value = raw?.trim() || "";
  if (!/^GTM-[A-Z0-9]+$/i.test(value)) return null;
  return value.toUpperCase();
}

/** Prefer the id passed from the root layout so the client never depends on env inlining alone. */
export function setConfiguredGtmId(id: string | null) {
  configuredId = id;
}

export function getGtmId(): string | null {
  if (configuredId !== undefined) return configuredId;
  return parseGtmId(process.env.NEXT_PUBLIC_GTM_ID);
}

export function isAnalyticsConfigured() {
  return Boolean(getGtmId());
}
