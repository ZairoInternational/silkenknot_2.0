/**
 * Sanitize search terms before analytics.
 * Rejects empty/short input and anything that looks like personal contact data.
 */

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
/** Indian mobiles with optional +91 and common separators. */
const PHONE = /(?:\+?91[\s-]*)?[6-9](?:[\s-]?\d){9}\b/;
const LONG_DIGITS = /\d(?:[\s-]?\d){7,}/;
const OTP_LIKE = /\b\d{4,8}\b/;

export const MAX_SEARCH_TERM_LENGTH = 80;
export const MIN_SEARCH_TERM_LENGTH = 2;

export function sanitizeSearchTerm(raw: string): string | null {
  const term = raw.replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH_TERM_LENGTH);
  if (term.length < MIN_SEARCH_TERM_LENGTH) return null;
  if (EMAIL.test(term) || PHONE.test(term) || LONG_DIGITS.test(term)) return null;
  // Block bare numeric codes that look like OTPs when the whole query is digits.
  if (/^\d+$/.test(term) && OTP_LIKE.test(term)) return null;
  return term;
}
