export type PackageData = "product_weights" | "store_default_weight" | "missing";

export type WeighableVariant = {
  label?: string;
  weightGrams?: number;
};

export type WeighableProduct = {
  id: string;
  weightGrams?: number;
  variants?: WeighableVariant[];
};

export type ParcelLine = {
  productId?: string;
  quantity?: number;
  variantLabel?: string;
};

export function approxProductWeight(type: string) {
  const value = type.toLowerCase();
  if (value.includes("soap")) return 100;
  if (value.includes("butter")) return 200;
  if (value.includes("scrub")) return 250;
  if (value.includes("candle")) return 220;
  if (value.includes("salt")) return 300;
  return 200;
}

export function measuredWeightGrams(weight: unknown) {
  return typeof weight === "number" && Number.isInteger(weight) && weight >= 1 && weight <= 30000 ? weight : 0;
}

/**
 * Resolve line weight: variant weight (by label) → product weight → store fallback.
 * Size options like "250 g" / "400 g" should set weightGrams on each variant in Studio.
 */
export function lineWeightGrams(
  product: WeighableProduct | undefined,
  variantLabel: string | undefined,
  fallbackGrams: number,
) {
  const fallback = measuredWeightGrams(fallbackGrams) || 500;
  if (!product) return { grams: fallback, usedFallback: true as const };

  const label = variantLabel?.trim();
  if (label && product.variants?.length) {
    const variant = product.variants.find((item) => item.label?.trim() === label);
    const fromVariant = measuredWeightGrams(variant?.weightGrams);
    if (fromVariant) return { grams: fromVariant, usedFallback: false as const };
  }

  const fromProduct = measuredWeightGrams(product.weightGrams);
  if (fromProduct) return { grams: fromProduct, usedFallback: false as const };

  return { grams: fallback, usedFallback: true as const };
}

/**
 * Parcel dead weight for quotes and Delhivery waybills.
 * Sum of (resolved line weight × qty) + one packing allowance for the outer mailer/paper.
 */
export function parcelWeight(
  lines: ParcelLine[],
  products: WeighableProduct[],
  fallbackGrams: number,
  packingGrams = 0,
) {
  const fallback = measuredWeightGrams(fallbackGrams) || 500;
  const packing = measuredWeightGrams(packingGrams);
  let grams = 0;
  let usedFallback = false;
  let counted = 0;

  for (const line of lines) {
    const quantity = Number.isInteger(line.quantity) && (line.quantity as number) > 0 ? (line.quantity as number) : 1;
    const product = products.find((item) => item.id === line.productId);
    const resolved = lineWeightGrams(product, line.variantLabel, fallback);
    grams += resolved.grams * quantity;
    if (resolved.usedFallback) usedFallback = true;
    counted += quantity;
  }

  if (!counted) {
    return { grams: fallback + packing, packageData: "store_default_weight" as PackageData };
  }

  return {
    grams: grams + packing,
    packageData: usedFallback ? ("store_default_weight" as PackageData) : ("product_weights" as PackageData),
  };
}
