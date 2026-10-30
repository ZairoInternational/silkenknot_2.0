"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Mail, ShoppingBag, X } from "lucide-react";
import { afterAuthPath, needsName, safeNext } from "@/lib/auth/browser";
import { normalizeEmail, normalizePhone } from "@/lib/auth/contact";
import { useSiteMedia } from "@/lib/site-media/client";
import { useStore } from "@/lib/store";
import { BrandLogo } from "@/components/ui";
import "./auth.css";

function clock(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function WhatsAppIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <title>WhatsApp</title>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export function OtpAuth({
  next,
  returnTo,
  purpose = "login",
  onDone,
  variant = "compact",
}: {
  next?: string;
  returnTo?: string;
  purpose?: "login" | "link-email" | "link-phone";
  onDone?: () => void;
  variant?: "page" | "compact" | "inline";
}) {
  const store = useStore();
  const router = useRouter();
  const locked = purpose === "link-email" ? "email" : purpose === "link-phone" ? "whatsapp" : null;
  const [channel, setChannel] = useState<"whatsapp" | "email">(locked || "whatsapp");
  const [screen, setScreen] = useState<"login" | "otp" | "success">("login");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [challengeId, setChallengeId] = useState("");
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const activeChannel = locked || channel;
  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const returnPath = afterAuthPath(returnTo || next || null);
  const askName = needsName(store.currentUser);
  const afterLogin = askName ? `/account?next=${encodeURIComponent(returnPath)}` : safeNext(next || returnPath);

  useEffect(() => {
    if (screen !== "otp") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const focus = window.setTimeout(() => inputs.current[0]?.focus(), 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(focus);
    };
  }, [screen, challengeId]);

  async function requestCode(event?: React.FormEvent) {
    event?.preventDefault();
    const normalized = activeChannel === "whatsapp" ? normalizePhone(phone, "IN") : normalizeEmail(email);
    if (!normalized) {
      setError(activeChannel === "whatsapp" ? "Enter a valid 10-digit Indian mobile number." : "Enter a valid email address.");
      return;
    }
    if (purpose === "login" && !termsAccepted) {
      setError("Please agree to the Terms & Conditions and Privacy Policy to continue.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await store.requestOtp({
      channel: activeChannel === "whatsapp" ? "whatsapp" : "email",
      destination: normalized,
      country: "IN",
      purpose,
    });
    setBusy(false);
    if (!result.ok || !result.challengeId) {
      setError(result.message || "We couldn’t send a code.");
      return;
    }
    setSentTo(normalized);
    setChallengeId(result.challengeId);
    setResendAt(result.resendAt ? new Date(result.resendAt).getTime() : Date.now() + 60_000);
    setDevCode(result.devCode || "");
    setCode(["", "", "", "", "", ""]);
    setScreen("otp");
  }

  async function verify(event?: React.FormEvent) {
    event?.preventDefault();
    const joined = code.join("");
    if (joined.length !== 6 || busy) {
      setError("Enter all six digits to continue.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await store.verifyOtp({ challengeId, code: joined, purpose });
    setBusy(false);
    if (!result.ok) {
      setError(result.message || "That code is incorrect or has expired.");
      return;
    }
    if (purpose !== "login") {
      onDone?.();
      return;
    }
    setScreen("success");
  }

  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (screen !== "success" || !store.currentUser) return;
    const timer = window.setTimeout(() => {
      if (askName || next) router.push(afterLogin);
      else done.current?.();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [screen, store.currentUser, askName, next, afterLogin, router]);

  function writeCode(start: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    const nextCode = [...code];
    if (!incoming) {
      nextCode[start] = "";
      setCode(nextCode);
      return;
    }
    const typedOver = code[start] && incoming.length === code[start].length + 1 && incoming.startsWith(code[start]);
    const digits = (typedOver ? incoming.slice(-1) : incoming).slice(0, 6 - start).split("");
    digits.forEach((digit, offset) => {
      nextCode[start + offset] = digit;
    });
    setCode(nextCode);
    inputs.current[Math.min(start + digits.length, 5)]?.focus();
  }

  function finish(path: string) {
    router.push(safeNext(path));
  }

  const media = useSiteMedia();
  const heading = purpose === "link-email" ? "Verify your email" : purpose === "link-phone" ? "Verify your WhatsApp number" : "Welcome back";
  const authBackground = `linear-gradient(180deg, rgba(28,27,25,0.05) 35%, rgba(28,27,25,0.62) 100%), url('${media.authBackground}')`;

  return (
    <div className={`sk-auth-shell${variant === "compact" ? " is-compact" : ""}${variant === "inline" ? " is-inline" : ""}`}>
      {variant === "page" ? (
        <section
          className="sk-auth-visual"
          style={{ backgroundImage: authBackground }}
        >
          <Link className="sk-auth-visual-brand" href="/" aria-label="Silken Knot home">
            <BrandLogo placement="auth" wordmarkClassName="text-inherit" />
          </Link>
          <div className="sk-auth-visual-copy">
            <span>A MOMENT FOR YOURSELF</span>
            <h2>Self care<br />is a beautiful<br />habit.</h2>
            <p>Small rituals. Softer days.</p>
          </div>
        </section>
      ) : null}

      <section className="sk-auth-panel">
        {variant === "page" ? (
          <header className="sk-auth-header">
            <Link href="/" className="sk-auth-wordmark" aria-label="Silken Knot home">
              <span>Silken Knot</span>
              <small>Body care · Bath · Wellness</small>
            </Link>
            <nav className="sk-auth-shortcuts" aria-label="Quick links">
              <Link href="/wishlist" aria-label="Wishlist"><Heart size={17} /></Link>
              <button type="button" aria-label="Shopping bag" onClick={() => store.openCart()}><ShoppingBag size={17} /></button>
            </nav>
          </header>
        ) : null}

        {screen !== "success" ? (
          <div className="sk-auth-content">
            {variant === "inline" ? (
              <div className="sk-auth-inline-bar">
                <span>{purpose === "link-phone" ? "WhatsApp" : "Email"}</span>
                <button type="button" aria-label="Close" onClick={() => onDone?.()}>
                  <X size={14} />
                </button>
              </div>
            ) : null}
            {screen === "login" ? (
              <>
                <h1>{heading}</h1>
                <p className="sk-auth-subtitle">
                  {purpose === "login"
                    ? activeChannel === "whatsapp"
                      ? "We’ll send a one-time code on WhatsApp."
                      : "We’ll send a one-time code to your email."
                    : activeChannel === "whatsapp"
                      ? "We’ll send a WhatsApp code to verify this number."
                      : "We’ll send a code to verify this email."}
                </p>
                {locked ? null : (
                  <div className="sk-auth-methods" role="tablist" aria-label="Choose a verification method">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeChannel === "whatsapp"}
                      className={`sk-auth-method is-whatsapp${activeChannel === "whatsapp" ? " is-active" : ""}`}
                      onClick={() => { setChannel("whatsapp"); setError(""); }}
                    >
                      <span className="sk-auth-method-icon" aria-hidden>
                        <WhatsAppIcon size={18} />
                      </span>
                      <span className="sk-auth-method-copy">
                        <span className="sk-auth-method-title">WhatsApp</span>

                      </span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeChannel === "email"}
                      className={`sk-auth-method is-email${activeChannel === "email" ? " is-active" : ""}`}
                      onClick={() => { setChannel("email"); setError(""); }}
                    >
                      <span className="sk-auth-method-icon" aria-hidden>
                        <Mail size={18} strokeWidth={1.75} />
                      </span>
                      <span className="sk-auth-method-copy">
                        <span className="sk-auth-method-title">Email</span>
                       
                      </span>
                    </button>
                  </div>
                )}
                <form onSubmit={requestCode} className={`sk-auth-channel-form is-${activeChannel}`}>
                  {activeChannel === "whatsapp" ? (
                    <div className="sk-auth-phone-field">
                      <span className="sk-auth-country" aria-hidden>+91</span>
                      <label className="sk-sr-only" htmlFor="auth-phone">Indian mobile number for WhatsApp</label>
                      <input id="auth-phone" type="tel" autoComplete="tel-national" inputMode="numeric" required maxLength={10} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit WhatsApp number" />
                    </div>
                  ) : (
                    <label className="sk-auth-email-field">
                      <Mail size={16} aria-hidden />
                      <span className="sk-sr-only">Email address</span>
                      <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email address" />
                    </label>
                  )}
                  {purpose === "login" ? (
                    <label className="sk-auth-consent" style={{ marginTop: 16 }}>
                      <input type="checkbox" checked={termsAccepted} onChange={(event) => { setTermsAccepted(event.target.checked); setError(""); }} />
                      <span>By continuing, you agree to our <Link href="/terms">Terms & Conditions</Link> and <Link href="/privacy">Privacy Policy</Link>.</span>
                    </label>
                  ) : null}
                  {error ? <p className="sk-auth-error" role="alert">{error}</p> : null}
                  <button className={`sk-auth-primary is-${activeChannel}`} type="submit" disabled={busy}>
                    {busy
                      ? "Checking…"
                      : activeChannel === "whatsapp"
                        ? "Send WhatsApp code"
                        : "Send email code"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <button className="sk-auth-back" type="button" onClick={() => { setScreen("login"); setError(""); }}>
                  <ArrowLeft size={17} /> Back
                </button>
                <h1>{activeChannel === "whatsapp" ? "Verify your WhatsApp" : "Verify your email"}</h1>
                <p className="sk-auth-subtitle">{activeChannel === "whatsapp" ? "We’ve sent a 6-digit code on WhatsApp to" : "We’ve sent a 6-digit code to"}<br /><strong>{sentTo}</strong></p>
                <form onSubmit={verify}>
                  <div className="sk-otp-inputs" role="group" aria-label="Six-digit one-time password">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(node) => { inputs.current[index] = node; }}
                        aria-label={`OTP digit ${index + 1}`}
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) => writeCode(index, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Backspace") {
                            event.preventDefault();
                            if (code[index]) {
                              writeCode(index, "");
                              return;
                            }
                            if (index > 0) {
                              const nextCode = [...code];
                              nextCode[index - 1] = "";
                              setCode(nextCode);
                              inputs.current[index - 1]?.focus();
                            }
                            return;
                          }
                          if (event.key === "Delete") {
                            event.preventDefault();
                            writeCode(index, "");
                            return;
                          }
                          if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus();
                          if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus();
                        }}
                        onPaste={(event) => {
                          event.preventDefault();
                          writeCode(index, event.clipboardData.getData("text"));
                        }}
                      />
                    ))}
                  </div>
                  <p className="sk-auth-resend">
                    {secondsLeft > 0 ? `Resend in ${clock(secondsLeft)}` : "Didn’t receive the code?"}
                    {secondsLeft > 0 ? null : <button type="button" disabled={busy} onClick={() => void requestCode()}>Resend</button>}
                  </p>
                  {devCode ? <p className="sk-auth-dev" role="status">Development code: {devCode}</p> : null}
                  {error ? <p className="sk-auth-error" role="alert">{error}</p> : null}
                  <button className="sk-auth-primary" type="submit" disabled={busy || code.join("").length < 6}>{busy ? "Checking…" : "Continue"}</button>
                </form>
              </>
            )}
          </div>
        ) : (
          <div className="sk-auth-success">
            <span className="sk-auth-success-icon" aria-hidden="true">
              <svg viewBox="0 0 52 52">
                <circle className="sk-auth-success-ring" cx="26" cy="26" r="24" />
                <path className="sk-auth-success-tick" d="M15 27.2 22.2 34.4 37.5 18.5" />
              </svg>
            </span>
            <h1>Welcome to Silken Knot</h1>
            <p>{askName ? "You’re signed in. Next, add your name." : "You’re signed in. Taking you back."}</p>
            <button className="sk-auth-primary" type="button" onClick={() => (askName || next ? finish(afterLogin) : onDone?.())}>
              {askName ? "Add your name" : returnPath.startsWith("/checkout") ? "Continue checkout" : "Continue"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
