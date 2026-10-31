export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  if (src.includes("images.unsplash.com")) {
    const url = new URL(src);
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("w", String(Math.min(width, 1400)));
    url.searchParams.set("q", String(quality ?? 70));
    return url.toString();
  }

  // Next requires custom loaders to incorporate `width`. Local/CDN URLs ignore unknown query params.
  try {
    if (/^https?:\/\//i.test(src)) {
      const url = new URL(src);
      url.searchParams.set("w", String(width));
      if (quality != null) url.searchParams.set("q", String(quality));
      return url.toString();
    }
  } catch {
    // fall through
  }

  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}${quality != null ? `&q=${quality}` : ""}`;
}
