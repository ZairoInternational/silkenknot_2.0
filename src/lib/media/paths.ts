/**
 * Logical Bunny object keys for public catalog assets.
 * Paths are generated server-side only — never from raw client path input.
 */

const SAFE_ID = /^[a-zA-Z0-9_-]{1,64}$/;

export type AssetRole = "main" | "gallery" | "variant" | "category" | "banner";

export function assertSafeId(value: string, label: string) {
  if (!SAFE_ID.test(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  if (value.includes("..") || value.includes("/") || value.includes("\\")) {
    throw new Error(`Invalid ${label}.`);
  }
}

export function buildProductAssetKey(input: {
  productId: string;
  role: "main" | "gallery" | "variant";
  assetId: string;
  variantId?: string;
  extension?: "webp" | "jpg" | "png";
}) {
  assertSafeId(input.productId, "product id");
  assertSafeId(input.assetId, "asset id");
  const ext = input.extension ?? "webp";
  if (input.role === "variant") {
    if (!input.variantId) throw new Error("Variant id is required for variant images.");
    assertSafeId(input.variantId, "variant id");
    return `products/${input.productId}/variants/${input.variantId}/${input.assetId}.${ext}`;
  }
  return `products/${input.productId}/${input.role}/${input.assetId}.${ext}`;
}

export function buildCategoryAssetKey(categoryId: string, assetId: string) {
  assertSafeId(categoryId, "category id");
  assertSafeId(assetId, "asset id");
  return `categories/${categoryId}/${assetId}.webp`;
}

export function buildBannerAssetKey(scope: "homepage" | string, assetId: string) {
  assertSafeId(assetId, "asset id");
  if (scope === "homepage") return `banners/homepage/${assetId}.webp`;
  assertSafeId(scope, "campaign id");
  return `banners/campaigns/${scope}/${assetId}.webp`;
}
