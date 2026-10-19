"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Headphones, Heart, LogOut, MapPin, Package, User, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoutConfirm } from "@/components/account/LogoutConfirm";
import { OtpAuth } from "@/components/account/OtpAuth";
import { profileCompletion } from "@/lib/auth/browser";
import { useStore } from "@/lib/store";
import { useDialog } from "@/components/ui";

function ProfileMeter({ user }: { user: NonNullable<ReturnType<typeof useStore>["currentUser"]> }) {
  const { percent } = profileCompletion(user);
  return (
    <span className="mt-2 block">
      <span className="flex items-center justify-between text-[11px] font-medium text-[#8a7350]">
        <span>{percent === 100 ? "Profile complete" : "Profile completion"}</span>
        <span>{percent}%</span>
      </span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#efe6d8]">
        <span className="block h-full rounded-full bg-[#c6a15e]" style={{ width: `${percent}%` }} />
      </span>
    </span>
  );
}

function displayPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2)}`;
  if (digits.length === 10) return `+91 ${digits}`;
  return phone;
}

function MenuRow({
  href,
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  href?: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  const className = "flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#fbf9f6]";
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f3efe8] text-[#2c2926]">
        <Icon size={18} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#2c2926]">{title}</span>
        <span className="mt-0.5 block text-xs text-[#8a8178]">{detail}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-[#c4bdb4]" />
    </>
  );
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

export function AccountDrawer({ open, onClose, next, returnTo }: { open: boolean; onClose: () => void; next?: string; returnTo?: string }) {
  const store = useStore();
  const ref = useDialog(open, onClose);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const user = store.currentUser;
  const verified = Boolean(user?.phoneVerifiedAt || user?.emailVerifiedAt);

  useEffect(() => {
    if (!open) setShowAuth(false);
    else if (!user) setShowAuth(true);
  }, [open, user]);

  const accountRows = [
    { href: "/account", icon: User, title: "My Profile", detail: "View and edit your personal details" },
    { href: "/account/addresses", icon: MapPin, title: "Addresses", detail: "Manage your shipping and billing addresses" },
    { href: "/account/orders", icon: Package, title: "Orders", detail: "Track your orders and view history" },
    { href: "/wishlist", icon: Heart, title: "Wishlist", detail: "Your saved items" },
  ];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          aria-hidden
          className="fixed inset-0 z-[60] bg-black/45"
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
          aria-label="My Account"
          className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-[420px] flex-col overflow-hidden bg-[#f7f4ef] text-[#2c2926] shadow-[-12px_0_40px_rgba(28,27,25,0.16)]"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                My Account
              </h2>
              <p className="mt-1 text-sm text-[#8a8178]">
                Manage your profile, orders and preferences
              </p>
            </div>
            <button
              type="button"
              aria-label="Close account"
              onClick={onClose}
              className="group/close inline-flex size-8 items-center justify-center text-[#2c2926] bg-black/10 hover:bg-black/18 focus-visible:outline-none rounded-full"
            >
              <X
                size={18} strokeWidth={1.6}
                className="transition-transform duration-300 group-hover/close:rotate-90"
              />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
            {showAuth || !user ? (
              <OtpAuth
                next={next}
                returnTo={returnTo || next}
                onDone={onClose}
              />
            ) : (
              <div className="space-y-3">
                <Link
                  href="/account"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-[0_1px_2px_rgba(28,27,25,0.04)]"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#f3efe8] text-[#8a7350]">
                    <User size={22} strokeWidth={1.6} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                      {user.name || "Your account"}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-[#8a8178]">
                      {user.phone ? displayPhone(user.phone) : user.email}
                    </span>
                    {verified ? (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#e7f6ec] px-2 py-0.5 text-[11px] font-medium text-[#1f8a4c]">
                        <span aria-hidden>✓</span> Verified
                      </span>
                    ) : null}
                    <ProfileMeter user={user} />
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-[#c4bdb4]" />
                </Link>

                <div className="divide-y divide-[#efeae3] overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(28,27,25,0.04)]">
                  {accountRows.map((row) => (
                    <MenuRow key={row.title} {...row} onClick={onClose} />
                  ))}
                </div>

                <div className="divide-y divide-[#efeae3] overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(28,27,25,0.04)]">
                  <MenuRow
                    href="/contact"
                    icon={Headphones}
                    title="Help & Support"
                    detail="Get help with your orders and more"
                    onClick={onClose}
                  />
                  <MenuRow
                    icon={LogOut}
                    title="Log Out"
                    detail="Sign out from your account"
                    onClick={() => setConfirmLogout(true)}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
      <LogoutConfirm
        open={confirmLogout}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          void store.logout();
          onClose();
        }}
      />
    </AnimatePresence>
  );
}
