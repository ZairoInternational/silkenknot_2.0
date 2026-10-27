import { productShowsSection, type Product } from "@/lib/types";
import type { SupportProductDetail, SupportProductSummary } from "./types";

export function toProductSummary(product: Product): SupportProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    categoryId: product.categoryId,
    hasIngredients: productShowsSection(product, "ingredients"),
    hasHowToUse: productShowsSection(product, "howToUse"),
  };
}

export function toProductDetail(product: Product, section: "ingredients" | "howToUse"): SupportProductDetail {
  const base = toProductSummary(product);
  const showIngredients = section === "ingredients" && productShowsSection(product, "ingredients");
  const showHowTo = section === "howToUse" && productShowsSection(product, "howToUse");
  return {
    ...base,
    ingredients: showIngredients ? product.ingredients.filter((item) => item.trim()) : null,
    howToUse: showHowTo ? product.howToUse.filter((item) => item.trim()) : null,
    href: `/products/${product.slug}`,
  };
}
