import { Hero } from "@/components/home/Hero";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { Bestsellers, Collections, Moment, MoreToTry, PromiseBand } from "@/components/home/Showcase";
import { Newsletter } from "@/components/home/Flow";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryStrip />
      <Bestsellers />
      <PromiseBand />
      <Collections />
      <Moment />
      <MoreToTry />
      <Newsletter />
    </>
  );
}
