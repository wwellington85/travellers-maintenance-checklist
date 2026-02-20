import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import { withBasePath } from "@/lib/app-path";
import { MAINTENANCE_EDIT_WINDOW_MINUTES } from "@/lib/config";

function canEdit(submittedAt: string) {
  const submittedMs = new Date(submittedAt).getTime();
  if (Number.isNaN(submittedMs)) return false;
  return Date.now() - submittedMs <= MAINTENANCE_EDIT_WINDOW_MINUTES * 60 * 1000;
}

export default async function MaintenanceHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const sp = (searchParams ? await searchParams : {}) as Record<string, string | undefined>;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  const userId = userData.user.id;

  const { data: rows, error } = await supabase
    .from("maintenance_reports")
    .select("id, report_date, submitted_at, water_meter_reading, electric_meter_reading")
    .eq("submitted_by", userId)
    .order("report_date", { ascending: false })
    .limit(30);

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My Submission History</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Last 30 night reports.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a className="rounded-lg border px-3 py-2 text-sm" href={withBasePath("/new")}>
              New report
            </a>
            <SignOutButton />
          </div>
        </header>

        {sp?.save === "edited" ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Report updated successfully.
          </div>
        ) : null}
        {sp?.err === "edit_window_expired" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Edit window has expired for that report.
          </div>
        ) : null}

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
                    <th className="py-2 pr-4">Edit</th>
                    <th className="py-2 pr-0">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4">{r.report_date}</td>
                      <td className="py-2 pr-4">{new Date(r.submitted_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{r.water_meter_reading}</td>
                      <td className="py-2 pr-4">{r.electric_meter_reading}</td>
                      <td className="py-2 pr-4">
                        {canEdit(r.submitted_at) ? (
                          <a className="underline" href={withBasePath(`/history/${r.id}/edit`)}>
                            Edit
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Locked</span>
                        )}
                      </td>
                      <td className="py-2 pr-0 font-mono text-xs">{r.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reports submitted yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
