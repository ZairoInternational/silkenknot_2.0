import type { PlatformFeePolicy, PlatformFeeResult } from "@/lib/payments/platformFee";
import { resolvePlatformFee } from "@/lib/payments/platformFee";

export type PlatformFeeDisplay = {
  enabled: boolean;
  feePaise: number;
  waiveAbovePaise: number;
  waiveFirstOrder: boolean;
  /** True when this shopper has no prior store order (first-order waiver may apply). */
  isFirstOrder: boolean;
};

export const DEFAULT_PLATFORM_FEE_DISPLAY: PlatformFeeDisplay = {
  enabled: true,
  feePaise: 3000,
  waiveAbovePaise: 100000,
  waiveFirstOrder: false,
  isFirstOrder: true,
};

export function platformFeeDisplayFromPolicy(
  policy: PlatformFeePolicy,
  isFirstOrder: boolean,
): PlatformFeeDisplay {
  return {
    enabled: policy.enabled,
    feePaise: policy.feePaise,
    waiveAbovePaise: policy.waiveAbovePaise,
    waiveFirstOrder: policy.waiveFirstOrder,
    isFirstOrder,
  };
}

export function resolvePlatformFeeDisplay(
  display: PlatformFeeDisplay,
  netPaise: number,
): PlatformFeeResult {
  return resolvePlatformFee(
    {
      enabled: display.enabled,
      feePaise: display.feePaise,
      waiveAbovePaise: display.waiveAbovePaise,
      waiveFirstOrder: display.waiveFirstOrder,
    },
    { netPaise, isFirstOrder: display.isFirstOrder },
  );
}
