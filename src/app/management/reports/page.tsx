import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function ManagementReportsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const { data: rows, error } = await supabase
    .from("maintenance_reports")
    .select("id, report_date, submitted_at, water_meter_reading, electric_meter_reading, issues_summary")
    .order("report_date", { ascending: false })
    .limit(200);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">All Reports</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Click a report to view the full submission.
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
          ) : rows && rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-600">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Submitted</th>
                    <th className="py-2 pr-4">Water</th>
                    <th className="py-2 pr-4">Electric</th>
                    <th className="py-2 pr-4">Issues</th>
                    <th className="py-2 pr-0">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="py-2 pr-4">{r.report_date}</td>
                      <td className="py-2 pr-4">{new Date(r.submitted_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{r.water_meter_reading}</td>
                      <td className="py-2 pr-4">{r.electric_meter_reading}</td>
                      <td className="py-2 pr-4">
                        <div className="max-w-[420px] truncate text-muted-foreground">
                          {r.issues_summary || "—"}
                        </div>
                      </td>
                      <td className="py-2 pr-0">
                        <Link className="underline" href={`/management/reports/${r.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
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
