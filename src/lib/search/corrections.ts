/**
 * Query normalization and word-level correction dictionary.
 *
 * Purpose
 * -------
 * Atlas Search fuzzy matching (maxEdits: 1) handles ordinary single-character
 * typos reliably, e.g. "boddy" → "body". However, heavily-transposed words
 * such as "bgdy" require an explicit correction because the edit distance
 * (> 1 for some orderings) can exceed the fuzzy budget, and the token after
 * stemming does not reliably collapse to the correct form.
 *
 * This module:
 *  1. Normalises the raw query (trim, lowercase, Unicode NFC, strip
 *     punctuation, collapse whitespace).
 *  2. Corrects individual words using a small, centrally-maintained
 *     dictionary — no per-product entries needed.
 *  3. Returns both the corrected query (sent to the search engine) and a
 *     `correctedQuery` string suitable for a "Did you mean …?" UI hint.
 *
 * Extending the dictionary
 * ------------------------
 * Add an entry to WORD_CORRECTIONS below.  Keys must be lowercase.  Values
 * are the intended word.  Keep entries specific enough that they cannot
 * plausibly change user intent.
 *
 * Replacement policy
 * ------------------
 * Corrections are applied word-by-word, not to the full query at once.
 * Ambiguous short tokens (e.g. "ol") that could mean many things are NOT
 * corrected here; rely on fuzzy matching instead.
 *
 * Thread safety
 * -------------
 * All exports are pure functions; the dictionary is a frozen constant.
 */

// ---------------------------------------------------------------------------
// Correction dictionary
// ---------------------------------------------------------------------------

/**
 * Maps known difficult typos (lowercase) to their corrected word.
 *
 * Criteria for inclusion:
 *  - Levenshtein distance > 1 so Atlas fuzzy (maxEdits: 1) won't catch it, OR
 *  - Confirmed to produce zero results in Atlas fuzzy searches, OR
 *  - High observed frequency in real query logs.
 *
 * Do NOT add entries that could be mistaken for legitimate different words
 * (e.g. "bar" → "jar" — "bar" might be intentional).
 */
export const WORD_CORRECTIONS: Readonly<Record<string, string>> = Object.freeze({
  // ── body ──────────────────────────────────────────────────────────────────
  bgdy: "body",   // transposed consonants — distance 2 from "body"
  bdy: "body",    // missing vowel
  bdoy: "body",
  boody: "body",
  // ── butter ────────────────────────────────────────────────────────────────
  bttr: "butter",
  buttr: "butter",
  buter: "butter",
  butr: "butter",
  buuter: "butter",
  // ── scrub ─────────────────────────────────────────────────────────────────
  scrb: "scrub",
  scurb: "scrub",   // vowel transposition
  scub: "scrub",
  srub: "scrub",
  // ── bath ──────────────────────────────────────────────────────────────────
  bth: "bath",
  baht: "bath",    // extra letter
  // ── salt ──────────────────────────────────────────────────────────────────
  slt: "salt",
  // ── candle ────────────────────────────────────────────────────────────────
  cndl: "candle",
  candl: "candle",
  candel: "candle",
  canel: "candle",
  // ── soap ──────────────────────────────────────────────────────────────────
  sosp: "soap",
  saop: "soap",
  soep: "soap",
  // ── sugar ─────────────────────────────────────────────────────────────────
  sugr: "sugar",
  suggar: "sugar",
  suger: "sugar",
  sugger: "sugar",
  // ── milk ──────────────────────────────────────────────────────────────────
  mlk: "milk",
  // ── skin ──────────────────────────────────────────────────────────────────
  skn: "skin",
  // ── scent ─────────────────────────────────────────────────────────────────
  snt: "scent",
  scnt: "scent",
  // ── aroma ─────────────────────────────────────────────────────────────────
  arma: "aroma",
  aromma: "aroma",
  // ── therapy ───────────────────────────────────────────────────────────────
  therpy: "therapy",
  therap: "therapy",
  // ── moisturizer ───────────────────────────────────────────────────────────
  moistr: "moisturizer",
  moisturiser: "moisturizer",  // British spelling → American
  // ── lotion ────────────────────────────────────────────────────────────────
  lotn: "lotion",
  // ── cream ─────────────────────────────────────────────────────────────────
  crem: "cream",
  // ── honey ─────────────────────────────────────────────────────────────────
  hny: "honey",
  // ── lavender ──────────────────────────────────────────────────────────────
  lavndr: "lavender",
  lavender: "lavender",  // already correct, but normalisation is idempotent
  // ── sandalwood ────────────────────────────────────────────────────────────
  sandlwd: "sandalwood",
  // ── coconut ───────────────────────────────────────────────────────────────
  ccnut: "coconut",
  cocnut: "coconut",
  // ── fragrance ─────────────────────────────────────────────────────────────
  fragrnc: "fragrance",
  fragance: "fragrance",
  // ── mineral ───────────────────────────────────────────────────────────────
  minrl: "mineral",
  mienral: "mineral",
});

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

export type CorrectionResult = {
  /** Normalised (and possibly corrected) query to send to the search engine. */
  normalized: string;
  /**
   * Human-readable corrected query when at least one word was changed.
   * Null when the original query needed no correction.
   */
  correctedQuery: string | null;
};

/**
 * Normalises a raw search query and applies word-level corrections.
 *
 * Steps:
 *  1. Trim and lowercase.
 *  2. Unicode NFC normalisation (handles accented characters).
 *  3. Replace any character that is not a letter, digit, or space with a
 *     space (removes punctuation safely).
 *  4. Collapse runs of whitespace to a single space.
 *  5. Apply word-level dictionary corrections.
 *
 * The function is pure and side-effect-free.
 */
export function normalizeQuery(raw: string): CorrectionResult {
  const trimmed = raw.trim().toLowerCase().normalize("NFC");

  // Replace punctuation / special chars with spaces, then collapse whitespace.
  const cleaned = trimmed
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return { normalized: "", correctedQuery: null };

  const words = cleaned.split(" ");
  let anyCorrected = false;

  const correctedWords = words.map((word) => {
    const fix = WORD_CORRECTIONS[word];
    if (fix !== undefined && fix !== word) {
      anyCorrected = true;
      return fix;
    }
    return word;
  });

  const normalized = correctedWords.join(" ");
  return {
    normalized,
    correctedQuery: anyCorrected ? normalized : null,
  };
}
