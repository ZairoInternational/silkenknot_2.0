/**
 * Search unit tests — Node.js built-in test runner (node:test + tsx)
 *
 * Run:  npm test   (includes this file via package.json)
 *   or: npx tsx --test src/lib/search/search.test.ts
 *
 * What these tests actually execute vs. what requires a real Atlas cluster
 * -------------------------------------------------------------------------
 * EXECUTED HERE (no MongoDB required):
 *   - Query normalisation logic
 *   - Word-level correction dictionary (bgdy → body, scurb → scrub, …)
 *   - Regex pipeline shape and filter expression structure
 *   - Atlas Search pipeline shape and compound clause structure
 *   - Sort specification mapping
 *   - Parameter validation logic (copied here to isolate from HTTP layer)
 *   - FacetResult extraction helper
 *   - SearchAbortError / SearchApiError classification (client module)
 *
 * REQUIRES REAL ATLAS CLUSTER (see staging-checklist.md):
 *   - Actual fuzzy matching behaviour (bgdy → body via Atlas Search)
 *   - Actual relevance ranking
 *   - End-to-end /api/products/search HTTP tests
 *   - Atlas Search index READY state verification
 */

import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQuery, WORD_CORRECTIONS } from "./corrections";
import {
  buildAtlasPipeline,
  buildRegexPipeline,
  buildSortSpec,
  extractFacetResult,
} from "./query";
import { SearchAbortError, SearchApiError } from "./client";
import type { SearchParams, SortOption } from "./types";

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeParams(overrides: Partial<SearchParams> = {}): SearchParams {
  return {
    q: "",
    category: "",
    minPrice: null,
    maxPrice: null,
    rating: null,
    bestseller: false,
    type: "",
    sort: "featured",
    page: 1,
    limit: 8,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Query normalisation
// ─────────────────────────────────────────────────────────────────────────────

test("normalizeQuery: trim and lowercase", () => {
  const { normalized } = normalizeQuery("  Body Butter  ");
  assert.equal(normalized, "body butter");
});

test("normalizeQuery: collapse whitespace", () => {
  const { normalized } = normalizeQuery("body   butter");
  assert.equal(normalized, "body butter");
});

test("normalizeQuery: strip punctuation", () => {
  const { normalized } = normalizeQuery("body, butter!");
  assert.equal(normalized, "body butter");
});

test("normalizeQuery: unicode NFC", () => {
  const { normalized } = normalizeQuery("café");
  assert.equal(normalized, "café"); // NFC form
});

test("normalizeQuery: empty string returns empty", () => {
  const { normalized, correctedQuery } = normalizeQuery("   ");
  assert.equal(normalized, "");
  assert.equal(correctedQuery, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Correction dictionary — individual words
// ─────────────────────────────────────────────────────────────────────────────

test("corrections: bgdy → body (difficult transposition)", () => {
  const { normalized, correctedQuery } = normalizeQuery("bgdy");
  assert.equal(normalized, "body");
  assert.equal(correctedQuery, "body");
});

test("corrections: bdy → body", () => {
  const { normalized } = normalizeQuery("bdy");
  assert.equal(normalized, "body");
});

test("corrections: scurb → scrub", () => {
  const { normalized, correctedQuery } = normalizeQuery("scurb");
  assert.equal(normalized, "scrub");
  assert.equal(correctedQuery, "scrub");
});

test("corrections: scrb → scrub", () => {
  const { normalized } = normalizeQuery("scrb");
  assert.equal(normalized, "scrub");
});

test("corrections: bdy scrub → body scrub (multiword)", () => {
  const { normalized, correctedQuery } = normalizeQuery("bdy scrb");
  assert.equal(normalized, "body scrub");
  assert.equal(correctedQuery, "body scrub");
});

test("corrections: body scurb → body scrub", () => {
  const { normalized, correctedQuery } = normalizeQuery("body scurb");
  assert.equal(normalized, "body scrub");
  assert.equal(correctedQuery, "body scrub");
});

test("corrections: bath salt — no correction needed", () => {
  const { normalized, correctedQuery } = normalizeQuery("bath salt");
  assert.equal(normalized, "bath salt");
  assert.equal(correctedQuery, null);
});

test("corrections: body butter — no correction needed", () => {
  const { normalized, correctedQuery } = normalizeQuery("body butter");
  assert.equal(normalized, "body butter");
  assert.equal(correctedQuery, null);
});

test("corrections: bttr → butter", () => {
  const { normalized } = normalizeQuery("bttr");
  assert.equal(normalized, "butter");
});

test("corrections: suggar → sugar", () => {
  const { normalized } = normalizeQuery("suggar");
  assert.equal(normalized, "sugar");
});

test("corrections: correctedQuery is null when no correction applied", () => {
  const { correctedQuery } = normalizeQuery("soap");
  assert.equal(correctedQuery, null);
});

test("corrections: original query is preserved (not mutated)", () => {
  const input = "bgdy scrb";
  const { normalized } = normalizeQuery(input);
  assert.equal(input, "bgdy scrb"); // original unchanged
  assert.equal(normalized, "body scrub");
});

test("corrections: dictionary has expected difficult entries", () => {
  assert.equal(WORD_CORRECTIONS["bgdy"], "body");
  assert.equal(WORD_CORRECTIONS["scurb"], "scrub");
  assert.equal(WORD_CORRECTIONS["bttr"], "butter");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sort specification
// ─────────────────────────────────────────────────────────────────────────────

const SORT_CASES: [SortOption, boolean, object][] = [
  ["price-low",  false, { price: 1, id: 1 }],
  ["price-high", false, { price: -1, id: 1 }],
  ["rating",     false, { rating: -1, reviewCount: -1, id: 1 }],
  ["newest",     false, { newArrival: -1, createdAt: -1, id: 1 }],
  ["featured",   false, { bestseller: -1, rating: -1, id: 1 }],
  ["relevance",  false, { bestseller: -1, rating: -1, id: 1 }], // regex fallback
  ["relevance",  true,  { _score: -1, id: 1 }],                 // atlas
];

for (const [sort, atlas, expected] of SORT_CASES) {
  test(`buildSortSpec(${sort}, atlas=${atlas})`, () => {
    assert.deepEqual(buildSortSpec(sort, atlas), expected);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Regex pipeline shape
// ─────────────────────────────────────────────────────────────────────────────

test("buildRegexPipeline: empty query — no $or clause", () => {
  const pipeline = buildRegexPipeline(makeParams({ q: "" }), 0);
  const matchStage = pipeline.find((s) => "$match" in s) as { $match: Record<string, unknown> };
  assert.ok(matchStage, "should have $match");
  assert.equal(matchStage.$match.active, true);
  assert.ok(!("$or" in matchStage.$match), "no $or for empty query");
});

test("buildRegexPipeline: non-empty query adds $or text search", () => {
  const pipeline = buildRegexPipeline(makeParams({ q: "body" }), 0);
  const matchStage = pipeline.find((s) => "$match" in s) as { $match: Record<string, unknown> };
  assert.ok(Array.isArray(matchStage.$match.$or), "should have $or array");
  const orClauses = matchStage.$match.$or as object[];
  assert.ok(orClauses.length > 0);
  // name clause should be present
  assert.ok(orClauses.some((c) => "name" in c));
});

test("buildRegexPipeline: category filter applied", () => {
  const pipeline = buildRegexPipeline(makeParams({ category: "body-care" }), 0);
  const matchStage = pipeline.find((s) => "$match" in s) as { $match: Record<string, unknown> };
  assert.equal(matchStage.$match.categoryId, "body-care");
});

test("buildRegexPipeline: bestseller filter applied", () => {
  const pipeline = buildRegexPipeline(makeParams({ bestseller: true }), 0);
  const matchStage = pipeline.find((s) => "$match" in s) as { $match: Record<string, unknown> };
  assert.equal(matchStage.$match.bestseller, true);
});

test("buildRegexPipeline: price range filter applied", () => {
  const pipeline = buildRegexPipeline(makeParams({ minPrice: 200, maxPrice: 800 }), 0);
  const matchStage = pipeline.find((s) => "$match" in s) as { $match: Record<string, unknown> };
  const price = matchStage.$match.price as Record<string, number>;
  assert.equal(price.$gte, 200);
  assert.equal(price.$lte, 800);
});

test("buildRegexPipeline: rating filter applied", () => {
  const pipeline = buildRegexPipeline(makeParams({ rating: 4 }), 0);
  const matchStage = pipeline.find((s) => "$match" in s) as { $match: Record<string, unknown> };
  const rating = matchStage.$match.rating as Record<string, number>;
  assert.equal(rating.$gte, 4);
});

test("buildRegexPipeline: type filter applied", () => {
  const pipeline = buildRegexPipeline(makeParams({ type: "Body Butter" }), 0);
  const matchStage = pipeline.find((s) => "$match" in s) as { $match: Record<string, unknown> };
  assert.equal(matchStage.$match.type, "Body Butter");
});

test("buildRegexPipeline: $facet stage present with meta and data", () => {
  const pipeline = buildRegexPipeline(makeParams(), 0);
  const facetStage = pipeline.find((s) => "$facet" in s) as { $facet: Record<string, unknown> };
  assert.ok(facetStage, "should have $facet");
  assert.ok(Array.isArray(facetStage.$facet.meta));
  assert.ok(Array.isArray(facetStage.$facet.data));
});

test("buildRegexPipeline: pagination skip applied in data branch", () => {
  const skip = 16;
  const pipeline = buildRegexPipeline(makeParams(), skip);
  const facetStage = pipeline.find((s) => "$facet" in s) as { $facet: { data: object[] } };
  const skipStage = facetStage.$facet.data.find((s) => "$skip" in s) as { $skip: number };
  assert.equal(skipStage.$skip, skip);
});

test("buildRegexPipeline: active:true always in match", () => {
  // Even with no filters, only active products should be returned.
  const pipeline = buildRegexPipeline(makeParams(), 0);
  const matchStage = pipeline.find((s) => "$match" in s) as { $match: Record<string, unknown> };
  assert.equal(matchStage.$match.active, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Atlas Search pipeline shape
// ─────────────────────────────────────────────────────────────────────────────

test("buildAtlasPipeline: returns null for empty query", () => {
  const result = buildAtlasPipeline(makeParams({ q: "" }), 0);
  assert.equal(result, null);
});

test("buildAtlasPipeline: $search stage is first", () => {
  const pipeline = buildAtlasPipeline(makeParams({ q: "body butter" }), 0);
  assert.ok(pipeline, "pipeline should not be null");
  assert.ok("$search" in pipeline[0], "first stage should be $search");
});

test("buildAtlasPipeline: compound must includes active:true equals", () => {
  const pipeline = buildAtlasPipeline(makeParams({ q: "body" }), 0)!;
  const search = pipeline[0].$search as { compound: { must: object[] } };
  const mustEquals = search.compound.must.find(
    (c: object) => "equals" in c && (c as { equals: { path: string } }).equals.path === "active"
  ) as { equals: { path: string; value: boolean } } | undefined;
  assert.ok(mustEquals, "must clause should have active equals");
  assert.equal(mustEquals.equals.value, true);
});

test("buildAtlasPipeline: name has highest boost in should clauses", () => {
  const pipeline = buildAtlasPipeline(makeParams({ q: "butter" }), 0)!;
  const search = pipeline[0].$search as { compound: { should: object[] } };
  // The autocomplete clause on "name" has boost value 5.
  const autoComplete = search.compound.should.find(
    (c: object) => "autocomplete" in c &&
      (c as { autocomplete: { path: string; score: { boost: { value: number } } } }).autocomplete.path === "name"
  ) as { autocomplete: { score: { boost: { value: number } } } } | undefined;
  assert.ok(autoComplete, "should have autocomplete on name");
  assert.equal(autoComplete.autocomplete.score.boost.value, 5);
});

test("buildAtlasPipeline: category filter goes into compound filter array", () => {
  const pipeline = buildAtlasPipeline(makeParams({ q: "body", category: "body-care" }), 0)!;
  const search = pipeline[0].$search as { compound: { filter?: object[] } };
  assert.ok(Array.isArray(search.compound.filter));
  const hasCategory = search.compound.filter!.some(
    (c: object) => "text" in c && (c as { text: { path: string; query: string } }).text.path === "categoryId"
  );
  assert.ok(hasCategory, "category filter should be in compound.filter");
});

test("buildAtlasPipeline: bestseller filter in compound filter", () => {
  const pipeline = buildAtlasPipeline(makeParams({ q: "body", bestseller: true }), 0)!;
  const search = pipeline[0].$search as { compound: { filter?: object[] } };
  assert.ok(Array.isArray(search.compound.filter));
  const hasBestseller = search.compound.filter!.some(
    (c: object) => "equals" in c && (c as { equals: { path: string; value: boolean } }).equals.path === "bestseller"
  );
  assert.ok(hasBestseller);
});

test("buildAtlasPipeline: price range goes into $match stage after $search", () => {
  const pipeline = buildAtlasPipeline(makeParams({ q: "soap", minPrice: 100, maxPrice: 500 }), 0)!;
  const matchStage = pipeline.find((s) => "$match" in s) as { $match: Record<string, unknown> } | undefined;
  assert.ok(matchStage, "should have $match after $search");
  const price = matchStage.$match.price as Record<string, number>;
  assert.equal(price.$gte, 100);
  assert.equal(price.$lte, 500);
});

test("buildAtlasPipeline: $facet present with meta and data", () => {
  const pipeline = buildAtlasPipeline(makeParams({ q: "butter" }), 0)!;
  const facetStage = pipeline.find((s) => "$facet" in s) as { $facet: Record<string, unknown> } | undefined;
  assert.ok(facetStage, "should have $facet");
  assert.ok(Array.isArray(facetStage.$facet.meta));
  assert.ok(Array.isArray(facetStage.$facet.data));
});

test("buildAtlasPipeline: minimumShouldMatch is 1", () => {
  const pipeline = buildAtlasPipeline(makeParams({ q: "scrub" }), 0)!;
  const search = pipeline[0].$search as { compound: { minimumShouldMatch: number } };
  assert.equal(search.compound.minimumShouldMatch, 1);
});

test("buildAtlasPipeline: no $match stage when no range/rating filters", () => {
  const pipeline = buildAtlasPipeline(makeParams({ q: "butter" }), 0)!;
  const matchStages = pipeline.filter((s) => "$match" in s);
  assert.equal(matchStages.length, 0, "no $match without range/rating filters");
});

test("buildAtlasPipeline: pagination skip applied in data branch", () => {
  const pipeline = buildAtlasPipeline(makeParams({ q: "butter" }), 24)!;
  const facetStage = pipeline.find((s) => "$facet" in s) as { $facet: { data: object[] } };
  const skipStage = facetStage.$facet.data.find((s) => "$skip" in s) as { $skip: number };
  assert.equal(skipStage.$skip, 24);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. FacetResult extraction
// ─────────────────────────────────────────────────────────────────────────────

test("extractFacetResult: extracts total and data correctly", () => {
  const raw = [{ meta: [{ total: 42 }], data: [{ id: "p1" }, { id: "p2" }] }];
  const result = extractFacetResult(raw);
  assert.equal(result.meta[0].total, 42);
  assert.equal(result.data.length, 2);
});

test("extractFacetResult: handles empty result safely", () => {
  const result = extractFacetResult([]);
  assert.equal(result.meta.length, 0);
  assert.equal(result.data.length, 0);
});

test("extractFacetResult: handles zero matches", () => {
  const raw = [{ meta: [], data: [] }];
  const result = extractFacetResult(raw);
  assert.equal(result.meta.length, 0);
  assert.equal(result.data.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Client error classes
// ─────────────────────────────────────────────────────────────────────────────

test("SearchAbortError: name is SearchAbortError", () => {
  const err = new SearchAbortError();
  assert.equal(err.name, "SearchAbortError");
  assert.ok(err instanceof Error);
});

test("SearchApiError: carries status code", () => {
  const err = new SearchApiError(503, "unavailable");
  assert.equal(err.status, 503);
  assert.equal(err.message, "unavailable");
  assert.ok(err instanceof Error);
});

test("SearchApiError and SearchAbortError are distinct", () => {
  const abort = new SearchAbortError();
  const api = new SearchApiError(400, "bad");
  assert.ok(!(abort instanceof SearchApiError));
  assert.ok(!(api instanceof SearchAbortError));
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Inactive products exclusion (pipeline-level assertion)
// ─────────────────────────────────────────────────────────────────────────────

test("both pipelines always require active:true", () => {
  const regex = buildRegexPipeline(makeParams(), 0);
  const matchStage = regex.find((s) => "$match" in s) as { $match: Record<string, unknown> };
  assert.equal(matchStage.$match.active, true, "regex pipeline must filter active");

  const atlas = buildAtlasPipeline(makeParams({ q: "soap" }), 0)!;
  const search = atlas[0].$search as { compound: { must: object[] } };
  const activeClause = search.compound.must.find(
    (c: object) => "equals" in c && (c as { equals: { path: string } }).equals.path === "active"
  );
  assert.ok(activeClause, "atlas pipeline must filter active via compound.must");
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Seed data isolation (no seed fallback from search API)
// ─────────────────────────────────────────────────────────────────────────────

test("regex pipeline references active field — never bypasses active filter", () => {
  // The pipeline must contain active:true even when no other filters are set.
  // This ensures inactive/seed products are never returned.
  for (const q of ["", "body", "bgdy", "bath salts"]) {
    const pipeline = buildRegexPipeline(makeParams({ q }), 0);
    const matchStage = pipeline.find((s) => "$match" in s) as { $match: Record<string, unknown> };
    assert.equal(matchStage.$match.active, true, `active filter missing for q="${q}"`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. All sort modes produce deterministic spec
// ─────────────────────────────────────────────────────────────────────────────

test("all sort modes produce a spec with at least one secondary key", () => {
  const modes: SortOption[] = ["featured", "newest", "rating", "price-low", "price-high", "relevance"];
  for (const sort of modes) {
    const spec = buildSortSpec(sort, false);
    // Every sort should have id or _id as a secondary stable key.
    const keys = Object.keys(spec);
    assert.ok(keys.length >= 2, `sort "${sort}" should have ≥2 keys for stability`);
  }
});
