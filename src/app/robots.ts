import type { MetadataRoute } from "next";
import { getSiteOrigin, isIndexableDeployment } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  // Preview / branch deployments: block crawling entirely so temporary URLs never rank.
  if (!isIndexableDeployment()) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

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
