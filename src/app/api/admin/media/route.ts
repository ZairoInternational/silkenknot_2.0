import { clientIp, csrfHeaderMatches, jsonError, sameOrigin } from "@/lib/auth/http";
import { bunnyReady, removeFromBunny, uploadBannerImage, uploadProductImage } from "@/lib/media/bunny";
import { MediaError, mediaCorrelationId } from "@/lib/media/errors";
import { assertMediaAdmin } from "@/lib/media/gate";
import { MEDIA_MAX_BYTES } from "@/lib/media/image";
import { assertSafeId } from "@/lib/media/paths";
import { databaseConfigured, getDb } from "@/lib/mongo";
import { currentSession } from "@/lib/session";

export const runtime = "nodejs";

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = Number(process.env.MEDIA_UPLOAD_RATE_LIMIT || 40);

async function enforceUploadRate(userId: string, correlationId: string) {
  if (!databaseConfigured()) return;
  const db = await getDb();
  const windowStart = Math.floor(Date.now() / RATE_WINDOW_MS);
  const key = `media-upload:${userId}:${windowStart}`;
  await db.collection("rateLimits").updateOne({ key }, { $inc: { count: 1 }, $setOnInsert: { key } }, { upsert: true });
  const row = await db.collection("rateLimits").findOne({ key });
  if ((row?.count || 0) > RATE_LIMIT) {
    throw new MediaError("rate", "Too many uploads. Wait a few minutes and try again.", 429, correlationId);
  }
}

function safeError(error: unknown, correlationId: string) {
  if (error instanceof MediaError) {
    return jsonError(error.message, error.status, { correlationId: error.correlationId });
  }
  console.warn("[media] unexpected error", { correlationId, name: error instanceof Error ? error.name : "unknown" });
  return jsonError("Could not upload that image.", 502, { correlationId });
}

export async function POST(request: Request) {
  const correlationId = mediaCorrelationId();

  if (!sameOrigin(request) || !csrfHeaderMatches(request)) {
    return jsonError("Request blocked.", 403, { correlationId });
  }

  const session = await currentSession();
  try {
    assertMediaAdmin(session, correlationId);
  } catch (error) {
    return safeError(error, correlationId);
  }

  if (!bunnyReady()) {
    return jsonError(
      "Image hosting is not configured. Add Bunny storage settings on the server.",
      503,
      { correlationId },
    );
  }

  try {
    await enforceUploadRate(session!.id || clientIp(request), correlationId);
  } catch (error) {
    return safeError(error, correlationId);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Malformed upload request.", 400, { correlationId });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Choose an image to upload.", 400, { correlationId });
  if (file.size <= 0) return jsonError("That file is empty.", 400, { correlationId });
  if (file.size > MEDIA_MAX_BYTES) return jsonError("That image needs to be under 6 MB.", 400, { correlationId });

  // Declared type is a hint only — bytes are validated with sharp.
  if (file.type && !["image/jpeg", "image/png", "image/webp", "application/octet-stream", ""].includes(file.type)) {
    return jsonError("Use a JPEG, PNG, or WebP image.", 400, { correlationId });
  }

  const roleRaw = String(form.get("role") || "gallery").trim();
  const isBanner = roleRaw === "banner";

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await file.arrayBuffer());
  } catch {
    return jsonError("Could not read that file.", 400, { correlationId });
  }
  if (bytes.length > MEDIA_MAX_BYTES) {
    return jsonError("That image needs to be under 6 MB.", 400, { correlationId });
  }

  if (isBanner) {
    const scopeRaw = String(form.get("scope") || "homepage").trim() || "homepage";
    try {
      if (scopeRaw !== "homepage") assertSafeId(scopeRaw, "campaign id");
    } catch {
      return jsonError("Invalid campaign id.", 400, { correlationId });
    }
    try {
      const result = await uploadBannerImage({ bytes, scope: scopeRaw, correlationId });
      return Response.json({
        ok: true,
        url: result.url,
        assetId: result.assetId,
        key: result.key,
        contentType: result.contentType,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        scope: result.scope,
        role: result.role,
        correlationId,
      });
    } catch (error) {
      return safeError(error, correlationId);
    }
  }

  const productIdRaw = String(form.get("productId") || "").trim();
  if (!productIdRaw) return jsonError("A product id is required before uploading images.", 400, { correlationId });
  try {
    assertSafeId(productIdRaw, "product id");
  } catch {
    return jsonError("Invalid product id.", 400, { correlationId });
  }

  const role = roleRaw === "main" || roleRaw === "variant" ? roleRaw : "gallery";
  const variantId = String(form.get("variantId") || "").trim() || undefined;
  if (role === "variant") {
    if (!variantId) return jsonError("A variant id is required for variant images.", 400, { correlationId });
    try {
      assertSafeId(variantId, "variant id");
    } catch {
      return jsonError("Invalid variant id.", 400, { correlationId });
    }
  }

  try {
    const result = await uploadProductImage({
      bytes,
      productId: productIdRaw,
      role,
      variantId,
      correlationId,
    });
    return Response.json({
      ok: true,
      url: result.url,
      assetId: result.assetId,
      key: result.key,
      contentType: result.contentType,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      productId: result.productId,
      role: result.role,
      correlationId,
    });
  } catch (error) {
    return safeError(error, correlationId);
  }
}

export async function DELETE(request: Request) {
  const correlationId = mediaCorrelationId();

  if (!sameOrigin(request) || !csrfHeaderMatches(request)) {
    return jsonError("Request blocked.", 403, { correlationId });
  }

  const session = await currentSession();
  try {
    assertMediaAdmin(session, correlationId);
  } catch (error) {
    return safeError(error, correlationId);
  }

  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return jsonError("Malformed request.", 400, { correlationId });
  }

  const url = String(body.url || "").trim();
  if (!url) return jsonError("Image URL is required.", 400, { correlationId });

  try {
    // Refuse delete while any product still references the URL (shared-asset safety).
    if (databaseConfigured()) {
      const db = await getDb();
      const stillUsed = await db.collection("products").countDocuments({ images: url }, { limit: 1 });
      if (stillUsed > 0) {
        return jsonError("That image is still attached to a product.", 409, { correlationId });
      }
    }
    await removeFromBunny(url, correlationId);
    return Response.json({ ok: true, correlationId });
  } catch (error) {
    return safeError(error, correlationId);
  }
}

export async function GET() {
  return jsonError("Method not allowed.", 405);
}

export async function PUT() {
  return jsonError("Method not allowed.", 405);
}

export async function PATCH() {
  return jsonError("Method not allowed.", 405);
}
