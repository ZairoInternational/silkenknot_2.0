import { randomBytes } from "crypto";
import { MediaError, mediaCorrelationId } from "@/lib/media/errors";
import { processProductImage } from "@/lib/media/image";
import { assertSafeId, buildBannerAssetKey, buildProductAssetKey } from "@/lib/media/paths";

export type BunnyConfig = {
  zone: string;
  accessKey: string;
  storageHost: string;
  cdnUrl: string;
};

function uploadTimeoutMs() {
  return Number(process.env.BUNNY_UPLOAD_TIMEOUT_MS || 30_000);
}

function setting(name: string) {
  return process.env[name]?.trim() || "";
}

/** Server-only Bunny config. Never reads NEXT_PUBLIC_* credentials. */
export function bunnyConfig(): BunnyConfig | null {
  const zone = setting("BUNNY_STORAGE_ZONE");
  const accessKey = setting("BUNNY_STORAGE_ACCESS_KEY");
  const storageHost = (setting("BUNNY_STORAGE_HOST") || "https://storage.bunnycdn.com").replace(/\/$/, "");
  const cdnUrl = setting("BUNNY_CDN_URL").replace(/\/$/, "");
  if (!zone || !accessKey || !cdnUrl) return null;
  try {
    const host = new URL(storageHost);
    if (host.protocol !== "https:") return null;
  } catch {
    return null;
  }
  try {
    const cdn = new URL(cdnUrl);
    if (cdn.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { zone, accessKey, storageHost, cdnUrl };
}

export function bunnyReady() {
  return Boolean(bunnyConfig());
}

export function requireBunnyConfig(correlationId: string): BunnyConfig {
  const config = bunnyConfig();
  if (!config) {
    throw new MediaError(
      "config",
      "Image hosting is not configured. Add BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY, BUNNY_STORAGE_HOST, and BUNNY_CDN_URL.",
      503,
      correlationId,
    );
  }
  return config;
}

export function publicCdnUrl(config: BunnyConfig, objectKey: string) {
  return `${config.cdnUrl}/${objectKey.replace(/^\/+/, "")}`;
}

/** True when url is under our configured CDN host (for safe deletes). */
export function isManagedCdnUrl(url: string, config = bunnyConfig()) {
  if (!config) return false;
  try {
    const target = new URL(url);
    const cdn = new URL(config.cdnUrl);
    return target.protocol === "https:" && target.host === cdn.host;
  } catch {
    return false;
  }
}

function objectKeyFromCdnUrl(url: string, config: BunnyConfig) {
  if (!isManagedCdnUrl(url, config)) {
    throw new Error("That image is not on this store's image host.");
  }
  const target = new URL(url);
  const key = decodeURIComponent(target.pathname.replace(/^\/+/, ""));
  if (!key || key.includes("..") || key.startsWith("/")) {
    throw new Error("Invalid image path.");
  }
  return key;
}

async function putObject(
  config: BunnyConfig,
  objectKey: string,
  body: Buffer,
  contentType: string,
  correlationId: string,
) {
  const endpoint = `${config.storageHost}/${config.zone}/${objectKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), uploadTimeoutMs());
  try {
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: {
        AccessKey: config.accessKey,
        "Content-Type": contentType,
      },
      body: new Uint8Array(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Do not forward provider bodies to clients or logs.
      console.warn("[bunny] upload failed", {
        correlationId,
        status: response.status,
        host: config.storageHost,
        zone: config.zone,
      });
      if (response.status === 401 || response.status === 403) {
        throw new MediaError(
          "provider",
          "Image hosting rejected the upload. Check the storage zone password and regional host.",
          502,
          correlationId,
        );
      }
      throw new MediaError("provider", "The image host did not accept that photo.", 502, correlationId);
    }
  } catch (error) {
    if (error instanceof MediaError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new MediaError("timeout", "The image upload timed out. Try a smaller photo.", 504, correlationId);
    }
    throw new MediaError("provider", "Could not reach the image host.", 502, correlationId);
  } finally {
    clearTimeout(timer);
  }
}

export type UploadProductImageInput = {
  bytes: Buffer;
  productId: string;
  role?: "main" | "gallery" | "variant";
  variantId?: string;
  correlationId?: string;
};

export type UploadProductImageResult = {
  url: string;
  key: string;
  assetId: string;
  contentType: "image/webp";
  width: number;
  height: number;
  bytes: number;
  productId: string;
  role: "main" | "gallery" | "variant";
};

/**
 * Validate image bytes, re-encode to WebP, upload to Bunny Storage, return CDN URL.
 * Does not write to the database — callers attach the URL to product.images after success.
 */
export async function uploadProductImage(input: UploadProductImageInput): Promise<UploadProductImageResult> {
  const correlationId = input.correlationId || mediaCorrelationId();
  const config = requireBunnyConfig(correlationId);
  assertSafeId(input.productId, "product id");

  const role = input.role || "gallery";
  const processed = await processProductImage(input.bytes, correlationId);
  const assetId = randomBytes(12).toString("hex");
  const key = buildProductAssetKey({
    productId: input.productId,
    role,
    assetId,
    variantId: input.variantId,
    extension: "webp",
  });

  await putObject(config, key, processed.buffer, processed.contentType, correlationId);

  return {
    url: publicCdnUrl(config, key),
    key,
    assetId,
    contentType: processed.contentType,
    width: processed.width,
    height: processed.height,
    bytes: processed.bytes,
    productId: input.productId,
    role,
  };
}

export type UploadBannerImageInput = {
  bytes: Buffer;
  scope?: "homepage" | string;
  correlationId?: string;
};

export async function uploadBannerImage(input: UploadBannerImageInput) {
  const correlationId = input.correlationId || mediaCorrelationId();
  const config = requireBunnyConfig(correlationId);
  const scope = (input.scope || "homepage").trim() || "homepage";
  const processed = await processProductImage(input.bytes, correlationId);
  const assetId = randomBytes(12).toString("hex");
  const key = buildBannerAssetKey(scope === "homepage" ? "homepage" : scope, assetId);
  await putObject(config, key, processed.buffer, processed.contentType, correlationId);
  return {
    url: publicCdnUrl(config, key),
    key,
    assetId,
    contentType: processed.contentType,
    width: processed.width,
    height: processed.height,
    bytes: processed.bytes,
    scope,
    role: "banner" as const,
  };
}

async function deleteBunnyObject(url: string, correlationId: string) {
  const config = requireBunnyConfig(correlationId);
  let key: string;
  try {
    key = objectKeyFromCdnUrl(url, config);
  } catch {
    throw new MediaError("validation", "That image cannot be deleted from this host.", 400, correlationId);
  }

  const endpoint = `${config.storageHost}/${config.zone}/${key}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), uploadTimeoutMs());
  try {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: { AccessKey: config.accessKey },
      signal: controller.signal,
    });
    // 404 = already gone — treat as success for idempotent cleanup.
    if (!response.ok && response.status !== 404) {
      console.warn("[bunny] delete failed", { correlationId, status: response.status });
      throw new MediaError("provider", "Could not remove that image from the host.", 502, correlationId);
    }
  } catch (error) {
    if (error instanceof MediaError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new MediaError("timeout", "The image host timed out while deleting.", 504, correlationId);
    }
    throw new MediaError("provider", "Could not reach the image host.", 502, correlationId);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reusable Bunny CDN remove. Accepts one public CDN URL or many.
 * Refuses URLs outside this store's configured pull zone. Already-deleted objects (404) succeed.
 */
export async function removeFromBunny(
  urlOrUrls: string | string[],
  correlationId = mediaCorrelationId(),
) {
  const urls = [...new Set(
    (Array.isArray(urlOrUrls) ? urlOrUrls : [urlOrUrls])
      .map((item) => String(item || "").trim())
      .filter(Boolean),
  )];
  for (const url of urls) {
    await deleteBunnyObject(url, correlationId);
  }
  return { ok: true as const, removed: urls.length, correlationId };
}

/** @deprecated Prefer removeFromBunny — kept for existing admin callers. */
export async function deleteManagedAsset(url: string, correlationId = mediaCorrelationId()) {
  await removeFromBunny(url, correlationId);
}

