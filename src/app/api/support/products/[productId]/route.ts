import { NextResponse } from "next/server";
import { clientIp } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import type { Product } from "@/lib/types";
import { toProductDetail } from "@/lib/support/product-view";
import { supportRateLimit } from "@/lib/support/rate-limit";

export const runtime = "nodejs";

const SECTIONS = new Set(["ingredients", "howToUse"]);

export async function GET(request: Request, context: { params: Promise<{ productId: string }> }) {
  if (!databaseConfigured()) return NextResponse.json({ error: "Catalogue unavailable." }, { status: 503 });
  const { productId } = await context.params;
  if (!/^[A-Za-z0-9_-]{2,80}$/.test(productId)) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const sectionParam = new URL(request.url).searchParams.get("section") || "ingredients";
  if (!SECTIONS.has(sectionParam)) {
    return NextResponse.json({ error: "Invalid section." }, { status: 400 });
  }
  const section = sectionParam as "ingredients" | "howToUse";

  const db = await getDb();
  const limited = await supportRateLimit(db, `product:${clientIp(request)}`, 60);
  if (!limited.ok) return NextResponse.json({ error: limited.message }, { status: 429 });

  const product = (await db.collection("products").findOne({
    active: { $ne: false },
    $or: [{ id: productId }, { slug: productId }],
  })) as Product | null;

  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const detail = toProductDetail(product, section);
  if (section === "ingredients" && !detail.ingredients) {
    return NextResponse.json({
      product: detail,
      note: "An ingredient list is not listed here for this product. Try the product page or the formulas overview.",
    });
  }
  if (section === "howToUse" && !detail.howToUse) {
    return NextResponse.json({
      product: detail,
      note: "Usage steps are not listed here for this product. See the product page for details.",
    });
  }

  return NextResponse.json({ product: detail });
}
