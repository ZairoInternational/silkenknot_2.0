"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDialog } from "@/components/ui";

export function AccountDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const ref = useDialog(open, onClose);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await store.login(email, password);
    if (!result.ok) {
      setError(result.message || "Email or password is incorrect.");
      return;
    }
    setError("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.button
          type="button"
          aria-label="Close account"
          className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        />
      ) : null}
      {open ? (
        <motion.div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label="Account"
          className="fixed z-[70] flex flex-col bg-white text-ink shadow-[-10px_0_40px_rgba(0,0,0,0.15)] max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[88vh] max-md:rounded-t-2xl md:inset-y-0 md:right-0 md:w-[400px] md:rounded-l-2xl"
          initial={mobile ? { y: "100%" } : { x: "100%" }}
          animate={mobile ? { y: 0 } : { x: 0 }}
          exit={mobile ? { y: "100%" } : { x: "100%" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-sm font-medium">Account</p>
            <button type="button" aria-label="Close account" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-8">
            {store.currentUser ? (
              <div>
                <p className="font-serif text-3xl">{store.currentUser.name}</p>
                <p className="mt-2 text-sm text-mute">{store.currentUser.email}</p>
                <Link href="/account" onClick={onClose} className="mt-8 flex h-11 items-center justify-center bg-ink text-[11px] uppercase tracking-[0.16em] text-white">
                  View account
                </Link>
                <button
                  type="button"
                  className="mt-3 w-full text-[11px] uppercase tracking-[0.16em]"
                  onClick={() => {
                    void store.logout();
                    onClose();
                  }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 className="font-serif text-3xl leading-tight">Sign in or create an account</h2>
                <label className="mt-8 block text-[11px] uppercase tracking-[0.14em] text-mute" htmlFor="drawer-email">
                  Email
                  <input
                    id="drawer-email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 h-11 w-full border-b border-line bg-transparent text-base text-ink outline-none"
                  />
                </label>
                <label className="mt-5 block text-[11px] uppercase tracking-[0.14em] text-mute" htmlFor="drawer-password">
                  Password
                  <input
                    id="drawer-password"
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 h-11 w-full border-b border-line bg-transparent text-base text-ink outline-none"
                  />
                </label>
                {error ? <p className="mt-3 text-sm">{error}</p> : null}
                <button type="submit" className="mt-6 h-11 w-full bg-ink text-[11px] uppercase tracking-[0.16em] text-white">
                  Continue
                </button>
                <p className="my-5 text-center text-[11px] uppercase tracking-[0.16em] text-mute">or</p>
                <button
                  type="button"
                  className="h-11 w-full border border-line text-sm"
                  onClick={() => store.notify("Use email to sign in.")}
                >
                  Google
                </button>
                <button
                  type="button"
                  className="mt-2 h-11 w-full border border-line text-sm"
                  onClick={() => store.notify("Use email to sign in.")}
                >
                  Apple
                </button>
                <Link href="/account/register" onClick={onClose} className="mt-6 block text-center text-[11px] uppercase tracking-[0.16em]">
                  Create account
                </Link>
              </form>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
