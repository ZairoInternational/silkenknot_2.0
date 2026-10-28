import Link from "next/link";

type Crumb = { label: string; href?: string };

/** Visible breadcrumb trail for product detail pages. */
export function ProductBreadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-[11px] uppercase tracking-[0.14em] text-[#8a7350]">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
              {index > 0 ? <span aria-hidden className="text-[#c4b5a0]">/</span> : null}
              {item.href && !last ? (
                <Link href={item.href} className="transition-opacity hover:opacity-70">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-[#5d5348]" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
