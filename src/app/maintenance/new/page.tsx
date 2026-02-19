import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import MaintenanceReportForm, { type GeneratorKey } from "./MaintenanceReportForm";

export default async function MaintenanceNewPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  const keysClient = service || supabase;
  const { data: keys, error } = await keysClient
    .from("generator_item_keys")
    .select("category,item_key,label,sort_order,is_active")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <main
        className="min-h-screen overflow-x-hidden py-6 sm:p-6"
        style={{
          paddingLeft: "max(1.25rem, calc(env(safe-area-inset-left) + 0.75rem))",
          paddingRight: "max(1.25rem, calc(env(safe-area-inset-right) + 0.75rem))",
        }}
      >
        <div className="mx-auto max-w-2xl max-w-full space-y-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-2xl font-semibold">Night Maintenance Report</h1>
            <div className="shrink-0 self-start">
              <SignOutButton />
            </div>
          </header>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-red-600">
              Could not load generator checklist keys: {error.message}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden py-6 sm:p-6"
      style={{
        paddingLeft: "max(1.25rem, calc(env(safe-area-inset-left) + 0.75rem))",
        paddingRight: "max(1.25rem, calc(env(safe-area-inset-right) + 0.75rem))",
      }}
    >
      <div className="mx-auto max-w-2xl max-w-full space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">Night Maintenance Report</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit the nightly readings and checks.
            </p>
          </div>
          <div className="shrink-0 self-start">
            <SignOutButton />
          </div>
        </header>

        <MaintenanceReportForm generatorKeys={(keys || []) as GeneratorKey[]} />
      </div>
    </main>
  );
}
