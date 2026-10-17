import { NextResponse } from "next/server";
import { csrfHeaderMatches, sameOrigin } from "@/lib/auth/http";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { CheckoutError } from "@/lib/payments/service";
import { ShippingQuoteError, prepareShippingQuote } from "@/lib/shipping/quotes";
import { currentSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request) || !csrfHeaderMatches(request)) return NextResponse.json({ error: "Request blocked." }, { status: 403 });
    if (!databaseConfigured()) return NextResponse.json({ error: "Checkout is unavailable." }, { status: 503 });
    const session = await currentSession();
    if (!session || session.role !== "customer") return NextResponse.json({ error: "Log in to continue." }, { status: 401 });
    const body = await request.json();
    const db = await getDb();
    const quote = await prepareShippingQuote(db, {
      userId: session.id,
      items: body.items,
      couponCode: String(body.couponCode || ""),
      postal: String(body.postalCode || ""),
    });
    return NextResponse.json(quote);
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      const status = error.code === "config" || error.code === "temporary" ? 503 : 400;
      return NextResponse.json({ error: error.message, code: error.code, serviceability: error.code === "unavailable" ? "unavailable" : error.code }, { status });
    }
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Delivery options could not be loaded." }, { status: 500 });
  }
}
