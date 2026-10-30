import { findProduct } from "@/lib/repository";
import { getFullProductBySlug } from "@/lib/catalog/server";
import { databaseConfigured, getDb } from "@/lib/mongo";

const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (databaseConfigured()) {
    const db = await getDb();
    const product = await getFullProductBySlug(db, slug);
    if (!product) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ product }, { headers: { "Cache-Control": CACHE_CONTROL } });
  }
  const product = findProduct(slug);
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ product }, { headers: { "Cache-Control": CACHE_CONTROL } });
}
