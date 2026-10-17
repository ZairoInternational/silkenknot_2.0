import { findProduct } from "@/lib/repository";
import { databaseConfigured, getDb } from "@/lib/mongo";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (databaseConfigured()) {
    const db = await getDb();
    const product = await db.collection("products").findOne({ slug, active: true });
    if (!product) return Response.json({ error: "Not found" }, { status: 404 });
    const rest: Record<string, unknown> = { ...product };
    delete rest._id;
    return Response.json({ product: rest });
  }
  const product = findProduct(slug);
  if (!product) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ product });
}
