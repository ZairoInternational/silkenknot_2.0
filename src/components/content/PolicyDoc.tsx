import Link from "next/link";

export type PolicyNavItem = { id: string; label: string };

export function PolicyDoc({
  eyebrow,
  title,
  lede,
  updated,
  nav,
  children,
  related,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  updated?: string;
  nav?: PolicyNavItem[];
  children: React.ReactNode;
  related?: { href: string; label: string }[];
}) {
  return (
    <article className="page-pad mx-auto w-full max-w-5xl px-5 pb-24">
      <p className="eyebrow text-mute">{eyebrow}</p>
      <h1 className="mt-4 font-serif text-5xl leading-[0.95] md:text-6xl">{title}</h1>
      <p className="mt-6 text-lg leading-8 text-mute">{lede}</p>
      {updated ? (
        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-mute">Last updated · {updated}</p>
      ) : null}

      {nav && nav.length > 0 ? (
        <nav
          aria-label="On this page"
          className="mt-10 border-y border-line py-5"
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-mute">On this page</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {nav.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-ink/80 underline-offset-4 transition hover:text-ink hover:underline">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="mt-10 space-y-12 leading-7 text-ink/80">{children}</div>

      {related && related.length > 0 ? (
        <aside className="mt-16 border-t border-line pt-10">
          <p className="eyebrow text-mute">Related</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {related.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="underline-offset-4 hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}

export function PolicySection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="font-serif text-3xl text-ink md:text-4xl">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function PolicyGlance({ items }: { items: string[] }) {
  return (
    <div className="rounded-sm bg-cream px-5 py-6 md:px-7">
      <p className="text-[11px] uppercase tracking-[0.16em] text-mute">At a glance</p>
      <ul className="mt-4 space-y-3 text-ink/85">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mist" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PolicySteps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-5">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span className="flex size-8 shrink-0 items-center justify-center border border-line text-[11px] tracking-[0.12em] text-mute">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="font-medium text-ink">{step.title}</p>
            <p className="mt-1 text-ink/75">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PolicyRows({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <dl className="divide-y divide-line border-y border-line">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="text-sm font-medium text-ink">{row.label}</dt>
          <dd className="text-ink/75">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
