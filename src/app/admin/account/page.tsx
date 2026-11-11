"use client";

import { useState } from "react";
import { AdminPageHeader, AdminTip, adminBtn, adminControl } from "@/components/admin/AdminShell";
import { useStore } from "@/lib/store";

export default function AdminAccountPage() {
  const store = useStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <AdminPageHeader
        title="Account"
        purpose="Change the studio password used to sign in here."
      />
      <form
        className="mt-10 max-w-md"
        autoComplete="off"
        onSubmit={async (event) => {
          event.preventDefault();
          if (password !== confirm) {
            setError("Those passwords do not match.");
            setMessage("");
            return;
          }
          setBusy(true);
          setError("");
          setMessage("");
          const result = await store.changeAdminPassword({ currentPassword, password });
          setBusy(false);
          if (!result.ok) {
            setError(result.message);
            return;
          }
          setCurrentPassword("");
          setPassword("");
          setConfirm("");
          setMessage(result.message || "Password updated.");
        }}
      >
        <label className="block text-sm">
          Current password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={`mt-1.5 ${adminControl.input}`}
          />
        </label>
        <label className="mt-6 block text-sm">
          New password
          <input
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`mt-1.5 ${adminControl.input}`}
          />
        </label>
        <p className="mt-2 text-xs text-mute">At least 10 characters. Do not reuse a weak studio default.</p>
        <label className="mt-6 block text-sm">
          Confirm new password
          <input
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={`mt-1.5 ${adminControl.input}`}
          />
        </label>
        {error ? <p role="alert" className="mt-4 text-sm">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-mute">{message}</p> : null}
        <AdminTip label={busy ? "Updating…" : "Update password"}>
          <button type="submit" disabled={busy} className={`mt-8 ${adminBtn.primary}`}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </AdminTip>
      </form>
    </div>
  );
}
