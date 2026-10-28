/**
 * Safe JSON-LD helpers. Serialize with HTML escaping so </script> in content
 * cannot break out of the script tag.
 */

export type JsonLdNode = Record<string, unknown>;
export type JsonLd = JsonLdNode | JsonLdNode[];

/** Escape characters that are dangerous inside a JSON-LD script element. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function organizationJsonLd(input: {
  name: string;
  url: string;
  logoUrl?: string;
  description?: string;
  sameAs?: string[];
}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: input.name,
    url: input.url,
    description: input.description,
    areaServed: {
      "@type": "Country",
      name: "India",
    },
  };
  if (input.logoUrl) {
    node.logo = input.logoUrl;
    node.image = input.logoUrl;
  }
  if (input.sameAs?.length) node.sameAs = input.sameAs;
  return node;
}

export function websiteJsonLd(input: { name: string; url: string; searchUrlTemplate?: string }) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: input.url,
  };
  if (input.searchUrlTemplate) {
    node.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: input.searchUrlTemplate,
      },
      "query-input": "required name=search_term_string",
    };
  }
  return node;
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqPageJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  url: string;
  imageUrl?: string;
  datePublished: string;
  dateModified?: string;
  publisherName: string;
  publisherLogoUrl?: string;
}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: input.url,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: {
      "@type": "Organization",
      name: input.publisherName,
    },
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      ...(input.publisherLogoUrl ? { logo: { "@type": "ImageObject", url: input.publisherLogoUrl } } : {}),
    },
  };
  if (input.imageUrl) node.image = [input.imageUrl];
  return node;
}

export type ProductOfferInput = {
  price: number;
  currency?: string;
  url: string;
  availability: "InStock" | "OutOfStock" | "PreOrder";
  sku?: string;
};

export function productJsonLd(input: {
  name: string;
  description: string;
  url: string;
  imageUrls: string[];
  brandName: string;
  sku?: string;
  offer: ProductOfferInput;
  aggregateRating?: { ratingValue: number; reviewCount: number };
  reviews?: Array<{
    authorName: string;
    rating: number;
    body: string;
    datePublished: string;
    title?: string;
  }>;
}) {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.imageUrls,
    brand: {
      "@type": "Brand",
      name: input.brandName,
    },
    offers: {
      "@type": "Offer",
      url: input.offer.url,
      priceCurrency: input.offer.currency ?? "INR",
      price: Number(input.offer.price).toFixed(2),
      availability: `https://schema.org/${input.offer.availability}`,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
  if (input.sku) node.sku = input.sku;
  if (input.aggregateRating && input.aggregateRating.reviewCount > 0 && input.aggregateRating.ratingValue > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(input.aggregateRating.ratingValue.toFixed(2)),
      reviewCount: input.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (input.reviews?.length) {
    node.review = input.reviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.authorName },
      datePublished: review.datePublished,
      reviewBody: review.body,
      name: review.title,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));
  }
  return node;
}
