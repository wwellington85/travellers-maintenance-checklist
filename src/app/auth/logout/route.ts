import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();

  const url = new URL("/auth/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  return NextResponse.redirect(url, { status: 303 });
}
