/** Safe browser access for app code and Node unit tests that mock globalThis.window. */
export function browserWindow(): Window | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as typeof globalThis & { window?: Window }).window;
}

export function isBrowser() {
  return Boolean(browserWindow());
}
