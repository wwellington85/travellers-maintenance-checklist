"use client";

import { useSearchParams } from "next/navigation";
import LoginForm from "./LoginForm";

export default function LoginClient() {
  const sp = useSearchParams();
  const redirectTo = sp.get("redirect") || "/management/dashboard";
  return <LoginForm redirectTo={redirectTo} />;
}
