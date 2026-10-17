import { listCategories } from "@/lib/repository";
import { databaseConfigured, getDb } from "@/lib/mongo";

export async function GET() {
  if (!databaseConfigured()) return Response.json({ categories: listCategories() });
  const db = await getDb();
  const categories = await db.collection("categories").find().sort({ order: 1 }).toArray();
  return Response.json({ categories: categories.map((category) => {
    const rest: Record<string, unknown> = { ...category };
    delete rest._id;
    return rest;
  }) });
}
