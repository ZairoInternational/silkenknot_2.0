export function reserveFilter(productId: string, variantLabel: string, quantity: number) {
  return { id: productId, variants: { $elemMatch: { label: variantLabel, stock: { $gte: quantity } } } };
}
