import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { CategorySection } from "@/components/home/RitualChapters";
import { BestsellerScroll } from "@/components/home/BestsellerScroll";
import { WhySilkKnot } from "@/components/home/WhySilkKnot";
import { ClaimMarquee } from "@/components/home/ClaimMarquee";
import { NewLaunches } from "@/components/home/NewLaunches";
import { BrandStory, Newsletter } from "@/components/home/Flow";
import Reviews from "@/components/home/Reviews";
import { PromotionalStrip } from "@/components/home/PromotionalStrip";
import { WelcomeScratchOffer } from "@/components/offers/WelcomeScratchOffer";
import { getPublicBannersForHome } from "@/lib/banners/server";
import { getHeroContent } from "@/lib/hero/server";
import { buildPageMetadata, DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo/metadata";
// import { GiftSets } from "@/components/home/GiftSets";
// import { BuildYourRitual } from "@/components/home/Buildyourrituals";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: `${SITE_NAME} — Body care, bath & wellness`,
    description: DEFAULT_DESCRIPTION,
    path: "/",
  }),
  // Avoid "%s · Silken Knot" template doubling the brand on the homepage.
  title: {
    absolute: `${SITE_NAME} — Body care, bath & wellness`,
  },
};

export default async function HomePage() {
  const [hero, campaigns] = await Promise.all([getHeroContent(), getPublicBannersForHome()]);
  return (
    <>
      <Hero content={hero} campaignBanners={campaigns.hero} />
      <PromotionalStrip banners={campaigns.strip} />
      <CategoryStrip />
      <NewLaunches />
      <CategorySection />
      <BestsellerScroll />
      <WhySilkKnot />
      <ClaimMarquee />
      <Reviews />
      <BrandStory />
      {/* <GiftSets/> */}
      {/* <BuildYourRitual/> */}
      <Newsletter />
      <WelcomeScratchOffer />
    </>
  );
}
