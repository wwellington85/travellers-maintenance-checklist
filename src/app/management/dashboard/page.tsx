import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

function fmt(n: any) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString();
}

export default async function ManagementDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login");

  // Pull last 30 deltas for simple trend + latest for KPIs
  const { data: deltas, error: deltasErr } = await supabase
    .from("v_report_deltas")
    .select("report_date, water_delta, electric_delta")
    .order("report_date", { ascending: false })
    .limit(30);

  // Pull last 30 exceptions for KPI + list link
  const { data: exceptions, error: exErr } = await supabase
    .from("v_report_exceptions")
    .select("report_date, generator_not_completed, water_spike, electric_spike, water_tanks_almost_empty, softwater_hard, pump_psi_out_of_range")
    .order("report_date", { ascending: false })
    .limit(30);

  const latest = deltas?.[0];
  const exceptionCount =
    exceptions?.filter((e) =>
      e.generator_not_completed ||
      e.water_spike ||
      e.electric_spike ||
      e.water_tanks_almost_empty ||
      e.softwater_hard ||
      e.pump_psi_out_of_range
    ).length ?? 0;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Maintenance Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Last readings, deltas, and exceptions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a className="rounded-lg border px-3 py-2 text-sm" href="/management/reports">
              Reports
            </a>
            <a className="rounded-lg border px-3 py-2 text-sm" href="/management/exceptions">
              Exceptions
            </a>
            <SignOutButton />
          </div>
        </header>

        {(deltasErr || exErr) ? (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-red-600">
              {deltasErr?.message || exErr?.message}
            </p>
          </section>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Latest water delta</div>
            <div className="mt-2 text-3xl font-semibold">{fmt(latest?.water_delta)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{latest?.report_date ?? ""}</div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Latest electric delta</div>
            <div className="mt-2 text-3xl font-semibold">{fmt(latest?.electric_delta)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{latest?.report_date ?? ""}</div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Exceptions (last 30)</div>
            <div className="mt-2 text-3xl font-semibold">{fmt(exceptionCount)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Needs review</div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Recent deltas (last 30)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Simple list view. We can add charts next.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Water delta</th>
                  <th className="py-2 pr-4">Electric delta</th>
                </tr>
              </thead>
              <tbody>
                {(deltas || []).map((r) => (
                  <tr key={r.report_date} className="border-t">
                    <td className="py-2 pr-4">{r.report_date}</td>
                    <td className="py-2 pr-4">{fmt(r.water_delta)}</td>
                    <td className="py-2 pr-4">{fmt(r.electric_delta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
