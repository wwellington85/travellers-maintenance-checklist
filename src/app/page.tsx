import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withBasePath } from "@/lib/app-path";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect(withBasePath("/auth/login"));
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.is_active) redirect(withBasePath("/auth/login"));
  if (["manager", "admin"].includes(profile.role)) {
    redirect(withBasePath("/management/dashboard"));
  }
  redirect(withBasePath("/maintenance/new"));
}
