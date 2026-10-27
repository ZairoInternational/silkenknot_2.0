import { NextResponse } from "next/server";
import { clientIp } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import type { Product } from "@/lib/types";
import { toProductSummary } from "@/lib/support/product-view";
import { supportRateLimit } from "@/lib/support/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Catalogue unavailable." }, { status: 503 });
  const db = await getDb();
  const limited = await supportRateLimit(db, `products:${clientIp(request)}`, 60);
  if (!limited.ok) return NextResponse.json({ error: limited.message }, { status: 429 });

  const products = (await db
    .collection("products")
    .find({ active: { $ne: false } })
    .project({ id: 1, slug: 1, name: 1, categoryId: 1, ingredients: 1, howToUse: 1, showIngredients: 1, showHowToUse: 1, active: 1 })
    .sort({ name: 1 })
    .limit(40)
    .toArray()) as unknown as Product[];

  return NextResponse.json({
    products: products.map(toProductSummary),
    shopPath: "/shop",
  });
}
