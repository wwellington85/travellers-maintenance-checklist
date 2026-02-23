"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "./LoginForm";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirectTo = sp.get("redirect") || "/management/dashboard";

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash || hash.length < 2) return;

    const parsed = new URLSearchParams(hash.slice(1));
    const type = parsed.get("type");
    const hasTokens = !!parsed.get("access_token") && !!parsed.get("refresh_token");

    // Safety net: if Supabase fallback lands on login, move recovery/invite flows to set-password.
    if (hasTokens && (type === "recovery" || type === "invite")) {
      router.replace(`/auth/set-password${hash}`);
    }
  }, [router]);

  return <LoginForm redirectTo={redirectTo} />;
}
