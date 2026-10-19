/**
 * GET /api/products/search
 *
 * Shared product search API consumed by both SearchOverlay (header autocomplete)
 * and ShopCatalog (full shop listing with filters, sort, and pagination).
 *
 * Parameters (all optional, all validated and bounded server-side):
 *   q          – search text (max 120 chars)
 *   category   – categoryId string, e.g. "body-care"
 *   min        – minimum price (integer ≥ 0)
 *   max        – maximum price (integer ≥ 0)
 *   rating     – minimum rating (3 or 4)
 *   bestseller – "1" to filter bestsellers
 *   type       – product type string
 *   sort       – "featured" | "newest" | "rating" | "price-low" | "price-high" | "relevance"
 *   page       – page number (≥ 1)
 *   limit      – page size (1 – 48, default 8)
 *
 * Engine selection
 * ----------------
 * When ATLAS_SEARCH_ENABLED=1, the handler runs a MongoDB Atlas $search
 * aggregation (index: products_search_v1) with fuzzy matching and weighted
 * field boosting.  If the Atlas pipeline throws (e.g. index not yet READY or
 * wrong tier), the handler falls back to the regex pipeline automatically and
 * logs a server-side warning.  This means the endpoint always returns results
 * — but without fuzzy matching when Atlas Search is unavailable.
 *
 * When ATLAS_SEARCH_ENABLED is not set, the regex pipeline is used directly.
 * Dictionary corrections in corrections.ts cover the most common difficult
 * typos in both paths.
 *
 * Empty-query behaviour
 * ---------------------
 * When q is absent or blank, Atlas Search is not used.  The handler runs a
 * regular find/aggregate so that browse-mode (category, sort, filters only)
 * works identically regardless of whether Atlas Search is configured.
 *
 * Security
 * --------
 * - All parameters are validated and allowlisted.
 * - Raw MongoDB filters/pipelines from the client are never accepted.
 * - Only `active: true` products are returned.
 * - `_id`, `passwordHash`, reviews, faqs, howToUse, benefits, description
 *   are excluded from the response projection.
 * - No database errors or credentials leak in the response body.
 */

import { databaseConfigured, getDb } from "@/lib/mongo";
import { normalizeQuery } from "@/lib/search/corrections";
import {
  buildAtlasPipeline,
  buildRegexPipeline,
  extractFacetResult,
} from "@/lib/search/query";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_QUERY_LENGTH,
  VALID_SORTS,
  type SearchParams,
  type SearchResponse,
  type SortOption,
} from "@/lib/search/types";

const VALID_RATINGS = new Set([3, 4]);

// ---------------------------------------------------------------------------
// Parameter validation
// ---------------------------------------------------------------------------

function parseParams(url: URL): SearchParams | Response {
  const raw = url.searchParams;

  // ── q ─────────────────────────────────────────────────────────────────────
  const rawQ = (raw.get("q") ?? "").trim();
  if (rawQ.length > MAX_QUERY_LENGTH) {
    return json400("Query too long (max 120 characters).");
  }

  // ── category ──────────────────────────────────────────────────────────────
  const category = (raw.get("category") ?? "").trim();

  // ── price ─────────────────────────────────────────────────────────────────
  const rawMin = raw.get("min");
  const rawMax = raw.get("max");
  const minPrice = rawMin !== null ? Number(rawMin) : null;
  const maxPrice = rawMax !== null ? Number(rawMax) : null;
  if (minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) {
    return json400("Invalid min price.");
  }
  if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
    return json400("Invalid max price.");
  }

  // ── rating ────────────────────────────────────────────────────────────────
  const rawRating = raw.get("rating");
  const rating = rawRating !== null ? Number(rawRating) : null;
  if (rating !== null && !VALID_RATINGS.has(rating)) {
    // Silently clamp to null so existing URLs with rating=0 don't error.
    // Accept only 3, 4.
  }
  const validRating = rating !== null && VALID_RATINGS.has(rating) ? rating : null;

  // ── bestseller ────────────────────────────────────────────────────────────
  const bestseller = raw.get("bestseller") === "1";

  // ── type ──────────────────────────────────────────────────────────────────
  // URL carries comma-separated types; we take the first one for now.
  // Multi-type OR queries can be added when needed.
  const typeParam = (raw.get("type") ?? "").trim();

  // ── sort ──────────────────────────────────────────────────────────────────
  const rawSort = raw.get("sort") ?? "featured";
  // Accept legacy aliases used by the existing ShopCatalog URL scheme.
  const sortAliases: Record<string, SortOption> = {
    "price-asc": "price-low",
    "price-desc": "price-high",
  };
  const sort: SortOption = VALID_SORTS.includes(rawSort as SortOption)
    ? (rawSort as SortOption)
    : (sortAliases[rawSort] ?? "featured");

  // ── pagination ────────────────────────────────────────────────────────────
  const rawPage = raw.get("page");
  const page = Math.max(1, Number.isFinite(Number(rawPage)) ? Number(rawPage) : 1);

  const rawLimit = raw.get("limit");
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(Number(rawLimit)) ? Number(rawLimit) : DEFAULT_PAGE_SIZE),
  );

  return {
    q: rawQ,
    category,
    minPrice,
    maxPrice,
    rating: validRating,
    bestseller,
    type: typeParam,
    sort,
    page,
    limit,
  };
}

function json400(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

const atlasEnabled = process.env.ATLAS_SEARCH_ENABLED === "1";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseParams(url);

  // If parseParams returned an error Response, send it immediately.
  if (params instanceof Response) return params;

  const { q, page, limit } = params;
  const skip = (page - 1) * limit;

  // ── Apply query normalization and corrections ─────────────────────────────
  const { normalized, correctedQuery } = normalizeQuery(q);
  const searchParams: SearchParams = { ...params, q: normalized };

  // ── Database required ─────────────────────────────────────────────────────
  if (!databaseConfigured()) {
    // Development without MongoDB: return empty results (not seed data).
    // Seed data must not masquerade as live inventory.
    const empty: SearchResponse = {
      items: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 0,
      query: normalized,
      correctedQuery,
    };
    return Response.json(empty);
  }

  try {
    const db = await getDb();
    const collection = db.collection("products");

    // ── Choose pipeline ───────────────────────────────────────────────────
    let items: Record<string, unknown>[] = [];
    let total = 0;

    if (normalized && atlasEnabled) {
      // Atlas Search path
      const atlasPipeline = buildAtlasPipeline(searchParams, skip);
      if (atlasPipeline) {
        try {
          const raw = await collection.aggregate(atlasPipeline).toArray();
          const facet = extractFacetResult(raw);
          total = facet.meta[0]?.total ?? 0;
          items = facet.data as Record<string, unknown>[];
        } catch (atlasErr) {
          // Atlas Search unavailable (index not READY, wrong tier, etc.)
          // Fall through to regex pipeline.
          console.warn(
            "[search] Atlas Search failed, falling back to regex:",
            atlasErr instanceof Error ? atlasErr.message : atlasErr,
          );
          const fallback = buildRegexPipeline(searchParams, skip);
          const raw = await collection.aggregate(fallback).toArray();
          const facet = extractFacetResult(raw);
          total = facet.meta[0]?.total ?? 0;
          items = facet.data as Record<string, unknown>[];
        }
      }
    } else {
      // Regex / browse-mode path
      const pipeline = buildRegexPipeline(searchParams, skip);
      const raw = await collection.aggregate(pipeline).toArray();
      const facet = extractFacetResult(raw);
      total = facet.meta[0]?.total ?? 0;
      items = facet.data as Record<string, unknown>[];
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);

    const response: SearchResponse = {
      items: items as SearchResponse["items"],
      total,
      page: safePage,
      limit,
      totalPages,
      query: normalized,
      correctedQuery,
    };

    return Response.json(response, {
      headers: {
        // Allow very short-lived caching at the CDN edge — 2 seconds.
        // This prevents thundering-herd on rapid filter changes but keeps
        // inventory accurate.  Remove for real-time stock requirements.
        "Cache-Control": "public, s-maxage=2, stale-while-revalidate=8",
      },
    });
  } catch (err) {
    console.error("[search] Unhandled error:", err);
    return Response.json({ error: "Search unavailable. Please try again." }, { status: 503 });
  }
}
