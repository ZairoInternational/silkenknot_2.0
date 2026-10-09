import { Hero } from "@/components/home/Hero";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { CategorySection } from "@/components/home/RitualChapters";
import { BestSellers, BrandStory, HorizontalStory, Newsletter, ProductShowcase, RitualBuilder } from "@/components/home/Flow";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryStrip />
      <CategorySection />
      <ProductShowcase />
      <HorizontalStory />
      <RitualBuilder />
      <BestSellers />
      <BrandStory />
      <Newsletter />
    </>
  );
}
