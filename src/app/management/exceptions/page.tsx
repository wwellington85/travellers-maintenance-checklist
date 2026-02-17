import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function ManagementExceptionsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data: rows, error } = await supabase
    .from("v_report_exceptions")
    .select("report_id, report_date, submitted_at, exception_reasons, generator_not_completed_count")
    .order("report_date", { ascending: false })
    .limit(60);

  // Filter to only those with reasons
  const flagged = (rows || []).filter((r) => (r.exception_reasons || []).length > 0);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Exceptions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reports with flags that need review.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a className="rounded-lg border px-3 py-2 text-sm" href="/management/dashboard">
              Dashboard
            </a>
            <a className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
              Reports
            </a>
            <SignOutButton />
          </div>
        </header>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          {error ? (
            <p className="text-sm text-red-600">Error: {error.message}</p>
          ) : flagged.length ? (
            <div className="space-y-4">
              {flagged.map((r) => (
                <div key={r.report_id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium">{r.report_date}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.report_id}</div>
                  </div>

                  <ul className="mt-3 list-disc pl-5 text-sm">
                    {(r.exception_reasons || []).map((reason: string, idx: number) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>

                  {r.generator_not_completed_count ? (
                    <div className="mt-3 text-sm text-muted-foreground">
                      Generator NOT COMPLETED items: {r.generator_not_completed_count}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No exceptions found in the last 60 reports.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
