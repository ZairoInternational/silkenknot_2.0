/** GA4 ecommerce item fields pushed through the GTM dataLayer. */
export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

export type ViewItemPayload = {
  currency: "INR";
  value: number;
  items: AnalyticsItem[];
};

export type SearchPayload = {
  search_term: string;
};

export type AddToCartPayload = {
  currency: "INR";
  value: number;
  items: AnalyticsItem[];
};

export type AddToWishlistPayload = {
  currency: "INR";
  value: number;
  items: AnalyticsItem[];
};

export type BeginCheckoutPayload = {
  currency: "INR";
  value: number;
  items: AnalyticsItem[];
};

export type PurchasePayload = {
  transaction_id: string;
  currency: "INR";
  value: number;
  items: AnalyticsItem[];
  shipping?: number;
  tax?: number;
};

export type AnalyticsEventMap = {
  view_item: ViewItemPayload;
  search: SearchPayload;
  add_to_cart: AddToCartPayload;
  add_to_wishlist: AddToWishlistPayload;
  begin_checkout: BeginCheckoutPayload;
  purchase: PurchasePayload;
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
