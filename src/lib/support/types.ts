/** Support chatbot types. Action IDs are allowlisted; clients never submit arbitrary URLs. */

export type SupportQuestionId =
  | "home"
  | "order_where"
  | "shipping"
  | "shipping_how_long"
  | "shipping_track"
  | "shipping_delayed"
  | "returns"
  | "returns_eligible"
  | "returns_how_cancel"
  | "returns_damaged"
  | "payments"
  | "payments_failed"
  | "payments_deducted"
  | "payments_methods"
  | "payments_refund"
  | "products"
  | "products_browse"
  | "products_categories"
  | "products_how_to_use"
  | "products_ingredients"
  | "contact";

export type SupportActionId =
  | "back_topics"
  | "view_orders"
  | "track_order"
  | "login"
  | "contact_support"
  | "read_shipping"
  | "read_faq"
  | "read_terms"
  | "browse_shop"
  | "browse_categories"
  | "browse_ingredients_page"
  | "refresh_order"
  | "view_order_detail"
  | "cancel_guidance"
  | "select_order"
  | "select_product"
  | "retry";

export type SupportActionKind = "question" | "link" | "command" | "select";

export type SupportAction = {
  id: SupportActionId | SupportQuestionId;
  label: string;
  kind: SupportActionKind;
  /** Allowlisted internal path only — never client-supplied. */
  href?: string;
  questionId?: SupportQuestionId;
  command?: "back" | "refresh" | "retry" | "login" | "select_order" | "select_product";
  orderId?: string;
  productId?: string;
};

export type SupportFaqEntry = {
  id: SupportQuestionId;
  label: string;
  answer: string;
  /** Policy / content source for maintainers and tests. */
  policySource: string;
  followUps?: SupportQuestionId[];
  actions?: SupportAction[];
  /** Starts an authenticated dynamic flow after the static answer. */
  flow?: "orders" | "payment_orders" | "product_pick_use" | "product_pick_ingredients";
};

export type SupportOrderSummary = {
  id: string;
  number: string;
  createdAt: string;
  statusLabel: string;
  paymentLabel: string;
  total: number;
  itemCount: number;
};

export type SupportOrderDetail = SupportOrderSummary & {
  story: string;
  shipmentLabel: string | null;
  carrier: string | null;
  awb: string | null;
  estimate: string | null;
  canCancel: boolean;
  canRefreshTracking: boolean;
  trackingUrl: string | null;
  detailPath: string;
  paymentState: string | null;
  paymentMethod: string | null;
};

export type SupportProductSummary = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  hasIngredients: boolean;
  hasHowToUse: boolean;
};

export type SupportProductDetail = SupportProductSummary & {
  ingredients: string[] | null;
  howToUse: string[] | null;
  href: string;
};

export type ChatRole = "bot" | "user" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  actions?: SupportAction[];
  order?: SupportOrderDetail;
  orders?: SupportOrderSummary[];
  products?: SupportProductSummary[];
  product?: SupportProductDetail;
  loading?: boolean;
  error?: boolean;
};
