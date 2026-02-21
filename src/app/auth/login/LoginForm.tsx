"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirect =
    searchParams.get("redirect") || redirectTo || "/management/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function usernameToEmail(v: string) {
    const slug =
      v
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "") || "staff";
    return `${slug}@travellers.local`;
  }

  function normalizeRedirectPath(input: string) {
    const value = (input || "").trim();
    if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
    return value;
  }

  function resolvePostLoginPath(
    requestedPath: string,
    role: string | null | undefined
  ) {
    const requested = normalizeRedirectPath(requestedPath);
    const isManager = role === "manager" || role === "admin";

    if (isManager) {
      if (
        requested.startsWith("/management") ||
        requested.startsWith("/admin")
      ) {
        return requested;
      }
      return "/management/dashboard";
    }

    if (requested.startsWith("/management") || requested.startsWith("/admin")) {
      return "/new";
    }

    return requested || "/new";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const raw = identifier.trim();
    const email = raw.includes("@") ? raw.toLowerCase() : usernameToEmail(raw);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let role: string | null = null;
    if (user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = (profile?.role as string | undefined) || null;
    }

    const destination = resolvePostLoginPath(redirect, role);
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Username or email</label>
        <input
          type="text"
          inputMode="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 outline-none focus:ring"
          placeholder="vincent.gray or name@tbresorts.com"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 outline-none focus:ring"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-xs text-muted-foreground">
        Accounts should be created by an admin. If you need access, contact
        management.
      </p>
    </form>
  );
}
