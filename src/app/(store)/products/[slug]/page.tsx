import type { Metadata } from "next";
import { ProductView } from "@/components/product/ProductView";
import { getSeedProduct } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getSeedProduct(slug);
  if (!product) return { title: "Product" };
  return { title: product.name, description: product.shortDescription };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductView slug={slug} />;
}
