"use client";

import dynamic from "next/dynamic";
import type { WelcomeScratchPublic } from "@/lib/welcome-scratch/content";

const WelcomeScratchOffer = dynamic(
  () => import("@/components/offers/WelcomeScratchOffer").then((mod) => mod.WelcomeScratchOffer),
  { ssr: false },
);

export function WelcomeScratchOfferLazy({ settings }: { settings: WelcomeScratchPublic }) {
  return <WelcomeScratchOffer settings={settings} />;
}
