import { csrfHeaderMatches, jsonError, sameOrigin } from "@/lib/auth/http";
import { uploadProductImage } from "@/lib/media/bunny";
import { currentSession } from "@/lib/session";

const MAX_BYTES = 6 * 1024 * 1024;

const types = new Map([
  ["image/jpeg", "image/jpeg"],
  ["image/png", "image/png"],
  ["image/webp", "image/webp"],
]);

export async function POST(request: Request) {
  if (!sameOrigin(request) || !csrfHeaderMatches(request)) return jsonError("Request blocked.", 403);
  const session = await currentSession();
  if (session?.role !== "admin") return jsonError("Studio access is required.", 403);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Choose an image to upload.");
  const contentType = types.get(file.type);
  if (!contentType) return jsonError("Use a JPEG, PNG, or WebP image.");
  if (file.size <= 0 || file.size > MAX_BYTES) return jsonError("That image needs to be under 6 MB.");

  try {
    const url = await uploadProductImage(Buffer.from(await file.arrayBuffer()), contentType);
    return Response.json({ ok: true, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload that image.";
    return jsonError(message, 502);
  }
}
