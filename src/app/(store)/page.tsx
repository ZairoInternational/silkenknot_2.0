import { Hero } from "@/components/home/Hero";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { CategorySection } from "@/components/home/RitualChapters";
import { BestsellerScroll } from "@/components/home/BestsellerScroll";
import { WhySilkKnot } from "@/components/home/WhySilkKnot";
import { ClaimMarquee } from "@/components/home/ClaimMarquee";
import { ExploreCollections } from "@/components/home/ExploreCollections";
import { NewLaunches } from "@/components/home/NewLaunches";
import { BrandStory, Newsletter } from "@/components/home/Flow";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryStrip />
      <NewLaunches />
      {/* BestSeller1 stays parked. The live row is BestsellerScroll. */}
      {/* BestSeller2 stays parked. */}
      <CategorySection />
      <WhySilkKnot />
      <ClaimMarquee />
      <ExploreCollections />
      {/* RitualBuilder stays parked. */}
      <BrandStory />
      <BestsellerScroll />
      <Newsletter />
    </>
  );
}
