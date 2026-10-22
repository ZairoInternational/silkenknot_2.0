/**
 * MongoDB query builders for the product search API.
 *
 * Two paths:
 *
 *  1. Atlas Search  (ATLAS_SEARCH_ENABLED=1)
 *     Uses the $search aggregation stage with the "products_search_v1" index.
 *     Supports weighted field boosting, fuzzy matching (maxEdits: 1), and
 *     autocomplete on the product name.  Filters on active, category,
 *     bestseller, and type are pushed into the compound filter array for
 *     pre-filtering inside the search index.  Price-range and rating filters
 *     are applied in a subsequent $match stage because they are range
 *     predicates on numeric fields that are more cleanly expressed there.
 *
 *  2. Regex fallback  (ATLAS_SEARCH_ENABLED not set, or Atlas Search fails)
 *     Builds a regular MongoDB find/aggregate query.  Supports all the same
 *     filter parameters with case-insensitive regex for text matching.
 *     No fuzzy matching; dictionary corrections in corrections.ts compensate
 *     for the most common difficult typos.
 *
 * Both paths return results through the same aggregation interface so the
 * route handler does not need to know which engine was used.
 *
 * Sort specification
 * ------------------
 * Relevance sort is only meaningful for Atlas Search (uses the search score
 * meta field).  For the regex path, relevance falls back to "featured".
 * All other sorts are applied identically on both paths.
 */

import type { Document } from "mongodb";
import type { SearchParams, SortOption } from "./types";

export const ATLAS_SEARCH_INDEX = "products_search_v1";

// Fields returned to the client — excludes heavy arrays and private fields.
const PROJECT_FIELDS: Document = {
  _id: 0,
  id: 1,
  slug: 1,
  name: 1,
  categoryId: 1,
  type: 1,
  scent: 1,
  price: 1,
  compareAtPrice: 1,
  rating: 1,
  reviewCount: 1,
  shortDescription: 1,
  images: 1,
  variants: 1,
  featured: 1,
  bestseller: 1,
  newArrival: 1,
  active: 1,
  createdAt: 1,
  weightGrams: 1,
};

// ---------------------------------------------------------------------------
// Shared sort specification
// ---------------------------------------------------------------------------

export function buildSortSpec(sort: SortOption, atlasSearch: boolean): Document {
  switch (sort) {
    case "price-low":  return { price: 1, id: 1 };        // stable secondary
    case "price-high": return { price: -1, id: 1 };
    case "rating":     return { rating: -1, reviewCount: -1, id: 1 };
    case "newest":     return { newArrival: -1, createdAt: -1, id: 1 };
    case "relevance":
      // Relevance is meaningful only in Atlas Search; $meta handled separately.
      // For regex path, fall through to featured.
      if (atlasSearch) return { _score: -1, id: 1 };
      return { bestseller: -1, rating: -1, id: 1 };
    case "featured":
    default:
      return { bestseller: -1, rating: -1, id: 1 };
  }
}

// ---------------------------------------------------------------------------
// Atlas Search pipeline
// ---------------------------------------------------------------------------

/**
 * Builds a full aggregation pipeline using the Atlas Search $search stage.
 *
 * The pipeline:
 *   1. $search  — weighted text matching with fuzzy, compound filters.
 *   2. $match   — price range, rating, type (not expressible in search filter).
 *   3. $facet   — splits into { meta: [count], data: [sort + skip + limit + project] }.
 *
 * Returns `null` if the query is empty (caller should use buildRegexPipeline
 * for browse-mode requests without a search term).
 */
export function buildAtlasPipeline(
  params: SearchParams,
  skip: number,
): Document[] | null {
  const { q, category, minPrice, maxPrice, rating, bestseller, type, sort, limit } = params;

  if (!q) return null;

  // ── Compound must clause: active:true ─────────────────────────────────────
  const mustClauses: Document[] = [
    { equals: { path: "active", value: true } },
  ];

  // ── Compound filter clauses: categorical equality ─────────────────────────
  const filterClauses: Document[] = [];

  if (category && category !== "all") {
    filterClauses.push({ text: { query: category, path: "categoryId" } });
  }
  if (bestseller) {
    filterClauses.push({ equals: { path: "bestseller", value: true } });
  }
  if (type) {
    filterClauses.push({ text: { query: type, path: "type" } });
  }

  // ── Should (text matching with weighted fields) ────────────────────────────
  // Name receives the strongest boost (5× via autocomplete + 4× via full text).
  // Type/scent/categoryId: medium (2×).
  // shortDescription: low (1.5×).
  // description/ingredients: baseline (1×) — fuzzy still on.
  const shouldClauses: Document[] = [
    {
      autocomplete: {
        query: q,
        path: "name",
        score: { boost: { value: 5 } },
      },
    },
    {
      text: {
        query: q,
        path: "name",
        fuzzy: { maxEdits: 1, prefixLength: 2 },
        score: { boost: { value: 4 } },
      },
    },
    {
      text: {
        query: q,
        path: ["type", "scent", "categoryId"],
        fuzzy: { maxEdits: 1 },
        score: { boost: { value: 2 } },
      },
    },
    {
      text: {
        query: q,
        path: ["shortDescription"],
        fuzzy: { maxEdits: 1 },
        score: { boost: { value: 1.5 } },
      },
    },
    {
      text: {
        query: q,
        path: ["description", "ingredients"],
        fuzzy: { maxEdits: 1 },
      },
    },
  ];

  const searchStage: Document = {
    $search: {
      index: ATLAS_SEARCH_INDEX,
      compound: {
        must: mustClauses,
        ...(filterClauses.length ? { filter: filterClauses } : {}),
        should: shouldClauses,
        minimumShouldMatch: 1,
      },
    },
  };

  // ── Post-search $match for range predicates ───────────────────────────────
  const rangeMatch: Document = {};
  if (minPrice !== null) rangeMatch.price = { ...(rangeMatch.price as Document | undefined), $gte: minPrice };
  if (maxPrice !== null) rangeMatch.price = { ...(rangeMatch.price as Document | undefined), $lte: maxPrice };
  if (rating !== null) rangeMatch.rating = { $gte: rating };

  // ── Sort spec ─────────────────────────────────────────────────────────────
  const sortSpec = buildSortSpec(sort, true);

  // For relevance sort we need the score in the data branch.
  const isRelevanceSort = sort === "relevance";

  const dataStages: Document[] = [];
  if (isRelevanceSort) {
    dataStages.push({ $addFields: { _score: { $meta: "searchScore" } } });
  }
  // Inclusion-only projection. Do not mix `_score: 0` here — Mongo rejects
  // exclusions inside an inclusion $project. Omitting `_score` drops it.
  dataStages.push(
    { $sort: sortSpec },
    { $skip: skip },
    { $limit: limit },
    { $project: PROJECT_FIELDS },
  );

  const pipeline: Document[] = [searchStage];
  if (Object.keys(rangeMatch).length) pipeline.push({ $match: rangeMatch });
  pipeline.push({
    $facet: {
      meta: [{ $count: "total" }],
      data: dataStages,
    },
  });

  return pipeline;
}

// ---------------------------------------------------------------------------
// Regex fallback pipeline (no Atlas Search required)
// ---------------------------------------------------------------------------

/**
 * Builds an aggregation pipeline using standard MongoDB operators.
 * Used when ATLAS_SEARCH_ENABLED is not set, or when Atlas Search fails.
 *
 * Text matching uses case-insensitive regex across:
 *   name (strongest), type, scent, shortDescription, description,
 *   ingredients, categoryId.
 *
 * No fuzzy matching — dictionary corrections (corrections.ts) handle the most
 * common difficult typos before this is called.
 */
export function buildRegexPipeline(
  params: SearchParams,
  skip: number,
): Document[] {
  const { q, category, minPrice, maxPrice, rating, bestseller, type, sort, limit } = params;

  const match: Document = { active: true };

  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    match.$or = [
      { name: rx },
      { type: rx },
      { scent: rx },
      { shortDescription: rx },
      { description: rx },
      { ingredients: rx },
      { categoryId: rx },
    ];
  }

  if (category && category !== "all") match.categoryId = category;
  if (bestseller) match.bestseller = true;
  if (type) match.type = type;
  if (minPrice !== null || maxPrice !== null) {
    match.price = {};
    if (minPrice !== null) (match.price as Document).$gte = minPrice;
    if (maxPrice !== null) (match.price as Document).$lte = maxPrice;
  }
  if (rating !== null) match.rating = { $gte: rating };

  const sortSpec = buildSortSpec(sort, false);

  return [
    { $match: match },
    {
      $facet: {
        meta: [{ $count: "total" }],
        data: [
          { $sort: sortSpec },
          { $skip: skip },
          { $limit: limit },
          { $project: PROJECT_FIELDS },
        ],
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Result extraction helper
// ---------------------------------------------------------------------------

export type FacetResult = { meta: { total: number }[]; data: Document[] };

export function extractFacetResult(raw: Document[]): FacetResult {
  const facet = (raw[0] ?? {}) as FacetResult;
  return {
    meta: facet.meta ?? [],
    data: facet.data ?? [],
  };
}
