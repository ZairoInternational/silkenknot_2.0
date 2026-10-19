import type { Product, Variant } from "@/lib/types";

// ─── Public product shape returned by the search API ───────────────────────
// Omits heavy per-product arrays (reviews, faqs, howToUse, benefits,
// description) that are not needed on the listing page.
export type SearchProduct = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "categoryId"
  | "type"
  | "scent"
  | "price"
  | "compareAtPrice"
  | "rating"
  | "reviewCount"
  | "shortDescription"
  | "images"
  | "variants"
  | "featured"
  | "bestseller"
  | "newArrival"
  | "active"
  | "createdAt"
  | "weightGrams"
>;

// ─── Request parameters ─────────────────────────────────────────────────────
export type SortOption =
  | "featured"
  | "newest"
  | "rating"
  | "price-low"
  | "price-high"
  | "relevance";

export const VALID_SORTS: SortOption[] = [
  "featured",
  "newest",
  "rating",
  "price-low",
  "price-high",
  "relevance",
];

export const MAX_QUERY_LENGTH = 120;
export const DEFAULT_PAGE_SIZE = 8;
export const MAX_PAGE_SIZE = 48;

export type SearchParams = {
  q: string;
  category: string;
  minPrice: number | null;
  maxPrice: number | null;
  rating: number | null;
  bestseller: boolean;
  type: string;
  sort: SortOption;
  page: number;
  limit: number;
};

// ─── API response ────────────────────────────────────────────────────────────
export type SearchResponse = {
  items: SearchProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** The query text as received after normalization. */
  query: string;
  /**
   * If the query contained a word that was corrected via the dictionary,
   * this is the corrected form shown to the user ("Did you mean …?").
   * Null when no correction was applied.
   */
  correctedQuery: string | null;
};

export type SearchErrorResponse = {
  error: string;
};
