/** Structured payment logs. Callers must pass ids and states only, never secrets or addresses. */
export function paymentLog(event: string, fields: Record<string, string | number | boolean | null> = {}) {
  console.info(JSON.stringify({ scope: "payment", event, ...fields }));
}
