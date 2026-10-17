import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

const COUNTRIES = new Set<CountryCode>(["IN", "US", "GB", "AE", "SG", "AU", "CA", "DE", "FR", "NL"]);

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  return email;
}

export function normalizePhone(value: string, country: string) {
  const region = COUNTRIES.has(country as CountryCode) ? (country as CountryCode) : "IN";
  const parsed = parsePhoneNumberFromString(value.trim(), region);
  if (!parsed?.isValid()) return null;
  return parsed.number;
}

export function maskDestination(channel: "email" | "sms", destination: string) {
  if (channel === "email") {
    const [name, domain] = destination.split("@");
    const visible = name.slice(0, 1);
    return `${visible}${"•".repeat(Math.max(1, name.length - 1))}@${domain}`;
  }
  const tail = destination.slice(-4);
  return `${destination.slice(0, 3)} •••• ${tail}`;
}
