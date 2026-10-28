import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductPageNew from "../../product-page-new/page";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildProductJsonLd,
  buildProductMetadata,
  getActiveProductBySlug,
  getCategoryById,
} from "@/lib/seo/product";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }
  return buildProductMetadata(product);
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();

  const category = await getCategoryById(product.categoryId);
  const jsonLd = buildProductJsonLd(product, category?.name);

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductPageNew slug={slug} />
    </>
  );
}
