import Link from "next/link";
import type { PublicBanner } from "@/lib/banners/content";
import { Media } from "@/components/ui";

/**
 * Slim promotional strip under the homepage hero.
 * Renders only when eligible promotional-strip banners exist.
 */
export function PromotionalStrip({ banners }: { banners: PublicBanner[] }) {
  const banner = banners[0];
  if (!banner?.image.desktopUrl) return null;

  const href = banner.cta.enabled ? banner.cta.href : "";
  const label = banner.cta.enabled ? banner.cta.label : banner.title || banner.image.alt;
  const openInNewTab = banner.cta.openInNewTab;
  const linkProps = openInNewTab ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : {};

  const media = (
    <>
      <div className="absolute inset-0 md:hidden">
        <Media
          src={banner.image.mobileUrl || banner.image.desktopUrl}
          alt=""
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div className="absolute inset-0 hidden md:block">
        <Media
          src={banner.image.desktopUrl}
          alt=""
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#2c2926]/55 via-[#2c2926]/25 to-transparent"
      />
    </>
  );

  const copy = (
    <div className="relative z-10 flex h-full max-w-[1440px] flex-col justify-center px-5 md:px-12">
      {banner.title ? <p className="font-serif text-2xl text-[#f7f3ee] md:text-3xl">{banner.title}</p> : null}
      {banner.subtitle || banner.promotionalText ? (
        <p className="mt-1 max-w-xl text-sm text-[#f7f3ee]/90">{banner.subtitle || banner.promotionalText}</p>
      ) : null}
      {banner.cta.enabled && !banner.wholeBannerClickable && href ? (
        <span className="mt-3 inline-flex w-fit rounded-full bg-[#9a7352] px-5 py-2 text-sm text-white">{banner.cta.label}</span>
      ) : null}
    </div>
  );

  if (banner.wholeBannerClickable && href) {
    return (
      <section className="relative h-36 overflow-hidden bg-[#efeae3] md:h-44" aria-label={label}>
        <Link
          href={href}
          aria-label={label}
          {...linkProps}
          className="absolute inset-0 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7352]"
        >
          {media}
          {copy}
        </Link>
      </section>
    );
  }

  return (
    <section className="relative h-36 overflow-hidden bg-[#efeae3] md:h-44" aria-label={banner.title || banner.image.alt || "Promotion"}>
      {media}
      <div className="relative z-10 flex h-full max-w-[1440px] flex-col justify-center px-5 md:px-12">
        {banner.title ? <p className="font-serif text-2xl text-[#f7f3ee] md:text-3xl">{banner.title}</p> : null}
        {banner.subtitle || banner.promotionalText ? (
          <p className="mt-1 max-w-xl text-sm text-[#f7f3ee]/90">{banner.subtitle || banner.promotionalText}</p>
        ) : null}
        {banner.cta.enabled && href ? (
          <Link
            href={href}
            {...linkProps}
            className="mt-3 inline-flex w-fit rounded-full bg-[#9a7352] px-5 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a7352]"
          >
            {banner.cta.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
