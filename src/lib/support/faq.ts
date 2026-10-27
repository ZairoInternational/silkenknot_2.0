import type { SupportAction, SupportFaqEntry, SupportQuestionId } from "./types";

/** Allowlisted hrefs for chatbot link actions. */
export const SUPPORT_LINKS = {
  orders: "/account/orders",
  shop: "/shop",
  contact: "/contact",
  shipping: "/shipping",
  returns: "/returns",
  payments: "/payments",
  faq: "/faq",
  terms: "/terms",
  ingredients: "/ingredients",
  login: "/account/login",
} as const;

const backTopics: SupportAction = {
  id: "back_topics",
  label: "Back to topics",
  kind: "command",
  command: "back",
};

const viewOrders: SupportAction = {
  id: "view_orders",
  label: "View my orders",
  kind: "link",
  href: SUPPORT_LINKS.orders,
};

const contactSupport: SupportAction = {
  id: "contact_support",
  label: "Contact support",
  kind: "link",
  href: SUPPORT_LINKS.contact,
};

const readShipping: SupportAction = {
  id: "read_shipping",
  label: "Read shipping info",
  kind: "link",
  href: SUPPORT_LINKS.shipping,
};

const readReturns: SupportAction = {
  id: "read_returns",
  label: "Returns & refunds",
  kind: "link",
  href: SUPPORT_LINKS.returns,
};

const readPayments: SupportAction = {
  id: "read_payments",
  label: "Payment & pricing",
  kind: "link",
  href: SUPPORT_LINKS.payments,
};

const browseShop: SupportAction = {
  id: "browse_shop",
  label: "Browse all products",
  kind: "link",
  href: SUPPORT_LINKS.shop,
};

/**
 * Central FAQ catalogue. Answers are grounded in published Silken Knot policy pages
 * and FAQ copy (`sharedFaqs`, Shipping, Terms, Product returns). There is no
 * customer replacement workflow in this codebase — returns topic reflects final sale.
 * Copy speaks to the customer directly; avoid chatbot self-narration.
 */
export const SUPPORT_FAQ: SupportFaqEntry[] = [
  {
    id: "order_where",
    label: "Where is my order?",
    answer:
      "To see your Silken Knot order and the latest shipment update, sign in to your account. Your orders stay private to you.",
    policySource: "Order history via authenticated session; /account/orders",
    actions: [viewOrders, backTopics],
    flow: "orders",
  },
  {
    id: "shipping",
    label: "Shipping and delivery",
    answer:
      "Delivery timing depends on your PIN and the shipment. Your order page shows the latest estimate once it is available.",
    policySource: "src/components/content/Pages.tsx ShippingPage; src/lib/data.ts sharedFaqs",
    followUps: ["shipping_how_long", "shipping_track", "shipping_delayed"],
    actions: [readShipping, viewOrders, backTopics],
  },
  {
    id: "shipping_how_long",
    label: "How long does delivery take?",
    answer:
      "At checkout you will see the delivery time for your PIN, and a faster option when it is available. Delivery is free on eligible orders of ₹999 and above; below that, the delivery price for your PIN appears at checkout. We currently deliver within India.",
    policySource: "sharedFaqs delivery time + free shipping; ShippingPage; sharedFaqs outside India",
    actions: [readShipping, backTopics],
  },
  {
    id: "shipping_track",
    label: "How can I track my order?",
    answer:
      "Sign in and open your order for the latest shipment status. Once a waybill is ready, tracking updates show on that page.",
    policySource: "OrderDetails + POST /api/checkout/tracking",
    actions: [viewOrders, backTopics],
    flow: "orders",
  },
  {
    id: "shipping_delayed",
    label: "My delivery is delayed",
    answer:
      "Estimates depend on your PIN and courier updates. Check your order for the current status. If updates have stalled or the shipment needs attention, contact support with your order number.",
    policySource: "ShippingPage (PIN-based ETA); no guaranteed SLA beyond checkout estimate",
    actions: [viewOrders, contactSupport, readShipping, backTopics],
    flow: "orders",
  },
  {
    id: "returns",
    label: "Returns and replacements",
    answer:
      "All products are final sale for hygiene and safety reasons. You can cancel an order before it is dispatched from your order page. Refund returns and change-of-mind returns are not offered. If a line cannot be fulfilled, that line is refunded.",
    policySource: "sharedFaqs Can I return; /returns policy; TermsPage fulfil/refund line",
    followUps: ["returns_eligible", "returns_how_cancel", "returns_damaged"],
    actions: [viewOrders, readReturns, { id: "read_faq", label: "Read FAQ", kind: "link", href: SUPPORT_LINKS.faq }, backTopics],
  },
  {
    id: "returns_eligible",
    label: "What can I cancel or return?",
    answer:
      "You can cancel an order that has not been dispatched yet, from your order page. After dispatch, products are final sale. There is no self-service replacement request in your account — if something arrives damaged or incorrect, contact support.",
    policySource: "sharedFaqs + customerCanCancel (pre-dispatch only); /returns",
    actions: [viewOrders, readReturns, contactSupport, backTopics],
  },
  {
    id: "returns_how_cancel",
    label: "How do I cancel an order?",
    answer:
      "Open your order and cancel it before it is dispatched. If an online payment was already captured, your order page will show whether a refund is pending.",
    policySource: "customerCanCancel; POST /api/checkout/cancel; paymentState refund_pending",
    actions: [viewOrders, backTopics],
    flow: "orders",
  },
  {
    id: "returns_damaged",
    label: "My order arrived damaged or incorrect",
    answer:
      "Sorry about that. Under our final-sale policy there is no automated replacement form. Contact support with your order number and a short description so the team can help you.",
    policySource: "Final sale policy; ContactForm /contact — no replacement workflow",
    actions: [contactSupport, viewOrders, backTopics],
  },
  {
    id: "payments",
    label: "Payments and refunds",
    answer:
      "For payment or refund questions on a specific order, sign in and open that order. The status on your order is what we can confirm.",
    policySource: "PaymentState on orders; Terms/Privacy payment window",
    followUps: ["payments_failed", "payments_deducted", "payments_methods", "payments_refund"],
    actions: [viewOrders, backTopics],
  },
  {
    id: "payments_failed",
    label: "My payment failed",
    answer:
      "When a payment fails, your order usually shows as payment pending or cancelled, and nothing ships until payment succeeds. Check your order status before trying again — avoid paying twice while a payment is still pending.",
    policySource: "confirmPayment failed path; Payment pending UX in Screens.tsx",
    actions: [viewOrders, contactSupport, backTopics],
    flow: "payment_orders",
  },
  {
    id: "payments_deducted",
    label: "Money was deducted but my order is missing",
    answer:
      "Bank and UPI confirmations can take a little time. Sign in and check your order history for a matching order and payment status. If nothing appears after a while, contact support with the payment reference from your bank — and wait before placing another order for the same items.",
    policySource: "verify/webhook reconciliation; Privacy payment window",
    actions: [viewOrders, contactSupport, backTopics],
    flow: "payment_orders",
  },
  {
    id: "payments_methods",
    label: "What payment methods are available?",
    answer:
      "At checkout you can pay online with UPI, cards, and wallets in a secure payment window, or choose cash on delivery when it is available for your PIN. Silken Knot does not store your full card number, CVV, or UPI PIN.",
    policySource: "checkout/review payment options; /payments; PrivacyPage",
    actions: [readPayments, backTopics],
  },
  {
    id: "payments_refund",
    label: "Check refund status",
    answer:
      "Refund updates appear on your order when a refund is pending, partial, or complete. Sign in and open the order to see the current payment status — only what is shown there is confirmed.",
    policySource: "paymentState refund_pending|partially_refunded|refunded; admin/customer cancel paths",
    actions: [viewOrders, contactSupport, backTopics],
    flow: "payment_orders",
  },
  {
    id: "products",
    label: "Products and ingredients",
    answer: "Looking for products, ingredients, or how to use something? Pick a topic below, or browse the shop.",
    policySource: "Product catalogue fields; IngredientsPage editorial",
    followUps: ["products_browse", "products_categories", "products_how_to_use", "products_ingredients"],
    actions: [browseShop, backTopics],
  },
  {
    id: "products_browse",
    label: "Browse all products",
    answer: "The full Silken Knot collection is in the shop.",
    policySource: "Storefront /shop catalogue",
    actions: [browseShop, backTopics],
  },
  {
    id: "products_categories",
    label: "Explore product categories",
    answer: "The shop groups body care, bath & soap, aromatherapy, and lifestyle. Open the shop to filter by category.",
    policySource: "CategoryId union + /shop filters",
    actions: [
      browseShop,
      { id: "browse_categories", label: "Open shop", kind: "link", href: SUPPORT_LINKS.shop },
      backTopics,
    ],
  },
  {
    id: "products_how_to_use",
    label: "How do I use a product?",
    answer: "Pick a product below to see the usage steps listed for that item on its product page.",
    policySource: "Product.howToUse + productShowsSection",
    actions: [backTopics],
    flow: "product_pick_use",
  },
  {
    id: "products_ingredients",
    label: "View product ingredients",
    answer:
      "Pick a product below for its ingredient list. For a general look at how formulas are built, open the formulas overview. This chat does not give medical, allergy, or treatment advice.",
    policySource: "Product.ingredients; IngredientsPage",
    actions: [
      { id: "browse_ingredients_page", label: "Formulas overview", kind: "link", href: SUPPORT_LINKS.ingredients },
      backTopics,
    ],
    flow: "product_pick_ingredients",
  },
  {
    id: "contact",
    label: "Contact support",
    answer:
      "Need more help with an order or a product? Use the contact form. Please do not share OTPs, passwords, or full card details.",
    policySource: "/contact ContactForm; TermsPage do not share PIN/OTP",
    actions: [contactSupport, viewOrders, backTopics],
  },
];

export const HOME_TOPICS: SupportQuestionId[] = [
  "order_where",
  "shipping",
  "returns",
  "payments",
  "products",
  "contact",
];

export function faqById(id: SupportQuestionId): SupportFaqEntry | undefined {
  return SUPPORT_FAQ.find((entry) => entry.id === id);
}

export function homeTopicActions(): SupportAction[] {
  return HOME_TOPICS.map((id) => {
    const entry = faqById(id)!;
    return {
      id,
      label: entry.label,
      kind: "question" as const,
      questionId: id,
    };
  });
}

export const WELCOME_TEXT =
  "Hi, I’m Ziva — Silken Knot’s care companion. Tap a topic below for quick answers. For your own orders, you will need to sign in.";
