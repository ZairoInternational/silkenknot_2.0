import { Hero } from "@/components/home/Hero";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { CategorySection } from "@/components/home/RitualChapters";
import { BestsellerScroll } from "@/components/home/BestsellerScroll";
import { WhySilkKnot } from "@/components/home/WhySilkKnot";
import { ClaimMarquee } from "@/components/home/ClaimMarquee";
import { NewLaunches } from "@/components/home/NewLaunches";
import { BrandStory, Newsletter } from "@/components/home/Flow";
import Reviews from "@/components/home/Reviews";
// import { GiftSets } from "@/components/home/GiftSets";
// import { BuildYourRitual } from "@/components/home/Buildyourrituals";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryStrip />
      <NewLaunches />
      <CategorySection />
      <BestsellerScroll />
      <WhySilkKnot />
      <ClaimMarquee />
      <Reviews/>
      <BrandStory />
      {/* <GiftSets/> */}
      {/* <BuildYourRitual/> */}
      <Newsletter />
    </>
  );
}
