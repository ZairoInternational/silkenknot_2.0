import type { NextConfig } from "next";

function bunnyHost() {
  const raw = process.env.BUNNY_CDN_URL?.trim();
  if (!raw) return [];
  try {
    const hostname = new URL(raw).hostname;
    if (!hostname) return [];
    // Pin the configured pull-zone hostname (narrower than *.b-cdn.net alone).
    return [
      { protocol: "https" as const, hostname, pathname: "/products/**" },
      { protocol: "https" as const, hostname, pathname: "/categories/**" },
      { protocol: "https" as const, hostname, pathname: "/banners/**" },
      { protocol: "https" as const, hostname, pathname: "/brands/**" },
    ];
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
        pathname: "/products/**",
      },
      {
        protocol: "https",
        hostname: "*.b-cdn.net",
        pathname: "/categories/**",
      },
      {
        protocol: "https",
        hostname: "*.b-cdn.net",
        pathname: "/banners/**",
      },
      {
        protocol: "https",
        hostname: "*.b-cdn.net",
        pathname: "/brands/**",
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
