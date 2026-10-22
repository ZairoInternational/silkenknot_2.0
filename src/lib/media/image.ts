import sharp, { type Metadata } from "sharp";
import { MediaError, mediaCorrelationId } from "@/lib/media/errors";

export const MEDIA_MAX_BYTES = Number(process.env.MEDIA_MAX_BYTES || 6 * 1024 * 1024);
export const MEDIA_MAX_WIDTH = Number(process.env.MEDIA_MAX_WIDTH || 4096);
export const MEDIA_MAX_HEIGHT = Number(process.env.MEDIA_MAX_HEIGHT || 4096);
export const MEDIA_MAX_PIXELS = Number(process.env.MEDIA_MAX_PIXELS || 12_000_000);
export const MEDIA_WEBP_QUALITY = Number(process.env.MEDIA_WEBP_QUALITY || 82);

const ALLOWED_INPUT = new Set(["jpeg", "png", "webp"]);

export type ProcessedImage = {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
  bytes: number;
};

/**
 * Decode and re-encode a raster image. Rejects SVG/HTML and corrupt payloads.
 * Strips EXIF/GPS by omitting metadata on output.
 */
export async function processProductImage(
  input: Buffer,
  correlationId = mediaCorrelationId(),
): Promise<ProcessedImage> {
  if (!input.length) {
    throw new MediaError("validation", "That file is empty.", 400, correlationId);
  }
  if (input.length > MEDIA_MAX_BYTES) {
    throw new MediaError("validation", "That image needs to be under 6 MB.", 400, correlationId);
  }

  let meta: Metadata;
  try {
    meta = await sharp(input, {
      failOn: "error",
      limitInputPixels: MEDIA_MAX_PIXELS,
      sequentialRead: true,
    }).metadata();
  } catch {
    throw new MediaError("validation", "That file is not a usable image.", 400, correlationId);
  }

  const format = meta.format || "";
  if (!ALLOWED_INPUT.has(format)) {
    throw new MediaError("validation", "Use a JPEG, PNG, or WebP image.", 400, correlationId);
  }

  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) {
    throw new MediaError("validation", "That image has no readable dimensions.", 400, correlationId);
  }
  if (width > MEDIA_MAX_WIDTH || height > MEDIA_MAX_HEIGHT) {
    throw new MediaError("validation", "That image is too large. Use a photo under 4096×4096.", 400, correlationId);
  }
  if (width * height > MEDIA_MAX_PIXELS) {
    throw new MediaError("validation", "That image has too many pixels.", 400, correlationId);
  }

  try {
    // Fresh instance after metadata — rotate uses EXIF then we drop metadata on encode.
    const buffer = await sharp(input, {
      failOn: "error",
      limitInputPixels: MEDIA_MAX_PIXELS,
    })
      .rotate()
      .webp({ quality: MEDIA_WEBP_QUALITY, effort: 4 })
      .toBuffer();

    const out = await sharp(buffer).metadata();
    return {
      buffer,
      contentType: "image/webp",
      width: out.width || width,
      height: out.height || height,
      bytes: buffer.length,
    };
  } catch (error) {
    if (error instanceof MediaError) throw error;
    throw new MediaError("validation", "That image could not be processed.", 400, correlationId);
  }
}
