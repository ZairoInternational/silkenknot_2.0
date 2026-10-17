import { randomBytes } from "crypto";

function setting(name: string) {
  return process.env[name]?.trim() || "";
}

export function bunnyConfig() {
  const zone = setting("BUNNY_STORAGE_ZONE") || setting("NEXT_PUBLIC_BUNNY_STORAGE_ZONE");
  const accessKey = setting("BUNNY_STORAGE_ACCESS_KEY") || setting("NEXT_PUBLIC_BUNNY_ACCESS_KEY");
  const storageHost = (setting("BUNNY_STORAGE_HOST") || setting("NEXT_PUBLIC_BUNNY_STORAGE_URL") || "https://storage.bunnycdn.com").replace(/\/$/, "");
  const cdnUrl = (setting("BUNNY_CDN_URL") || setting("NEXT_PUBLIC_BUNNY_CDN_URL")).replace(/\/$/, "");
  return { zone, accessKey, storageHost, cdnUrl };
}

export function bunnyReady() {
  const config = bunnyConfig();
  return Boolean(config.zone && config.accessKey && config.cdnUrl);
}

export async function uploadProductImage(file: Buffer, contentType: string) {
  const config = bunnyConfig();
  if (!config.zone || !config.accessKey) {
    throw new Error("Add BUNNY_STORAGE_ZONE and BUNNY_STORAGE_ACCESS_KEY in .env.local, then restart the app.");
  }
  if (!config.cdnUrl) {
    throw new Error("Add BUNNY_CDN_URL in .env.local. Use the public pull zone, such as https://your-zone.b-cdn.net, then restart the app.");
  }
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const stamp = new Date().toISOString().slice(0, 7);
  const path = `products/${stamp}/${randomBytes(12).toString("hex")}.${extension}`;
  const endpoint = `${config.storageHost}/${config.zone}/${path}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      AccessKey: config.accessKey,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(file),
  });
  if (!response.ok) {
    throw new Error("The image host did not accept that photo. Check the storage zone and access key, then try again.");
  }
  return `${config.cdnUrl}/${path}`;
}
