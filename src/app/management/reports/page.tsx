import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

function fmt(n: any) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString();
}

export default async function ManagementReportsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data: reports, error } = await supabase
    .from("maintenance_reports")
    .select("id, report_date, submitted_at, submitted_by, issues_summary")
    .order("report_date", { ascending: false })
    .limit(120);

  const dates = (reports || []).map((r: any) => r.report_date);

  const { data: deltas } = await supabase
    .from("v_report_deltas")
    .select("report_date, water_delta, electric_delta")
    .in("report_date", dates);

  const { data: exceptions } = await supabase
    .from("v_report_exceptions")
    .select("report_date, exception_reasons")
    .in("report_date", dates);

  const deltasByDate = new Map<string, any>();
  (deltas || []).forEach((d: any) => deltasByDate.set(d.report_date, d));

  const exByDate = new Map<string, any>();
  (exceptions || []).forEach((e: any) => exByDate.set(e.report_date, e));

  const submitterIds = [...new Set((reports || []).map((r: any) => r.submitted_by).filter(Boolean))];
  const { data: submitters } = submitterIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", submitterIds)
    : { data: [] as any[] };
  const submitterById = new Map<string, string>();
  (submitters || []).forEach((p: any) => submitterById.set(p.id, p.full_name || p.id));

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">All Reports</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Deltas + flags shown here so you only click what matters.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-lg border px-3 py-2 text-sm" href="/management/exceptions">
              Exceptions
            </Link>
            <form action="/management/reports/export" method="post">
              <button className="rounded-lg border px-3 py-2 text-sm">Export CSV</button>
            </form>
            <SignOutButton />
          </div>
        </header>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          {error ? (
            <p className="text-sm text-red-600">Error: {error.message}</p>
          ) : reports && reports.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Submitted</th>
                    <th className="py-2 pr-4">Submitted by</th>
                    <th className="py-2 pr-4">Water Δ</th>
                    <th className="py-2 pr-4">Electric Δ</th>
                    <th className="py-2 pr-4">Flags</th>
                    <th className="py-2 pr-0">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r: any) => {
                    const rid = r?.id;
                    const canView = typeof rid === "string" && rid.length > 0;
                    const d = deltasByDate.get(r.report_date);
                    const ex = exByDate.get(r.report_date);
                    const reasons: string[] = ex?.exception_reasons || [];
                    const flagCount = reasons.length;

                    return (
                      <tr key={rid || `${r.report_date}-${r.submitted_at}`} className="border-t align-top">
                        <td className="py-2 pr-4">{r.report_date}</td>
                        <td className="py-2 pr-4">{new Date(r.submitted_at).toLocaleString()}</td>
                        <td className="py-2 pr-4">
                          {submitterById.get(r.submitted_by) || (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">{fmt(d?.water_delta)}</td>
                        <td className="py-2 pr-4">{fmt(d?.electric_delta)}</td>
                        <td className="py-2 pr-4">
                          {flagCount ? (
                            <span className="rounded-full border px-2 py-1 text-xs">
                              {flagCount} flag{flagCount === 1 ? "" : "s"}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-0">
                          {canView ? (
                            <Link className="underline" href={`/management/reports/${rid}`}>
                              View
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">No ID</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reports found.</p>
          )}
        </section>
      </div>
    </main>
  );
}
