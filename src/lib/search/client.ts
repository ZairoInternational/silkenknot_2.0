/**
 * Frontend search client.
 *
 * Wraps GET /api/products/search with:
 *  - Type-safe request building.
 *  - AbortSignal forwarding for request cancellation.
 *  - Safe error classification (network vs. API vs. abort).
 *
 * This module must never import server-only code (mongo.ts, query.ts, etc.)
 * because it runs in the browser.
 */

import type { SearchResponse } from "./types";

export type { SearchResponse };

export type ClientSearchParams = Partial<{
  q: string;
  category: string;
  min: number;
  max: number;
  rating: number;
  bestseller: boolean;
  type: string;
  sort: string;
  page: number;
  limit: number;
}>;

export class SearchAbortError extends Error {
  constructor() {
    super("Search cancelled");
    this.name = "SearchAbortError";
  }
}

export class SearchApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "SearchApiError";
    this.status = status;
  }
}

/**
 * Fetches search results from /api/products/search.
 *
 * Throws:
 *  - `SearchAbortError`  when the request is cancelled via the signal.
 *  - `SearchApiError`    when the server returns a non-2xx status.
 *  - `Error`             for network failures.
 */
export async function searchProducts(
  params: ClientSearchParams,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const qs = new URLSearchParams();

  if (params.q)             qs.set("q",          params.q.trim());
  if (params.category)      qs.set("category",   params.category);
  if (params.min != null)   qs.set("min",         String(params.min));
  if (params.max != null)   qs.set("max",         String(params.max));
  if (params.rating != null) qs.set("rating",     String(params.rating));
  if (params.bestseller)    qs.set("bestseller",  "1");
  if (params.type)          qs.set("type",        params.type);
  if (params.sort)          qs.set("sort",        params.sort);
  if (params.page != null)  qs.set("page",        String(params.page));
  if (params.limit != null) qs.set("limit",       String(params.limit));

  const url = `/api/products/search?${qs.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new SearchAbortError();
    throw err;
  }

  if (!response.ok) {
    let message = "Search unavailable.";
    try {
      const body = await response.json();
      if (typeof body.error === "string") message = body.error;
    } catch {
      // ignore JSON parse failure
    }
    throw new SearchApiError(response.status, message);
  }

  return response.json() as Promise<SearchResponse>;
}
