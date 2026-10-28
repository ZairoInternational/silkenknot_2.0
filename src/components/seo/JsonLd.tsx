import { serializeJsonLd, type JsonLd } from "@/lib/seo/jsonLd";

/** Server-rendered JSON-LD script. Safe against </script> injection. */
export function JsonLd({ data }: { data: JsonLd }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
