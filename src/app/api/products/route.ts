import { listProducts } from "@/lib/repository";
import { databaseConfigured, getDb } from "@/lib/mongo";

export async function GET() {
  if (!databaseConfigured()) return Response.json({ products: listProducts() });
  const db = await getDb();
  const products = await db.collection("products").find({ active: true }).toArray();
  return Response.json({ products: products.map((product) => {
    const rest: Record<string, unknown> = { ...product };
    delete rest._id;
    return rest;
  }) });
}
