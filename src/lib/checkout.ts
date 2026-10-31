import type { Address } from "@/lib/types";
import { SHIPPING_QUOTE_CACHE_KEY } from "@/lib/checkout/shippingQuoteCache";

export { SHIPPING_QUOTE_CACHE_KEY };

export type ShippingAddress = {
  fullName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  country: string;
};

export type CheckoutItem = {
  productId: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  image: string;
};

export type CheckoutDraft = {
  id: string;
  number: string;
  items: CheckoutItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  address: ShippingAddress;
  paymentMethod: "razorpay" | "card";
  paymentId?: string;
  couponCode?: string;
  status: "Pending" | "Paid";
  createdAt: string;
  userId: string;
  deliveryEstimate?: string;
  demo?: boolean;
};

export function shippingToAccount(address: ShippingAddress, id = "checkout"): Address {
  return {
    id,
    label: "Delivery",
    name: address.fullName,
    line1: address.address1,
    line2: address.address2 || "",
    city: address.city,
    postal: address.postalCode,
    country: address.country || "India",
    phone: address.phone,
    isDefault: true,
  };
}

export const ADDRESS_STORAGE_KEY = "silkknot.checkout.address";
export const ORDER_STORAGE_KEY = "silkknot.checkout.order";
export const PAYMENT_STORAGE_KEY = "silkknot.checkout.payment";
export const TERMS_STORAGE_KEY = "silkknot.checkout.terms";
export const SHIPPING_SELECTION_KEY = "silkknot.checkout.shipping";
export const IDEMPOTENCY_STORAGE_KEY = "silkknot.checkout.idempotency";
export const CONTACT_STORAGE_KEY = "silkknot.checkout.contact";
const CHECKOUT_OWNER_KEY = "silkknot.checkout.owner";

const CHECKOUT_DRAFT_KEYS = [
  ADDRESS_STORAGE_KEY,
  ORDER_STORAGE_KEY,
  PAYMENT_STORAGE_KEY,
  TERMS_STORAGE_KEY,
  SHIPPING_SELECTION_KEY,
  IDEMPOTENCY_STORAGE_KEY,
  CONTACT_STORAGE_KEY,
  CHECKOUT_OWNER_KEY,
  SHIPPING_QUOTE_CACHE_KEY,
];

export function noteCheckoutOwner(userId: string | null) {
  sessionStorage.setItem(CHECKOUT_OWNER_KEY, userId || "guest");
}

export function retainCheckoutDraft(userId: string | null) {
  const next = userId || "guest";
  if (sessionStorage.getItem(CHECKOUT_OWNER_KEY) === next) return;
  for (const key of CHECKOUT_DRAFT_KEYS) sessionStorage.removeItem(key);
  localStorage.removeItem(ADDRESS_STORAGE_KEY);
}

export type CheckoutContact = {
  name: string;
  email: string;
  phone: string;
};

export type ShippingSelection = {
  quoteId: string;
  optionId: "standard" | "express";
  label: string;
  chargePaise: number;
  prepaidChargePaise?: number;
  codChargePaise?: number | null;
  estimateRupees?: number | null;
  codEstimateRupees?: number | null;
  shippingDiscountPaise: number;
  freeShippingPaise?: number;
  platformFeeListPaise?: number;
  platformFeePaise?: number;
  platformFeeWaiveAbovePaise?: number;
  platformFeeWaiveFirstOrder?: boolean;
  platformFeeFirstOrderEnabled?: boolean;
  subtotalPaise: number;
  discountPaise: number;
  amountPaise: number;
  expiresAt: string;
  codEligible: boolean;
  codFeePaise: number;
  availableCodFeePaise: number;
  estimate: string;
  serviceability: string;
};

export function deliveryChargeSplit(selection: ShippingSelection) {
  const prepaid = selection.prepaidChargePaise ?? selection.chargePaise;
  const shippingListPaise = prepaid === 0 && selection.shippingDiscountPaise > 0 ? selection.shippingDiscountPaise : prepaid;
  const payingCod = selection.prepaidChargePaise != null && selection.chargePaise !== selection.prepaidChargePaise && selection.codChargePaise != null;
  if (!payingCod) {
    return {
      payingCod: false,
      shippingPaise: selection.chargePaise === 0 ? shippingListPaise : selection.chargePaise,
      shippingFree: selection.chargePaise === 0,
      codPaise: 0,
    };
  }
  const codTotal = selection.codChargePaise ?? 0;
  const shippingPaise = Math.min(Math.max(shippingListPaise, 0), codTotal);
  return {
    payingCod: true,
    shippingPaise,
    shippingFree: false,
    codPaise: codTotal - shippingPaise,
  };
}

export function applyBagDiscount(selection: ShippingSelection, discountPaise: number, payment: "razorpay" | "cod", subtotalPaise = selection.subtotalPaise): ShippingSelection {
  const subtotal = Math.max(0, Math.round(subtotalPaise));
  const discount = Math.max(0, Math.min(Math.round(discountPaise), subtotal));
  const net = subtotal - discount;
  const threshold = selection.freeShippingPaise ?? 0;
  const prepaidQuoted = selection.prepaidChargePaise ?? selection.chargePaise;
  const list = prepaidQuoted === 0 && selection.shippingDiscountPaise > 0 ? selection.shippingDiscountPaise : prepaidQuoted;
  const free = payment !== "cod" && selection.optionId === "standard" && threshold > 0 && net >= threshold;
  const prepaidCharge = free ? 0 : list;
  const feeList = selection.platformFeeListPaise ?? selection.platformFeePaise ?? 0;
  let platformFeePaise = feeList;
  if (feeList > 0) {
    if (selection.platformFeeWaiveFirstOrder) platformFeePaise = 0;
    else if ((selection.platformFeeWaiveAbovePaise ?? 0) > 0 && net >= (selection.platformFeeWaiveAbovePaise ?? 0)) platformFeePaise = 0;
  }
  return shippingForPayment({
    ...selection,
    subtotalPaise: subtotal,
    discountPaise: discount,
    prepaidChargePaise: prepaidCharge,
    shippingDiscountPaise: free ? list : 0,
    platformFeeListPaise: feeList,
    platformFeePaise,
    label: selection.optionId === "express" ? selection.label : free ? "Free shipping" : "Standard delivery",
    chargePaise: prepaidCharge,
    amountPaise: net + prepaidCharge + platformFeePaise,
  }, payment);
}

export function shippingForPayment(selection: ShippingSelection, payment: "razorpay" | "cod"): ShippingSelection {
  const prepaid = selection.prepaidChargePaise ?? selection.chargePaise;
  const useCod = payment === "cod" && selection.codChargePaise != null;
  const chargePaise = useCod ? selection.codChargePaise! : prepaid;
  const platformFeePaise = selection.platformFeePaise ?? 0;
  return {
    ...selection,
    label: useCod && selection.label === "Free shipping" ? "Standard delivery" : selection.label,
    chargePaise,
    platformFeePaise,
    amountPaise: selection.subtotalPaise - selection.discountPaise + chargePaise + platformFeePaise,
  };
}

export function rememberPrepaidShipping() {
  try {
    const raw = sessionStorage.getItem(SHIPPING_SELECTION_KEY);
    if (raw) {
      const selection = JSON.parse(raw) as ShippingSelection;
      sessionStorage.setItem(SHIPPING_SELECTION_KEY, JSON.stringify(shippingForPayment(selection, "razorpay")));
    }
    sessionStorage.setItem(PAYMENT_STORAGE_KEY, "razorpay");
    window.dispatchEvent(new Event("silkknot-shipping"));
  } catch {
    sessionStorage.removeItem(SHIPPING_SELECTION_KEY);
  }
}
