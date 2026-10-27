"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, RotateCcw, ChevronLeft, Sparkles } from "lucide-react";
import { csrfHeaders } from "@/lib/auth/browser";
import { accountBarPath } from "@/components/account/MobileAccountBar";
import { useStore } from "@/lib/store";
import { faqById } from "@/lib/support/faq";
import { consumeSupportIntent, saveSupportIntent } from "@/lib/support/intent";
import {
  backTopicsMessage,
  emptyOrdersMessage,
  errorMessage,
  faqResponse,
  loadingMessage,
  nextMessageId,
  signInPrompt,
  userEcho,
  welcomeMessage,
} from "@/lib/support/response-builder";
import type {
  ChatMessage,
  SupportAction,
  SupportOrderDetail,
  SupportOrderSummary,
  SupportProductDetail,
  SupportProductSummary,
  SupportQuestionId,
} from "@/lib/support/types";
import { ChatMessageView } from "./ChatMessage";

type ProductSection = "ingredients" | "howToUse";

function orderActions(order: SupportOrderDetail, paymentFocus = false): SupportAction[] {
  const actions: SupportAction[] = [
    {
      id: "view_order_detail",
      label: "View order details",
      kind: "link",
      href: order.detailPath,
    },
  ];
  if (order.canRefreshTracking) {
    actions.push({
      id: "refresh_order",
      label: "Refresh status",
      kind: "command",
      command: "refresh",
      orderId: order.id,
    });
  }
  if (order.trackingUrl) {
    actions.push({
      id: "track_order",
      label: "Carrier tracking",
      kind: "link",
      href: order.trackingUrl,
    });
  }
  actions.push({
    id: "read_shipping",
    label: "Delivery information",
    kind: "link",
    href: "/shipping",
  });
  if (order.canCancel) {
    actions.push({
      id: "cancel_guidance",
      label: "Cancel this order",
      kind: "link",
      href: order.detailPath,
    });
  }
  if (paymentFocus || order.paymentLabel.toLowerCase().includes("refund") || order.paymentLabel.toLowerCase().includes("pending") || order.paymentLabel.toLowerCase().includes("failed")) {
    actions.push({
      id: "contact_support",
      label: "Contact support",
      kind: "link",
      href: "/contact",
    });
  }
  actions.push({ id: "back_topics", label: "Back to topics", kind: "command", command: "back" });
  return actions;
}

export function SupportChat() {
  const pathname = usePathname();
  const store = useStore();
  const signedIn = Boolean(store.currentUser);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [welcomeMessage()]);
  const [busy, setBusy] = useState(false);
  const [lastRetry, setLastRetry] = useState<null | (() => Promise<void>)>(null);
  const [productSection, setProductSection] = useState<ProductSection>("ingredients");
  const [paymentFocus, setPaymentFocus] = useState(false);
  const [mobileNavShowing, setMobileNavShowing] = useState(false);
  const lastQuestionRef = useRef<SupportQuestionId>("order_where");
  const announceRef = useRef("");

  const hideOnPath =
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin") ||
    pathname === "/account/login";

  useEffect(() => {
    const sync = () => {
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      if (desktop || !accountBarPath(pathname)) {
        setMobileNavShowing(false);
        return;
      }
      setMobileNavShowing(document.documentElement.dataset.mobileNav === "show");
    };
    sync();
    const mq = window.matchMedia("(min-width: 768px)");
    mq.addEventListener("change", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mobile-nav"] });
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener("change", sync);
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [pathname]);

  const scrollToEnd = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (open) scrollToEnd();
  }, [messages, open, scrollToEnd]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open || !signedIn) return;
    const intent = consumeSupportIntent();
    if (!intent) return;
    void runQuestion(intent);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume once when panel opens signed-in
  }, [open, signedIn]);

  function push(...next: ChatMessage[]) {
    setMessages((prev) => [...prev, ...next]);
    const lastBot = [...next].reverse().find((item) => item.role === "bot");
    if (lastBot) announceRef.current = lastBot.text;
  }

  function replaceLoading(next: ChatMessage) {
    setMessages((prev) => {
      const copy = [...prev];
      let idx = -1;
      for (let i = copy.length - 1; i >= 0; i -= 1) {
        if (copy[i].loading) {
          idx = i;
          break;
        }
      }
      if (idx >= 0) copy[idx] = next;
      else copy.push(next);
      return copy;
    });
    announceRef.current = next.text;
  }

  async function fetchOrders(): Promise<{ orders: SupportOrderSummary[]; hasMore: boolean } | { error: string; code?: string }> {
    const res = await fetch("/api/support/orders", { credentials: "same-origin" });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) return { error: body.error || "Sign in required.", code: "unauthenticated" };
    if (!res.ok) return { error: body.error || "Orders could not be loaded." };
    return { orders: body.orders || [], hasMore: Boolean(body.hasMore) };
  }

  async function fetchOrder(orderId: string): Promise<{ order: SupportOrderDetail; paymentNote?: string } | { error: string; code?: string }> {
    const res = await fetch(`/api/support/orders/${encodeURIComponent(orderId)}`, { credentials: "same-origin" });
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) return { error: body.error || "Sign in required.", code: "unauthenticated" };
    if (!res.ok) return { error: body.error || "Order could not be loaded." };
    return { order: body.order, paymentNote: body.paymentNote };
  }

  async function refreshOrder(
    orderId: string,
  ): Promise<{ order: SupportOrderDetail; paymentNote?: string; warning?: string } | { error: string }> {
    const res = await fetch(`/api/support/orders/${encodeURIComponent(orderId)}/refresh`, {
      method: "POST",
      credentials: "same-origin",
      headers: csrfHeaders(true),
      body: "{}",
    });
    const body = await res.json().catch(() => ({}));
    if (!body.order) return { error: body.error || "Tracking could not be refreshed." };
    return {
      order: body.order as SupportOrderDetail,
      paymentNote: body.paymentNote as string | undefined,
      warning: res.ok ? undefined : (body.error as string | undefined),
    };
  }

  async function fetchProducts(): Promise<{ products: SupportProductSummary[] } | { error: string }> {
    const res = await fetch("/api/support/products", { credentials: "same-origin" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error || "Products could not be loaded." };
    return { products: body.products || [] };
  }

  async function fetchProduct(productId: string, section: ProductSection): Promise<{ product: SupportProductDetail; note?: string } | { error: string }> {
    const res = await fetch(`/api/support/products/${encodeURIComponent(productId)}?section=${section}`, { credentials: "same-origin" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body.error || "Product could not be loaded." };
    return { product: body.product, note: body.note };
  }

  async function showOrderList(opts: { paymentFocus?: boolean } = {}) {
    const loadId = loadingMessage(opts.paymentFocus ? "Fetching payment status…" : "Fetching your recent orders…");
    push(loadId);
    setBusy(true);
    const retry = async () => {
      setMessages((prev) => prev.filter((item) => !item.error));
      await showOrderList(opts);
    };
    setLastRetry(() => retry);
    try {
      const result = await fetchOrders();
      if ("error" in result) {
        if (result.code === "unauthenticated") {
          saveSupportIntent(opts.paymentFocus ? "payments_refund" : "order_where");
          replaceLoading(signInPrompt(pathname || "/shop"));
          return;
        }
        replaceLoading(errorMessage(result.error));
        return;
      }
      if (!result.orders.length) {
        replaceLoading(emptyOrdersMessage());
        return;
      }
      const actions: SupportAction[] = [
        { id: "view_orders", label: "View all orders", kind: "link", href: "/account/orders" },
        { id: "back_topics", label: "Back to topics", kind: "command", command: "back" },
      ];
      replaceLoading({
        id: nextMessageId("ol"),
        role: "bot",
        text: opts.paymentFocus
          ? "Tap an order to see its payment and refund status."
          : "Here are your recent orders. Tap one for the latest status.",
        orders: result.orders,
        actions,
      });
    } catch {
      replaceLoading(errorMessage("Your orders could not be loaded right now."));
    } finally {
      setBusy(false);
    }
  }

  async function showOrderDetail(orderId: string, opts: { paymentFocus?: boolean; refreshed?: boolean } = {}) {
    push(loadingMessage(opts.refreshed ? "Updating status…" : "Opening your order…"));
    setBusy(true);
    const retry = async () => {
      setMessages((prev) => prev.filter((item) => !item.error));
      await showOrderDetail(orderId, opts);
    };
    setLastRetry(() => retry);
    try {
      const result = opts.refreshed ? await refreshOrder(orderId) : await fetchOrder(orderId);
      if ("error" in result) {
        if ("code" in result && result.code === "unauthenticated") {
          replaceLoading(signInPrompt(pathname || "/shop"));
          return;
        }
        replaceLoading(errorMessage(result.error));
        return;
      }
      const lines = [result.order.story];
      if ((opts.paymentFocus || paymentFocus) && typeof result.paymentNote === "string") {
        lines.push(result.paymentNote);
      }
      if ("warning" in result && typeof result.warning === "string") {
        lines.push(result.warning);
      }
      replaceLoading({
        id: nextMessageId("od"),
        role: "bot",
        text: lines.join("\n\n"),
        order: result.order,
        actions: orderActions(result.order, opts.paymentFocus || paymentFocus),
      });
    } catch {
      replaceLoading(errorMessage("This order could not be loaded right now."));
    } finally {
      setBusy(false);
    }
  }

  async function showProductPicker(section: ProductSection) {
    setProductSection(section);
    push(loadingMessage("Fetching products…"));
    setBusy(true);
    const retry = async () => {
      setMessages((prev) => prev.filter((item) => !item.error));
      await showProductPicker(section);
    };
    setLastRetry(() => retry);
    try {
      const result = await fetchProducts();
      if ("error" in result) {
        replaceLoading(errorMessage(result.error));
        return;
      }
      const filtered =
        section === "ingredients"
          ? result.products.filter((item) => item.hasIngredients)
          : result.products.filter((item) => item.hasHowToUse);
      if (!filtered.length) {
        replaceLoading({
          id: nextMessageId("pe"),
          role: "bot",
          text:
            section === "ingredients"
              ? "Ingredient lists are not available here right now. You can browse the shop or the formulas overview."
              : "Usage steps are not available here right now. You can browse the shop for product pages.",
          actions: [
            { id: "browse_shop", label: "Browse shop", kind: "link", href: "/shop" },
            { id: "back_topics", label: "Back to topics", kind: "command", command: "back" },
          ],
        });
        return;
      }
      replaceLoading({
        id: nextMessageId("pp"),
        role: "bot",
        text: section === "ingredients" ? "Tap a product to see its ingredients." : "Tap a product to see how to use it.",
        products: filtered,
        actions: [{ id: "back_topics", label: "Back to topics", kind: "command", command: "back" }],
      });
    } catch {
      replaceLoading(errorMessage("Products could not be loaded right now."));
    } finally {
      setBusy(false);
    }
  }

  async function showProductDetail(productId: string) {
    push(loadingMessage("Opening product details…"));
    setBusy(true);
    try {
      const result = await fetchProduct(productId, productSection);
      if ("error" in result) {
        replaceLoading(errorMessage(result.error));
        return;
      }
      replaceLoading({
        id: nextMessageId("pd"),
        role: "bot",
        text: result.note || (productSection === "ingredients" ? "Ingredients for this product:" : "How to use this product:"),
        product: result.product,
        actions: [
          { id: "back_topics", label: "Back to topics", kind: "command", command: "back" },
          {
            id: productSection === "ingredients" ? "products_ingredients" : "products_how_to_use",
            label: "Another product",
            kind: "question",
            questionId: productSection === "ingredients" ? "products_ingredients" : "products_how_to_use",
          },
        ],
      });
    } catch {
      replaceLoading(errorMessage("Product details could not be loaded right now."));
    } finally {
      setBusy(false);
    }
  }

  async function runQuestion(questionId: SupportQuestionId, opts: { skipEcho?: boolean } = {}) {
    const entry = faqById(questionId);
    if (!entry) return;
    lastQuestionRef.current = questionId;
    if (!opts.skipEcho) push(userEcho(entry.label));
    setPaymentFocus(entry.flow === "payment_orders");

    if (entry.flow === "orders" || entry.flow === "payment_orders") {
      if (!signedIn) {
        const response = faqResponse(questionId);
        if (response) push(response);
        saveSupportIntent(questionId);
        push(signInPrompt(pathname || "/shop"));
        return;
      }
      await showOrderList({ paymentFocus: entry.flow === "payment_orders" });
      return;
    }

    const response = faqResponse(questionId);
    if (response) push(response);
    if (entry.flow === "product_pick_use") {
      await showProductPicker("howToUse");
      return;
    }
    if (entry.flow === "product_pick_ingredients") {
      await showProductPicker("ingredients");
    }
  }

  async function onAction(action: SupportAction) {
    if (busy) return;

    if (action.command === "back") {
      push(userEcho(action.label));
      push(backTopicsMessage());
      setLastRetry(null);
      return;
    }
    if (action.command === "retry" && lastRetry) {
      push(userEcho(action.label));
      await lastRetry();
      return;
    }
    if (action.command === "login") {
      saveSupportIntent(lastQuestionRef.current);
      return;
    }
    if (action.command === "refresh" && action.orderId) {
      push(userEcho(action.label));
      await showOrderDetail(action.orderId, { refreshed: true, paymentFocus });
      return;
    }
    if (action.command === "select_order" && action.orderId) {
      push(userEcho(`Order ${action.label}`));
      await showOrderDetail(action.orderId, { paymentFocus });
      return;
    }
    if (action.command === "select_product" && action.productId) {
      push(userEcho(action.label));
      await showProductDetail(action.productId);
      return;
    }
    if (action.kind === "question" && action.questionId) {
      await runQuestion(action.questionId);
      return;
    }
    if (action.kind === "link") {
      /* navigation handled by <a> */
    }
  }

  function restart() {
    setMessages([welcomeMessage()]);
    setLastRetry(null);
    setBusy(false);
    setPaymentFocus(false);
  }

  function closePanel() {
    setOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  }

  function openPanel() {
    setOpen(true);
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    });
  }

  if (hideOnPath) return null;

  // Hide the floating button while the mobile bottom nav is on screen; show it again when the nav scrolls away.
  const showLauncher = !mobileNavShowing;
  const bottomClass = mobileNavShowing
    ? "bottom-[calc(3.75rem+env(safe-area-inset-bottom))]"
    : "bottom-[max(1rem,env(safe-area-inset-bottom))]";

  return (
    <div className={`pointer-events-none fixed right-4 z-[180] flex flex-col items-end transition-[bottom] duration-200 md:right-6 md:bottom-6 ${bottomClass}`}>
      <div aria-live="polite" className="sr-only">
        {announceRef.current}
      </div>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-auto mb-3 flex h-[min(32rem,calc(100dvh-7rem))] w-[min(22.5rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#e3dbd1] bg-[#F7F3EE] shadow-[0_12px_40px_rgba(44,41,38,0.12)]"
        >
          <header className="flex items-center gap-2 border-b border-[#e3dbd1] bg-[#fffcf8] px-3 py-2.5">
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full text-[#2c2926] hover:bg-[#F7F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
              aria-label="Back to topics"
              disabled={busy}
              onClick={() => {
                push(backTopicsMessage());
              }}
            >
              <ChevronLeft size={18} strokeWidth={1.6} />
            </button>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="truncate text-sm font-medium text-[#2c2926]">
                Ziva
              </h2>
              <p className="truncate text-[11px] text-[#8a7350]">Silken Knot care</p>
            </div>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full text-[#2c2926] hover:bg-[#F7F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
              aria-label="Restart conversation"
              onClick={restart}
            >
              <RotateCcw size={16} strokeWidth={1.6} />
            </button>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full text-[#2c2926] hover:bg-[#F7F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7350]"
              aria-label="Close chat"
              onClick={closePanel}
            >
              <X size={18} strokeWidth={1.6} />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3" tabIndex={0}>
            {messages.map((message) => (
              <ChatMessageView key={message.id} message={message} busy={busy} onAction={onAction} />
            ))}
          </div>

          <footer className="border-t border-[#e3dbd1] bg-[#fffcf8] px-3 py-2 text-center text-[10px] uppercase tracking-[0.14em] text-[#8a7350]">
            Ziva · Silken Knot
          </footer>
        </div>
      ) : null}

      {showLauncher ? (
        <button
          ref={launcherRef}
          type="button"
          className="support-chat-launcher pointer-events-auto relative ml-auto flex size-14 items-center justify-center rounded-full bg-[#3e5a72] text-[#f6f3ee] shadow-[0_10px_28px_rgba(62,90,114,0.35)] transition hover:bg-[#334b60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3e5a72] motion-safe:animate-[support-chat-pulse_2.8s_ease-in-out_infinite]"
          aria-label={open ? "Close chat with Ziva" : "Chat with Ziva"}
          aria-expanded={open}
          aria-controls={open ? titleId : undefined}
          onClick={() => (open ? closePanel() : openPanel())}
        >
          {!open ? (
            <>
              <span className="support-chat-sparkle pointer-events-none absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-[#efeae3] text-[#3e5a72] shadow-sm" aria-hidden>
                <Sparkles size={11} strokeWidth={2} className="motion-safe:animate-[support-chat-twinkle_1.6s_ease-in-out_infinite]" />
              </span>
              <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(246,243,238,0.22),transparent_55%)]" aria-hidden />
            </>
          ) : null}
          {open ? <X size={22} strokeWidth={1.6} /> : <MessageCircle size={22} strokeWidth={1.6} />}
        </button>
      ) : null}
    </div>
  );
}
