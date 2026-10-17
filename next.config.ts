import type { NextConfig } from "next";

function bunnyHost() {
  const raw = process.env.BUNNY_CDN_URL?.trim();
  if (!raw) return [];
  try {
    const hostname = new URL(raw).hostname;
    if (!hostname || hostname.endsWith(".b-cdn.net")) return [];
    return [{ protocol: "https" as const, hostname, pathname: "/**" }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    qualities: [70],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.b-cdn.net",
        pathname: "/**",
      },
      ...bunnyHost(),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
