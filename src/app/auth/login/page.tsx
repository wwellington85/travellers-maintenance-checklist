import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <LoginClient />
      </Suspense>
    </main>
  );
}
