import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/checkout",
          "/checkout/",
          "/account",
          "/account/",
          "/wishlist",
          "/orders",
          "/orders/",
          "/product-page-new",
          "/shop-preview",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
