"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { withBasePath } from "@/lib/app-path";

export default function SignOutButton() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);

    try {
      await supabase.auth.signOut();
    } catch {}

    try {
      await fetch(withBasePath("/auth/logout"), { method: "POST", credentials: "include" });
    } catch {}

    window.location.assign(withBasePath("/auth/login"));
  }

  return (
    <form onSubmit={onSubmit}>
      <button className="rounded-lg border px-3 py-2 text-sm disabled:opacity-60" disabled={pending}>
        {pending ? "Signing out..." : "Sign out"}
      </button>
    </form>
  );
}
