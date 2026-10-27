export type CategoryId = "body-care" | "bath-soap" | "aromatherapy" | "lifestyle";

export type Variant = {
  id: string;
  label: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
};

export type Review = {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  helpful?: number;
};

export type Faq = {
  question: string;
  answer: string;
};

export type ProductDetailSection = "description" | "ingredients" | "howToUse" | "benefits";

export type Product = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  type: string;
  scent: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  shortDescription: string;
  description: string;
  benefits: string[];
  ingredients: string[];
  howToUse: string[];
  /** When false, hide on storefront. Undefined = legacy (show if content exists). */
  showDescription?: boolean;
  showIngredients?: boolean;
  showHowToUse?: boolean;
  showBenefits?: boolean;
  images: string[];
  variants: Variant[];
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  active: boolean;
  weightGrams?: number;
  createdAt: string;
  reviews: Review[];
  faqs: Faq[];
};

function sectionHasContent(product: Product, section: ProductDetailSection) {
  if (section === "description") return Boolean(product.description?.trim());
  if (section === "ingredients") return product.ingredients.some((item) => item.trim());
  if (section === "howToUse") return product.howToUse.some((item) => item.trim());
  return product.benefits.some((item) => item.trim());
}

/** Storefront visibility for optional product detail blocks. */
export function productShowsSection(product: Product, section: ProductDetailSection) {
  const flag =
    section === "description"
      ? product.showDescription
      : section === "ingredients"
        ? product.showIngredients
        : section === "howToUse"
          ? product.showHowToUse
          : product.showBenefits;
  if (flag === false) return false;
  if (!sectionHasContent(product, section)) return false;
  return flag === true || flag === undefined;
}

export type Category = {
  id: string;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  order: number;
};

export type CartItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  categoryId: string;
  variantLabel: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
};

export type Address = {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  postal: string;
  country: string;
  phone: string;
  isDefault: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "customer" | "admin";
  addresses: Address[];
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  nameSetAt?: string | null;
};

export type DeliveryMethod = "standard" | "express";
export type PaymentMethod = "card" | "upi" | "cod";
export type ShipmentState =
  | "not_created"
  | "pending"
  | "booked"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "cancelled"
  | "rto_initiated"
  | "rto_in_transit"
  | "rto_delivered"
  | "return_initiated"
  | "returned"
  | "exception"
  | "unknown";

export type TrackingEvent = {
  at: string;
  state: ShipmentState;
  providerStatus: string;
  location?: string;
  instructions?: string;
};

export type ShipmentRecord = {
  provider: "delhivery" | "manual" | "mock";
  state: ShipmentState;
  method: DeliveryMethod;
  awb?: string;
  reference?: string;
  attempts: number;
  lastError?: string;
  packageData: "missing" | "store_default_weight" | "product_weights";
  weightGrams: number;
  events: TrackingEvent[];
  lastTrackingAt?: string;
  bookingRequestedAt?: string;
  uncertain?: boolean;
  pickupDate?: string;
  estimate?: string;
  estimateSource?: "store_policy" | "delhivery_tat" | "none";
  test?: boolean;
};
export type PaymentState =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "cancelled"
  | "refund_pending"
  | "partially_refunded"
  | "refunded";
export type OrderLifecycle = "pending_payment" | "confirmed" | "processing" | "cancelled" | "completed";
export type InventoryState = "not_reserved" | "reserved" | "committed" | "released";
export type FulfillmentState =
  | "unfulfilled"
  | "packed"
  | "shipped"
  | "delivered"
  | "delivery_failed"
  | "return_to_origin";
export type OrderStatus =
  | "pending_payment"
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  email: string;
  customerName: string;
  phone: string;
  userId?: string;
  address: Address;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode?: string;
  paymentId?: string;
  amountPaise?: number;
  currency?: "INR";
  paymentState?: PaymentState;
  orderState?: OrderLifecycle;
  inventoryState?: InventoryState;
  fulfillmentState?: FulfillmentState;
  razorpayOrderId?: string;
  providerMethod?: string;
  reserveExpiresAt?: string;
  consistency?: "transaction" | "compensating";
  codFee?: number;
  platformFee?: number;
  shippingLabel?: string;
  shippingQuoteId?: string;
  shipment?: ShipmentRecord;
  codCollection?: "due" | "not_applicable";
};

export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  scope: "order" | "product" | "category";
  productId?: string;
  categoryId?: string;
  active: boolean;
  label: string;
  maxRedemptions?: number;
  redeemed?: number;
};

export type JournalEntry = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string;
  paragraphs: string[];
};

export type Result = { ok: true; message?: string } | { ok: false; message: string };
