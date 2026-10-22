import assert from "node:assert/strict";
import { randomBytes } from "crypto";
import test from "node:test";
import sharp from "sharp";

import { bunnyConfig, isManagedCdnUrl, publicCdnUrl, uploadProductImage } from "@/lib/media/bunny";
import { MediaError } from "@/lib/media/errors";
import { assertMediaAdmin } from "@/lib/media/gate";
import { processProductImage } from "@/lib/media/image";
import { assertSafeId, buildProductAssetKey } from "@/lib/media/paths";

async function makeJpeg(width = 64, height = 64) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 160, b: 120 } },
  })
    .jpeg()
    .toBuffer();
}

test("paths: rejects path traversal product ids", () => {
  assert.throws(() => assertSafeId("../etc", "product id"));
  assert.throws(() => assertSafeId("a/b", "product id"));
  assert.throws(() => buildProductAssetKey({ productId: "..", role: "gallery", assetId: "abc" }));
});

test("paths: builds product gallery and variant keys", () => {
  assert.equal(
    buildProductAssetKey({ productId: "cloud-whip-soap", role: "gallery", assetId: "aabbccddeeff" }),
    "products/cloud-whip-soap/gallery/aabbccddeeff.webp",
  );
  assert.equal(
    buildProductAssetKey({
      productId: "cloud-whip-soap",
      role: "variant",
      variantId: "standard",
      assetId: "aabbccddeeff",
    }),
    "products/cloud-whip-soap/variants/standard/aabbccddeeff.webp",
  );
});

test("image: rejects empty buffer", async () => {
  await assert.rejects(() => processProductImage(Buffer.alloc(0)), (error: unknown) => {
    assert.ok(error instanceof MediaError);
    assert.equal(error.code, "validation");
    return true;
  });
});

test("image: rejects oversized byte payload", async () => {
  const huge = Buffer.alloc(7 * 1024 * 1024, 1);
  await assert.rejects(() => processProductImage(huge), (error: unknown) => {
    assert.ok(error instanceof MediaError);
    assert.equal(error.status, 400);
    return true;
  });
});

test("image: rejects non-image bytes", async () => {
  await assert.rejects(() => processProductImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), (error: unknown) => {
    assert.ok(error instanceof MediaError);
    assert.equal(error.code, "validation");
    return true;
  });
});

test("image: re-encodes jpeg to webp and strips to safe output", async () => {
  const jpeg = await makeJpeg();
  const out = await processProductImage(jpeg);
  assert.equal(out.contentType, "image/webp");
  assert.ok(out.bytes > 0);
  assert.equal(out.width, 64);
  assert.equal(out.height, 64);
  const meta = await sharp(out.buffer).metadata();
  assert.equal(meta.format, "webp");
});

test("image: rejects excessive dimensions", async () => {
  const big = await sharp({
    create: { width: 5000, height: 100, channels: 3, background: { r: 10, g: 10, b: 10 } },
  })
    .png()
    .toBuffer();
  await assert.rejects(() => processProductImage(big), (error: unknown) => {
    assert.ok(error instanceof MediaError);
    assert.match(error.message, /too large|4096/i);
    return true;
  });
});

test("bunnyConfig: does not read NEXT_PUBLIC credential fallbacks", () => {
  const keys = [
    "BUNNY_STORAGE_ZONE",
    "BUNNY_STORAGE_ACCESS_KEY",
    "BUNNY_CDN_URL",
    "NEXT_PUBLIC_BUNNY_STORAGE_ZONE",
    "NEXT_PUBLIC_BUNNY_ACCESS_KEY",
    "NEXT_PUBLIC_BUNNY_CDN_URL",
  ] as const;
  const prev: Record<string, string | undefined> = {};
  for (const key of keys) prev[key] = process.env[key];
  try {
    delete process.env.BUNNY_STORAGE_ZONE;
    delete process.env.BUNNY_STORAGE_ACCESS_KEY;
    delete process.env.BUNNY_CDN_URL;
    process.env.NEXT_PUBLIC_BUNNY_STORAGE_ZONE = "public-zone";
    process.env.NEXT_PUBLIC_BUNNY_ACCESS_KEY = "leaked-key";
    process.env.NEXT_PUBLIC_BUNNY_CDN_URL = "https://public.b-cdn.net";
    assert.equal(bunnyConfig(), null);
  } finally {
    for (const key of keys) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  }
});

test("isManagedCdnUrl: only trusts configured CDN host", () => {
  const config = {
    zone: "z",
    accessKey: "k",
    storageHost: "https://sg.storage.bunnycdn.com",
    cdnUrl: "https://silkenknot-cdn.b-cdn.net",
  };
  assert.equal(isManagedCdnUrl("https://silkenknot-cdn.b-cdn.net/products/a/main/x.webp", config), true);
  assert.equal(isManagedCdnUrl("https://evil.example/products/a/main/x.webp", config), false);
  assert.equal(isManagedCdnUrl("https://silkenknot-cdn.b-cdn.net/../etc/passwd", config), true);
});

test("publicCdnUrl: joins without double slashes", () => {
  const url = publicCdnUrl(
    { zone: "z", accessKey: "k", storageHost: "https://sg.storage.bunnycdn.com", cdnUrl: "https://cdn.example" },
    "products/p1/gallery/abc.webp",
  );
  assert.equal(url, "https://cdn.example/products/p1/gallery/abc.webp");
});

function withBunnyEnv(values: Record<string, string>, run: () => Promise<void> | void) {
  const keys = Object.keys(values);
  const prev: Record<string, string | undefined> = {};
  for (const key of keys) prev[key] = process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const key of keys) {
        if (prev[key] === undefined) delete process.env[key];
        else process.env[key] = prev[key];
      }
    });
}

test("uploadProductImage: mocks Bunny PUT and returns CDN url", async () => {
  const originalFetch = globalThis.fetch;
  await withBunnyEnv(
    {
      BUNNY_STORAGE_ZONE: "silkenknot",
      BUNNY_STORAGE_ACCESS_KEY: "test-key-not-real",
      BUNNY_STORAGE_HOST: "https://sg.storage.bunnycdn.com",
      BUNNY_CDN_URL: "https://silkenknot-cdn.b-cdn.net",
    },
    async () => {
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input);
        assert.match(url, /^https:\/\/sg\.storage\.bunnycdn\.com\/silkenknot\/products\/cloud-whip-soap\//);
        assert.doesNotMatch(url, /test-key-not-real/);
        return new Response(JSON.stringify({ HttpCode: 201 }), { status: 201 });
      }) as typeof fetch;

      const jpeg = await makeJpeg();
      const result = await uploadProductImage({ bytes: jpeg, productId: "cloud-whip-soap", role: "gallery" });
      assert.match(result.url, /^https:\/\/silkenknot-cdn\.b-cdn\.net\/products\/cloud-whip-soap\/gallery\/[a-f0-9]+\.webp$/);
      assert.equal(result.contentType, "image/webp");
      assert.ok(!JSON.stringify(result).includes("test-key-not-real"));
    },
  ).finally(() => {
    globalThis.fetch = originalFetch;
  });
});

test("uploadProductImage: maps Bunny 401 to provider MediaError", async () => {
  const originalFetch = globalThis.fetch;
  await withBunnyEnv(
    {
      BUNNY_STORAGE_ZONE: "silkenknot",
      BUNNY_STORAGE_ACCESS_KEY: "bad-key",
      BUNNY_STORAGE_HOST: "https://sg.storage.bunnycdn.com",
      BUNNY_CDN_URL: "https://silkenknot-cdn.b-cdn.net",
    },
    async () => {
      globalThis.fetch = (async () => new Response("nope", { status: 401 })) as typeof fetch;
      const jpeg = await makeJpeg();
      await assert.rejects(
        () => uploadProductImage({ bytes: jpeg, productId: "cloud-whip-soap" }),
        (error: unknown) => {
          assert.ok(error instanceof MediaError);
          assert.equal(error.code, "provider");
          assert.equal(error.status, 502);
          assert.doesNotMatch(error.message, /bad-key|nope/i);
          return true;
        },
      );
    },
  ).finally(() => {
    globalThis.fetch = originalFetch;
  });
});

test("uploadProductImage: timeout becomes MediaError timeout", async () => {
  const keys = ["BUNNY_STORAGE_ZONE", "BUNNY_STORAGE_ACCESS_KEY", "BUNNY_STORAGE_HOST", "BUNNY_CDN_URL", "BUNNY_UPLOAD_TIMEOUT_MS"] as const;
  const prev: Record<string, string | undefined> = {};
  for (const key of keys) prev[key] = process.env[key];
  const originalFetch = globalThis.fetch;
  try {
    process.env.BUNNY_STORAGE_ZONE = "silkenknot";
    process.env.BUNNY_STORAGE_ACCESS_KEY = "test-key";
    process.env.BUNNY_STORAGE_HOST = "https://sg.storage.bunnycdn.com";
    process.env.BUNNY_CDN_URL = "https://silkenknot-cdn.b-cdn.net";
    process.env.BUNNY_UPLOAD_TIMEOUT_MS = "50";
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const fail = () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        };
        if (init?.signal?.aborted) {
          fail();
          return;
        }
        init?.signal?.addEventListener("abort", fail, { once: true });
      })) as typeof fetch;
    const jpeg = await makeJpeg();
    await assert.rejects(
      () => uploadProductImage({ bytes: jpeg, productId: "cloud-whip-soap" }),
      (error: unknown) => {
        assert.ok(error instanceof MediaError);
        assert.equal(error.code, "timeout");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  }
});

test("random asset ids do not collide for a batch", () => {
  const ids = new Set(Array.from({ length: 50 }, () => randomBytes(12).toString("hex")));
  assert.equal(ids.size, 50);
});

test("gate: rejects missing session", () => {
  assert.throws(() => assertMediaAdmin(null, "c1"), (error: unknown) => {
    assert.ok(error instanceof MediaError);
    assert.equal(error.status, 401);
    assert.equal(error.code, "auth");
    return true;
  });
});

test("gate: rejects non-admin session", () => {
  assert.throws(() => assertMediaAdmin({ id: "u1", role: "customer" }, "c2"), (error: unknown) => {
    assert.ok(error instanceof MediaError);
    assert.equal(error.status, 403);
    return true;
  });
});

test("gate: allows admin session", () => {
  assert.doesNotThrow(() => assertMediaAdmin({ id: "a1", role: "admin" }, "c3"));
});

test("uploadProductImage: response metadata never includes storage credentials", async () => {
  const prev = {
    BUNNY_STORAGE_ZONE: process.env.BUNNY_STORAGE_ZONE,
    BUNNY_STORAGE_ACCESS_KEY: process.env.BUNNY_STORAGE_ACCESS_KEY,
    BUNNY_STORAGE_HOST: process.env.BUNNY_STORAGE_HOST,
    BUNNY_CDN_URL: process.env.BUNNY_CDN_URL,
  };
  const originalFetch = globalThis.fetch;
  try {
    process.env.BUNNY_STORAGE_ZONE = "silkenknot";
    process.env.BUNNY_STORAGE_ACCESS_KEY = "secret-must-not-leak";
    process.env.BUNNY_STORAGE_HOST = "https://sg.storage.bunnycdn.com";
    process.env.BUNNY_CDN_URL = "https://silkenknot.b-cdn.net";
    globalThis.fetch = (async () => new Response(null, { status: 201 })) as typeof fetch;
    const jpeg = await makeJpeg();
    const result = await uploadProductImage({ bytes: jpeg, productId: "cloud-whip-soap", role: "main" });
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("secret-must-not-leak"), false);
    assert.equal(serialized.includes("AccessKey"), false);
    assert.ok(result.url.startsWith("https://silkenknot.b-cdn.net/products/"));
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
