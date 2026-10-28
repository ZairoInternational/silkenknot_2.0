import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JournalArticle } from "@/components/content/Pages";
import { JsonLd } from "@/components/seo/JsonLd";
import { journal } from "@/lib/data";
import { getBrandSettings } from "@/lib/brand/server";
import { articleJsonLd } from "@/lib/seo/jsonLd";
import { buildPageMetadata, SITE_NAME } from "@/lib/seo/metadata";
import { absoluteAssetUrl, absoluteUrl } from "@/lib/seo/site";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = journal.find((item) => item.slug === slug);
  if (!entry) {
    return { title: "Journal", robots: { index: false, follow: false } };
  }
  return buildPageMetadata({
    title: entry.title,
    description: entry.excerpt,
    path: `/journal/${entry.slug}`,
    image: entry.image,
    ogType: "article",
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const entry = journal.find((item) => item.slug === slug);
  if (!entry) notFound();

  const brand = await getBrandSettings();
  const jsonLd = articleJsonLd({
    headline: entry.title,
    description: entry.excerpt,
    url: absoluteUrl(`/journal/${entry.slug}`),
    imageUrl: absoluteAssetUrl(entry.image),
    datePublished: entry.date,
    publisherName: SITE_NAME,
    publisherLogoUrl: absoluteAssetUrl(brand.iconUrl),
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <JournalArticle slug={slug} />
    </>
  );
}
