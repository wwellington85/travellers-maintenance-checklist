"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function parseHashTokens() {
  const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  const sp = new URLSearchParams(raw);
  const access_token = sp.get("access_token");
  const refresh_token = sp.get("refresh_token");
  return { access_token, refresh_token };
}

export default function SetPasswordClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { access_token, refresh_token } = parseHashTokens();
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!active) return;
        if (error) {
          setMessage(error.message);
          setReady(false);
          return;
        }
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }

      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        setMessage("Invite link is invalid or expired. Ask a manager to send a new invite.");
        setReady(false);
        return;
      }
      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/management/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">New password</label>
        <input
          type="password"
          autoComplete="new-password"
          required
          disabled={!ready}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 outline-none focus:ring"
          placeholder="At least 8 characters"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Confirm password</label>
        <input
          type="password"
          autoComplete="new-password"
          required
          disabled={!ready}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 outline-none focus:ring"
          placeholder="Re-enter password"
        />
      </div>

      <button
        type="submit"
        disabled={!ready || isSaving}
        className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Set password"}
      </button>
    </form>
  );
}
