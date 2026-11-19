/** Formula / trust marks shown on the product page. Admin toggles per product. */

export const PRODUCT_CLAIM_IDS = [
  "plant-based",
  "cruelty-free",
  "paraben-free",
  "sulfate-free",
  "paraffin-free",
  "microplastic-free",
  "made-in-india",
  "small-batch",
  "simple-formulas",
  "quiet-scents",
] as const;

export type ProductClaimId = (typeof PRODUCT_CLAIM_IDS)[number];

export type ProductClaimDef = {
  id: ProductClaimId;
  label: string;
  /** On for every new product and for legacy rows with no `claims` field. */
  defaultEnabled: boolean;
};

export const PRODUCT_CLAIMS: readonly ProductClaimDef[] = [
  { id: "plant-based", label: "Plant-based", defaultEnabled: true },
  { id: "cruelty-free", label: "Cruelty-free", defaultEnabled: true },
  { id: "paraben-free", label: "Paraben-free", defaultEnabled: false },
  { id: "sulfate-free", label: "Sulfate-free", defaultEnabled: false },
  { id: "paraffin-free", label: "Paraffin-free", defaultEnabled: false },
  { id: "microplastic-free", label: "Microplastic-free", defaultEnabled: false },
  { id: "made-in-india", label: "Made in India", defaultEnabled: true },
  { id: "small-batch", label: "Small-batch", defaultEnabled: false },
  { id: "simple-formulas", label: "Simple formulas", defaultEnabled: false },
  { id: "quiet-scents", label: "Quiet scents", defaultEnabled: false },
] as const;

export const DEFAULT_PRODUCT_CLAIMS: ProductClaimId[] = PRODUCT_CLAIMS.filter(
  (claim) => claim.defaultEnabled,
).map((claim) => claim.id);

const CLAIM_ID_SET = new Set<string>(PRODUCT_CLAIM_IDS);

export function isProductClaimId(value: string): value is ProductClaimId {
  return CLAIM_ID_SET.has(value);
}

/**
 * `undefined` / missing → brand defaults.
 * Explicit array (including `[]`) → only listed valid ids, catalog order.
 */
export function normalizeProductClaims(claims?: readonly string[] | null): ProductClaimId[] {
  if (claims == null) return [...DEFAULT_PRODUCT_CLAIMS];
  const enabled = new Set(claims.filter(isProductClaimId));
  return PRODUCT_CLAIM_IDS.filter((id) => enabled.has(id));
}

export function enabledProductClaims(product: { claims?: readonly string[] | null }) {
  const enabled = new Set(normalizeProductClaims(product.claims));
  return PRODUCT_CLAIMS.filter((claim) => enabled.has(claim.id));
}

export function toggleProductClaim(
  claims: readonly string[] | null | undefined,
  id: ProductClaimId,
  on: boolean,
): ProductClaimId[] {
  const current = new Set(normalizeProductClaims(claims));
  if (on) current.add(id);
  else current.delete(id);
  return PRODUCT_CLAIM_IDS.filter((claimId) => current.has(claimId));
}
