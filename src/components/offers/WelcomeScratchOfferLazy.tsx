"use client";

import dynamic from "next/dynamic";

export const WelcomeScratchOfferLazy = dynamic(
  () => import("@/components/offers/WelcomeScratchOffer").then((mod) => mod.WelcomeScratchOffer),
  { ssr: false },
);
