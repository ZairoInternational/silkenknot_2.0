import { seedCategories, seedProducts } from "@/lib/data";

export function listProducts() {
  return seedProducts.filter((product) => product.active);
}

export function listCategories() {
  return [...seedCategories].sort((a, b) => a.order - b.order);
}

export function findProduct(slug: string) {
  return seedProducts.find((product) => product.slug === slug && product.active);
}
