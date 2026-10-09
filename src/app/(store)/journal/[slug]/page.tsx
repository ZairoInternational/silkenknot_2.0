import type { Metadata } from "next";
import { journal } from "@/lib/data";
import { JournalArticle } from "@/components/content/Pages";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = journal.find((item) => item.slug === slug);
  return { title: entry?.title ?? "Journal" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <JournalArticle slug={slug} />;
}
