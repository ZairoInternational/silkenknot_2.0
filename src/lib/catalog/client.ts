"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";

/**
 * When store hydrate omits reviews, load the full product document once by slug.
 */
export function useFullProductBySlug(slug: string | undefined, base: Product | null | undefined) {
  const needsFetch = Boolean(slug && base && (!Array.isArray(base.reviews) || base.reviews.length === 0) && (base.reviewCount ?? 0) > 0);
  const [detail, setDetail] = useState<Product | null>(null);
  const [loading, setLoading] = useState(needsFetch);

  useEffect(() => {
    if (!slug || !base) {
      setDetail(null);
      setLoading(false);
      return;
    }
    const hasReviews = Array.isArray(base.reviews) && base.reviews.length > 0;
    if (hasReviews || !(base.reviewCount > 0)) {
      setDetail(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/products/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (!response.ok) return null;
        const body = (await response.json()) as { product?: Product };
        return body.product ?? null;
      })
      .then((product) => {
        if (!cancelled) setDetail(product);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, base?.id, base?.reviewCount, base?.reviews?.length]);

  const product = detail
    ? {
        ...base!,
        ...detail,
        faqs: detail.faqs?.length ? detail.faqs : base?.faqs ?? [],
        reviews: detail.reviews?.length ? detail.reviews : base?.reviews ?? [],
      }
    : base ?? null;

  return { product, loadingDetail: loading && !detail };
}
