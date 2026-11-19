"use client";

import type { ComponentType } from "react";
import {
  Droplets,
  Flame,
  FlaskConical,
  Flower2,
  Leaf,
  ListChecks,
  PackageCheck,
  Rabbit,
  Recycle,
  type LucideProps,
} from "lucide-react";
import { MadeInIndiaHands } from "@/components/icons/MadeInIndiaHands";
import {
  enabledProductClaims,
  type ProductClaimId,
} from "@/lib/product-claims";

type ClaimIcon = ComponentType<LucideProps>;

export const PRODUCT_CLAIM_ICONS: Record<ProductClaimId, ClaimIcon> = {
  "plant-based": Leaf,
  "cruelty-free": Rabbit,
  "paraben-free": FlaskConical,
  "sulfate-free": Droplets,
  "paraffin-free": Flame,
  "microplastic-free": Recycle,
  "made-in-india": MadeInIndiaHands,
  "small-batch": PackageCheck,
  "simple-formulas": ListChecks,
  "quiet-scents": Flower2,
};

type ClaimsProduct = { claims?: readonly string[] | null };

export function ProductClaimsStrip({ product }: { product: ClaimsProduct }) {
  const claims = enabledProductClaims(product);
  if (!claims.length) return null;

  return (
    <section className="overflow-hidden border-y border-[#efefed] bg-[#ffffff]">
      <div className="py-6 md:hidden" aria-label="Product formulas">
        <ul className="silk-marquee flex w-max items-center">
          {[0, 1].map((copy) => (
            <li key={copy} className="flex items-center" aria-hidden={copy === 1}>
              {claims.map((claim) => {
                const Icon = PRODUCT_CLAIM_ICONS[claim.id];
                const iconSize = claim.id === "made-in-india" ? 20 : 18;
                return (
                  <span
                    key={claim.id}
                    className="mx-8 inline-flex items-center gap-2 text-base font-medium text-[#2c2926]"
                  >
                    <Icon size={iconSize} strokeWidth={1.4} className="text-[#3A6B75]" aria-hidden />
                    {claim.label}
                  </span>
                );
              })}
            </li>
          ))}
        </ul>
      </div>
      <ul className="mx-auto hidden w-full max-w-[1200px] items-start px-4 py-10 md:flex md:px-8">
        {claims.map((claim) => {
          const Icon = PRODUCT_CLAIM_ICONS[claim.id];
          const iconSize = claim.id === "made-in-india" ? 26 : 22;
          return (
            <li key={claim.id} className="min-w-0 flex-1 text-center">
              <span className="mx-auto grid size-10 place-items-center text-[#3A6B75]">
                <Icon size={iconSize} strokeWidth={1.3} aria-hidden />
              </span>
              <p className="mt-3 text-base font-medium">{claim.label}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
