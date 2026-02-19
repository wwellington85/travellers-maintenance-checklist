import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Travellers Maintenance Portal</h1>
          <p className="text-sm text-muted-foreground">Sign in to submit or review nightly maintenance reports.</p>
        </div>
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
          <LoginClient />
        </Suspense>
      </div>
    </main>
  );
}
