export type PackageData = "product_weights" | "store_default_weight" | "missing";

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

export function parcelWeight(lines: { productId?: string; quantity?: number }[], products: { id: string; weightGrams?: number }[], fallbackGrams: number) {
  const fallback = measuredWeightGrams(fallbackGrams) || 500;
  let grams = 0;
  let usedFallback = false;
  let counted = 0;
  for (const line of lines) {
    const quantity = Number.isInteger(line.quantity) && (line.quantity as number) > 0 ? (line.quantity as number) : 1;
    const product = products.find((item) => item.id === line.productId);
    const measured = measuredWeightGrams(product?.weightGrams);
    grams += (measured || fallback) * quantity;
    if (!measured) usedFallback = true;
    counted += quantity;
  }
  if (!counted) return { grams: fallback, packageData: "store_default_weight" as PackageData };
  return { grams, packageData: usedFallback ? "store_default_weight" as PackageData : "product_weights" as PackageData };
}
