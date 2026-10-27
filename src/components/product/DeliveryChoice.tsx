"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, CreditCard, MapPin, Package, Pencil, Truck, X, Zap } from "lucide-react";
import { useDialog } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Address } from "@/lib/types";

const CHOICE_KEY = "silkknot.delivery.choice";

type Choice = { userId: string; addressId?: string; pin?: string };
type PinResult = {
  available: boolean;
  checked?: boolean;
  label?: string;
  message: string;
  prepaid?: boolean | null;
  cod?: boolean | null;
  by: string | null;
  estimate: string;
  estimateSource?: "store_policy" | "delhivery_tat" | "none" | null;
  expressEstimate?: string;
  expressEstimateSource?: "store_policy" | "delhivery_tat" | "none" | null;
};

function transitDays(estimate?: string) {
  const match = estimate?.match(/(\d+)/);
  const days = match ? Number(match[1]) : null;
  return days && days > 0 ? days : null;
}

function fasterThan(standard?: string, express?: string) {
  const from = transitDays(standard);
  const to = transitDays(express);
  if (from == null || to == null || to >= from) return "";
  const gap = from - to;
  return gap === 1 ? "About 1 day faster" : `About ${gap} days faster`;
}

function deliveryFacts(body: PinResult) {
  if (!body.available) return [] as string[];
  const facts: string[] = [];
  if (body.estimateSource === "delhivery_tat") {
    facts.push(body.by
      ? `Standard delivery is expected by ${body.by}.`
      : `Standard delivery takes about ${body.estimate}.`);
    if (body.expressEstimateSource === "delhivery_tat" && body.expressEstimate) {
      facts.push(`Express is faster, about ${body.expressEstimate}. You can choose it when you check out.`);
    }
  } else if (body.estimate || body.by) {
    facts.push(body.by ? `Expected by ${body.by}.` : "We will show a delivery date at checkout.");
  }
  if (body.checked && body.prepaid != null && body.cod != null) {
    const online = body.prepaid ? "You can pay online before the order is sent." : "Online payment is not available for this PIN.";
    const cod = body.cod ? "Cash on delivery is available." : "Cash on delivery is not available for this PIN.";
    facts.push(`${online} ${cod}`);
  }
  return facts;
}

function useMobileSheet() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(max-width: 767px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => true,
  );
}

function readChoice(userId: string): Choice | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CHOICE_KEY) || "null") as Choice | null;
    if (!saved || saved.userId !== userId) return null;
    return saved;
  } catch {
    sessionStorage.removeItem(CHOICE_KEY);
    return null;
  }
}

function writeChoice(choice: Choice) {
  sessionStorage.setItem(CHOICE_KEY, JSON.stringify(choice));
}

export function PinLookup({ initialPin = "" }: { initialPin?: string }) {
  const [pin, setPin] = useState(initialPin);
  const [line, setLine] = useState("");
  const [note, setNote] = useState("");
  const [checking, setChecking] = useState(false);

  async function check(event?: React.SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    const next = pin.trim();
    if (!/^\d{6}$/.test(next)) {
      setLine("Enter a 6-digit PIN.");
      setNote("");
      return;
    }
    setChecking(true);
    setLine("");
    setNote("");
    try {
      const response = await fetch(`/api/shipping/serviceability?pin=${next}`);
      const body = await response.json();
      if (body.available && body.by) {
        setLine(body.checked ? "We can deliver to this PIN." : `Arrives by ${body.by}.`);
        setNote(deliveryFacts(body).join(" "));
      } else {
        setLine(body.message || body.label || body.error || "Unable to verify");
        setNote("");
      }
    } catch {
      setLine("Delivery availability could not be checked. Try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div
      className="pinLookup mb-4"
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        event.stopPropagation();
        void check(event);
      }}
    >
      <p>Check a PIN</p>
      <div>
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="6-digit PIN"
          aria-label="PIN code"
        />
        <button type="button" disabled={checking} onClick={(event) => void check(event)}>
          {checking ? "Checking" : "Check"}
        </button>
      </div>
      {line ? <p className="pinResult">{line}</p> : null}
      {note ? <p className="pinNote">{note}</p> : null}
    </div>
  );
}

export function DeliveryChoice() {
  const store = useStore();
  const pathname = usePathname();
  const mobile = useMobileSheet();
  const [open, setOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialog(open, () => setOpen(false));
  const user = store.currentUser;
  const addresses = user?.addresses.filter((item) => item.line1 && /^\d{6}$/.test(item.postal)) ?? [];
  const [addressId, setAddressId] = useState("");
  const [pin, setPin] = useState("");
  const [draftPin, setDraftPin] = useState("");
  const [result, setResult] = useState<PinResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [pinNote, setPinNote] = useState("");

  useEffect(() => {
    if (!store.ready) return;
    const list = user?.addresses.filter((item) => item.line1 && /^\d{6}$/.test(item.postal)) ?? [];
    const saved = readChoice(user?.id || "");
    const fallback = list.find((item) => item.isDefault) ?? list[0];
    if (saved?.addressId && list.some((item) => item.id === saved.addressId)) {
      setAddressId(saved.addressId);
      setPin("");
      return;
    }
    if (saved?.pin && /^\d{6}$/.test(saved.pin)) {
      setAddressId("");
      setPin(saved.pin);
      setDraftPin(saved.pin);
      return;
    }
    setAddressId(fallback?.id || "");
    setPin("");
  }, [store.ready, user]);

  const selected = addresses.find((item) => item.id === addressId) || null;
  const activePin = selected?.postal || pin;

  useEffect(() => {
    if (!store.ready || !/^\d{6}$/.test(activePin)) {
      setResult(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setChecking(true);
      try {
        const response = await fetch(`/api/shipping/serviceability?pin=${activePin}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) {
          setResult({ available: false, message: body.error || "Delivery availability could not be checked.", by: null, estimate: "" });
          return;
        }
        setResult(body as PinResult);
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setResult({ available: false, message: "Delivery availability could not be checked. Try again.", by: null, estimate: "" });
      } finally {
        setChecking(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [store.ready, activePin]);

  function chooseAddress(address: Address) {
    setAddressId(address.id);
    setPin("");
    setPinNote("");
    writeChoice({ userId: user?.id || "", addressId: address.id });
    setOpen(false);
  }

  async function useDraftPin(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(draftPin)) {
      setPinNote("Enter a 6-digit PIN.");
      return;
    }
    setPinNote("");
    setChecking(true);
    try {
      const response = await fetch(`/api/shipping/serviceability?pin=${draftPin}`);
      const body = await response.json();
      setResult(body as PinResult);
      if (!body.available) {
        setPinNote(body.message || body.error || "Delivery is not available for this PIN.");
        return;
      }
      setAddressId("");
      setPin(draftPin);
      writeChoice({ userId: user?.id || "", pin: draftPin });
      setOpen(false);
    } catch {
      setPinNote("Delivery availability could not be checked. Try again.");
    } finally {
      setChecking(false);
    }
  }

  const loginHref = `/account/login?next=${encodeURIComponent(pathname || "/shop")}`;

  const facts = result?.available ? deliveryFacts(result) : [];
  const ready = Boolean(result?.available && activePin);
  const expressFaster = fasterThan(result?.estimate, result?.expressEstimate);
  const standardCaption = result?.estimate ? `Standard delivery · ${result.estimate}` : "Standard delivery";
  const detailCopy = result?.by
    ? `Standard delivery is expected by ${result.by}. That is about ${result.estimate || "a few days"} after the parcel is dispatched, not from the moment you order.`
    : `Standard delivery takes about ${result?.estimate || "a few days"} after the parcel is dispatched, not from the moment you order.`;
  const paymentTitle = result?.cod ? "Cash on delivery" : "Pay online";
  const paymentValue = result?.cod || result?.prepaid ? "Available" : "Not available";

  function revealPinInput() {
    setPanelOpen(true);
    window.setTimeout(() => pinInputRef.current?.focus(), 40);
  }

  return (
    <div className="mt-4 md:col-span-2 md:mt-5">
      <div className="@container overflow-hidden rounded-2xl border border-[#e6e0d6] bg-white text-[#2c2926] shadow-[0_8px_30px_rgba(28,36,32,0.04)]">
        {panelOpen ? null : (
          <div className="relative grid grid-cols-1 items-stretch @min-[680px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] @min-[680px]:items-center">
            <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f6f3ee] text-[#8a7350]">
                <MapPin size={15} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[#8a7350]">Delivery to</span>
                <span className="mt-0.5 block truncate text-sm font-medium tracking-tight">{activePin ? `PIN ${activePin}` : "Add a PIN"}</span>
              </span>
            </div>
            <span className="my-4 hidden w-px self-stretch bg-[#e6e0d6] @min-[680px]:block" aria-hidden />
            <div className="flex min-w-0 items-center gap-2.5 border-t border-[#eee8de] px-3 py-2.5 @min-[680px]:border-t-0">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f6f3ee] text-[#8a7350]">
                <Truck size={15} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[#8a7350]">Estimated delivery</span>
                <span className="mt-0.5 block truncate text-sm font-medium tracking-tight">
                  {checking ? "Checking" : ready && result?.by ? `By ${result.by}` : ready ? "Available" : result ? "Not available" : "Enter a PIN"}
                </span>
                {ready ? <span className="mt-0.5 block truncate text-xs text-[#6f675d]">{standardCaption}</span> : null}
                {!checking && result && !result.available ? <span className="mt-0.5 block text-xs leading-5 text-[#9a4b3a]">{result.message}</span> : null}
              </span>
            </div>
            <button
              type="button"
              aria-expanded={false}
              aria-label="Show delivery details"
              onClick={() => setPanelOpen(true)}
              className="absolute right-2 top-2 grid size-8 place-items-center text-[#8a7350] @min-[680px]:static @min-[680px]:mr-2"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}

        {panelOpen ? (
          <div className="px-3 pb-3 pt-3 @min-[680px]:px-4">
            <div className="grid grid-cols-1 items-start gap-3 @min-[680px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] @min-[680px]:items-center @min-[680px]:gap-0">
              <div className="flex min-w-0 items-center gap-2.5 @min-[680px]:pr-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f6f3ee] text-[#8a7350]">
                  <MapPin size={15} strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[#8a7350]">
                    Delivery pincode
                    {activePin ? <span className="rounded-full bg-[#f6f3ee] px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[#8a7350]">Set</span> : null}
                  </span>
                  <span className="mt-0.5 block text-sm font-medium tracking-tight">{activePin || "—"}</span>
                  <button type="button" onClick={revealPinInput} className="mt-0.5 inline-flex items-center gap-1 text-xs text-[#8a7350] underline decoration-[#e3dbd1] underline-offset-2">
                    Change pincode <Pencil size={11} />
                  </button>
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-2.5 border-t border-[#eee8de] pt-3 @min-[680px]:border-l @min-[680px]:border-t-0 @min-[680px]:px-4 @min-[680px]:pt-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f6f3ee] text-[#8a7350]">
                  <Truck size={15} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[#8a7350]">Estimated delivery</span>
                  <span className="mt-0.5 block text-sm font-medium tracking-tight">
                    {checking ? "Checking" : ready && result?.by ? `By ${result.by}` : ready ? "Available" : "—"}
                  </span>
                  {ready ? <span className="block text-xs text-[#6f675d]">{standardCaption}</span> : null}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-[#eee8de] pt-3 @min-[680px]:border-l @min-[680px]:border-t-0 @min-[680px]:pl-4 @min-[680px]:pt-0">
                {ready && result?.expressEstimate ? (
                  <span className="inline-flex max-w-full flex-col rounded-full border border-[#e3dbd1] bg-[#fbf9f6] px-2.5 py-1">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8a7350]">
                      <Check size={12} strokeWidth={2.5} /> Express available
                    </span>
                    <span className="text-[11px] text-[#6f675d]">{expressFaster || `Around ${result.expressEstimate}`}</span>
                  </span>
                ) : (
                  <span className="text-xs text-[#6f675d]">{checking ? "Checking express" : "Express appears when it is available"}</span>
                )}
                <button type="button" aria-label="Hide delivery details" onClick={() => setPanelOpen(false)} className="grid size-8 shrink-0 place-items-center text-[#8a7350]">
                  <ChevronDown size={16} className="rotate-180" />
                </button>
              </div>
            </div>

            {ready ? (
              <div className="mt-3 overflow-hidden rounded-xl bg-[#fbf9f6]">
                <button type="button" onClick={() => setDetailsOpen((current) => !current)} className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left" aria-expanded={detailsOpen}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[#8a7350]">
                    <Package size={14} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Delivery details</span>
                    {detailsOpen ? <span className="mt-0.5 block text-xs leading-5 text-[#4e4943]">{detailCopy}</span> : null}
                  </span>
                  <ChevronDown size={14} className={`mt-0.5 shrink-0 text-[#8a7350] transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
                </button>
                <div className="grid grid-cols-1 border-t border-[#eee8de] @min-[680px]:grid-cols-3">
                  <div className="flex min-w-0 items-center gap-2 px-3 py-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[#8a7350]"><Truck size={14} /></span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">Standard delivery</span>
                      <span className="block text-xs text-[#6f675d]">{result?.by ? `Expected by ${result.by}` : standardCaption}</span>
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 border-t border-[#eee8de] px-3 py-2.5 @min-[680px]:border-l @min-[680px]:border-t-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[#8a7350]"><Zap size={14} /></span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">Express delivery</span>
                      <span className="block text-xs text-[#6f675d]">{result?.expressEstimate ? (expressFaster || `Around ${result.expressEstimate}`) : "Not available"}</span>
                    </span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 border-t border-[#eee8de] px-3 py-2.5 @min-[680px]:border-l @min-[680px]:border-t-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[#8a7350]"><CreditCard size={14} /></span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">{paymentTitle}</span>
                      <span className="block text-xs text-[#6f675d]">{paymentValue}</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[#6f675d]">{checking ? "Checking this PIN." : result?.message || "Enter a PIN to see if we can deliver there."}</p>
            )}

            <form onSubmit={useDraftPin} className="mt-3 grid grid-cols-1 items-center gap-2.5 border-t border-[#eee8de] pt-3 @min-[680px]:grid-cols-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f6f3ee] text-[#8a7350]"><MapPin size={14} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Check another pincode</span>
                  <span className="block text-xs text-[#6f675d]">Enter a different pincode to see the delivery estimate</span>
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <input
                  ref={pinInputRef}
                  value={draftPin}
                  onChange={(event) => setDraftPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="Enter pincode"
                  aria-label="PIN code"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-[#e3dbd1] bg-white px-3 text-sm text-[#2c2926] outline-none placeholder:text-[#b5aa9c]"
                />
                <button type="submit" disabled={checking} className="h-9 shrink-0 rounded-lg bg-[#CBAC7C] px-4 text-sm text-white hover:bg-[#B39668] disabled:opacity-50">
                  {checking ? "Checking" : "Check"}
                </button>
              </div>
              {pinNote ? <p className="text-xs text-[#9a4b3a] @min-[680px]:col-span-2">{pinNote}</p> : null}
              {user && addresses.length ? (
                <button type="button" onClick={() => setOpen(true)} className="text-left text-xs text-[#8a7350] underline decoration-[#e3dbd1] underline-offset-2 @min-[680px]:col-span-2">
                  Use a saved address
                </button>
              ) : null}
            </form>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            aria-label="Close delivery address"
            className="fixed inset-0 z-[75] bg-[#2c2926]/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        ) : null}
        {open ? (
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Delivery address"
            className="fixed z-[80] flex flex-col bg-[#f6f3ee] text-[#2c2926] shadow-[-24px_0_80px_rgba(28,27,25,0.16)] max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[88dvh] max-md:rounded-t-[28px] md:inset-y-0 md:right-0 md:w-[420px]"
            initial={mobile ? { x: 0, y: "100%" } : { x: "100%", y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={mobile ? { x: 0, y: "100%" } : { x: "100%", y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-6 pt-3 md:pt-6">
              <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-[#e3dbd1] md:hidden" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a7350]">Delivery</p>
                  <h2 className="mt-1 font-serif text-3xl tracking-tight">Where to?</h2>
                </div>
                <button type="button" aria-label="Close delivery address" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-white ring-1 ring-[#e6e0d6]">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="mt-5 flex-1 overflow-y-auto px-6 pb-8">
              {facts.length ? (
                <div className="mb-6 space-y-2 text-sm leading-6 text-[#6f675d]">
                  {facts.map((fact) => <p key={fact}>{fact}</p>)}
                </div>
              ) : (
                <p className="mb-6 text-sm leading-6 text-[#6f675d]">Choose an address or enter a PIN to see if we can deliver there, how long it takes, and how you can pay.</p>
              )}
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a7350]">Saved addresses</p>
              {user && addresses.length ? (
                <ul className="mt-3 space-y-2.5">
                  {addresses.map((address) => {
                    const active = address.id === selected?.id;
                    return (
                      <li key={address.id}>
                        <button
                          type="button"
                          onClick={() => chooseAddress(address)}
                          className={`flex w-full items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left ${active ? "border-[#2c2926]" : "border-[#e6e0d6]"}`}
                        >
                          <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${active ? "border-[#2c2926] bg-[#2c2926] text-white" : "border-[#e3dbd1]"}`}>
                            {active ? <Check size={12} /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a7350]">{address.label}{address.isDefault ? " · Default" : ""}</span>
                            <span className="mt-1 block text-sm font-medium">{address.name}</span>
                            <span className="mt-1 block text-sm leading-6 text-[#6f675d]">{address.line1}{address.line2 ? `, ${address.line2}` : ""}</span>
                            <span className="block text-sm text-[#6f675d]">{address.city} {address.postal}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#6f675d]">
                  {user ? "No saved address yet." : "Sign in to choose a saved address."}
                </p>
              )}
              {user ? (
                <Link href={`/account/addresses?next=${encodeURIComponent(pathname || "/shop")}`} className="mt-4 inline-block text-sm text-[#8a7350] underline decoration-[#e3dbd1] underline-offset-4">
                  Add an address
                </Link>
              ) : (
                <Link href={loginHref} className="mt-4 inline-block text-sm text-[#8a7350] underline decoration-[#e3dbd1] underline-offset-4">
                  Sign in
                </Link>
              )}
              <form onSubmit={useDraftPin} className="mt-8 rounded-2xl border border-[#e6e0d6] bg-white p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a7350]">Check a PIN</p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={draftPin}
                    onChange={(event) => setDraftPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="6-digit PIN"
                    aria-label="PIN code"
                    className="h-12 min-w-0 flex-1 rounded-xl border border-[#e6e0d6] bg-[#fbf9f6] px-3 text-base tracking-[0.08em] text-[#2c2926] outline-none placeholder:tracking-normal placeholder:text-[#b5aa9c] max-md:text-lg"
                  />
                  <button type="submit" disabled={checking} className="h-12 shrink-0 rounded-xl bg-[#CBAC7C] px-4 text-sm text-white disabled:opacity-50">
                    {checking ? "Checking" : "Check"}
                  </button>
                </div>
                {pinNote ? <p className="mt-3 text-sm text-[#6f675d]">{pinNote}</p> : null}
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
