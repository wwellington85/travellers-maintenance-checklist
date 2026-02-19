import { Suspense } from "react";
import SetPasswordClient from "./SetPasswordClient";

export default function SetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Set Your Password</h1>
          <p className="text-sm text-muted-foreground">Complete your invitation by creating a password.</p>
        </div>
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
          <SetPasswordClient />
        </Suspense>
      </div>
    </main>
  );
}
